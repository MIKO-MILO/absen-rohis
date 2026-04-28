"use client"

import { useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { AdminShell } from "../_components/AdminShell"
import * as XLSX from "xlsx"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  UserPlus,
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  FileText,
  X,
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────
type Mode = "pilih" | "manual" | "import"
type ImportStatus = "valid" | "error" | "duplikat"

interface ManualFormType {
  nama: string
  nis: string
  kelas: string
  jenisKelamin: string
}

interface ImportRow {
  no: number
  nama: string
  nis: string
  kelas: string
  jenisKelamin: string
  status: ImportStatus
  pesan?: string
}

const KELAS_OPTIONS = [
  "X RPL A",
  "X RPL B",
  "X RPL C",
  "XI IPA 1",
  "XI IPA 2",
  "XI IPS 1",
  "XI IPS 2",
  "XI RPL A",
  "XII IPA 1",
  "XII IPS 2",
  "XII RPL B",
]

const DUMMY_NIS_EXISTING = ["22001", "22002", "22003"]

// ─── Helpers ─────────────────────────────────────────────────────────────────
function parseCSV(text: string): string[][] {
  const lines = text.trim().split("\n")
  return lines.map((line) => line.split(",").map((v) => String(v || "").trim()))
}

function normalizeRow(row: string[], kelas: string) {
  const nama = row[1] || ""
  const lp = row[2] || ""

  // 🔥 gabung NIS dari beberapa kolom
  const nis = [row[3], row[5], row[7]]
    .filter(Boolean)
    .join("")
    .replace(/[^0-9]/g, "")

  return {
    nama,
    nis,
    kelas,
    jenisKelamin: mapGender(lp),
  }
}

const cleanNIS = (nis: string) => {
  if (!nis) return ""
  return String(nis).replace(/[^0-9]/g, "")
}

const mapGender = (val: string) => {
  if (val === undefined || val === null) return ""
  const v = String(val).trim().toUpperCase()

  if (v === "L" || v === "LAKI-LAKI") return "Laki-laki"
  if (v === "P" || v === "PEREMPUAN") return "Perempuan"

  return ""
}

function validateRow(
  row: { nama: string; nis: string; kelas: string; jenisKelamin: string },
  idx: number
): ImportRow {
  const base = { no: idx + 1, ...row }
  if (!row.nama) return { ...base, status: "error", pesan: "Nama kosong" }
  if (!row.nis) return { ...base, status: "error", pesan: "NIS kosong" }
  if (!row.kelas) return { ...base, status: "error", pesan: "Kelas kosong" }
  if (DUMMY_NIS_EXISTING.includes(row.nis))
    return {
      ...base,
      status: "duplikat",
      pesan: `NIS ${row.nis} sudah terdaftar`,
    }
  return { ...base, status: "valid" }
}

function downloadTemplate() {
  const csv = [
    "Nama,NIS,Kelas,Jenis_Kelamin",
    "Contoh Siswa,22100,X RPL A,Laki-laki",
    "Contoh Siswi,22101,XI IPA 1,Perempuan",
  ].join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "template-import-siswa.csv"
  a.click()
  URL.revokeObjectURL(url)
}

// ═══════════════════════════════════════════════════════════════════
// ── FIELD — HARUS di luar ManualForm agar tidak re-mount tiap render
// ═══════════════════════════════════════════════════════════════════
function Field({
  label,
  placeholder,
  type = "text",
  value,
  error,
  onChange,
}: {
  label: string
  placeholder: string
  type?: string
  value: string
  error?: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs font-semibold tracking-wider text-slate-600 uppercase">
        {label}
      </Label>
      <Input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`h-11 rounded-xl border bg-slate-50 px-4 text-sm focus-visible:ring-teal-400 ${
          error ? "border-red-300" : "border-slate-200"
        }`}
      />
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-500">
          <AlertCircle className="h-3 w-3" /> {error}
        </p>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// ── MODE SELECT
// ═══════════════════════════════════════════════════════════════════
function ModeSelect({ onSelect }: { onSelect: (m: Mode) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <button
          onClick={() => onSelect("manual")}
          className="group flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-6 text-left shadow-sm transition-all hover:border-teal-200 hover:shadow-md"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 transition-colors group-hover:bg-teal-100">
            <UserPlus className="h-6 w-6 text-teal-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">Input Manual</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              Tambah satu siswa dengan mengisi form nama, NIS, kelas, dan jenis
              kelamin.
            </p>
          </div>
          <div className="mt-auto flex items-center gap-1 text-xs font-semibold text-teal-600">
            Pilih <ChevronRight className="h-3.5 w-3.5" />
          </div>
        </button>

        <button
          onClick={() => onSelect("import")}
          className="group flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-6 text-left shadow-sm transition-all hover:border-blue-200 hover:shadow-md"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 transition-colors group-hover:bg-blue-100">
            <FileSpreadsheet className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">
              Import Excel / CSV
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              Upload file spreadsheet untuk menambah banyak siswa sekaligus
              secara efisien.
            </p>
          </div>
          <div className="mt-auto flex items-center gap-1 text-xs font-semibold text-blue-600">
            Pilih <ChevronRight className="h-3.5 w-3.5" />
          </div>
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// ── MANUAL FORM
// ═══════════════════════════════════════════════════════════════════
function ManualForm({
  onBack,
  onSuccess,
}: {
  onBack: () => void
  onSuccess: () => void
}) {
  const [form, setForm] = useState<ManualFormType>({
    nama: "",
    nis: "",
    kelas: "",
    jenisKelamin: "",
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Partial<ManualFormType>>({})

  const validate = () => {
    const e: Partial<ManualFormType> = {}
    if (!form.nama.trim()) e.nama = "Nama wajib diisi"
    if (!form.nis.trim()) e.nis = "NIS wajib diisi"
    else if (DUMMY_NIS_EXISTING.includes(form.nis))
      e.nis = "NIS sudah terdaftar"
    if (!form.kelas) e.kelas = "Kelas wajib dipilih"
    if (!form.jenisKelamin) e.jenisKelamin = "Jenis kelamin wajib dipilih"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return

    setLoading(true)
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nama: form.nama,
          nis: Number(form.nis), // ⚠️ penting: harus number
          kelas: form.kelas,
          jenis_kelamin: form.jenisKelamin, // ⚠️ sesuaikan nama DB
          email: `${form.nis}@school.id`, // sementara auto
          password: "123456", // sementara (nanti bisa diubah)
        }),
      })

      const result = await res.json()

      if (!res.ok) {
        console.error(result)
        alert(result.error || "Gagal menyimpan")
        return
      }

      // sukses
      onSuccess()
    } catch (err) {
      console.error(err)
      alert("Terjadi kesalahan")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <button
        onClick={onBack}
        className="flex w-fit items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali
      </button>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="h-1" />
        <div className="flex flex-col gap-5 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50">
              <UserPlus className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Input Manual</h2>
              <p className="text-xs text-slate-400">
                Isi lengkap data siswa baru
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 text-black sm:grid-cols-2">
            {/* ✅ Field dipanggil sebagai komponen biasa, bukan didefinisikan di dalam sini */}
            <Field
              label="Nama Lengkap"
              placeholder="cth. Aretha Safira P."
              value={form.nama}
              error={errors.nama}
              onChange={(v) => {
                setForm((p) => ({ ...p, nama: v }))
                setErrors((p) => ({ ...p, nama: undefined }))
              }}
            />
            <Field
              label="NIS"
              placeholder="cth. 22013"
              value={form.nis}
              error={errors.nis}
              onChange={(v) => {
                setForm((p) => ({ ...p, nis: v }))
                setErrors((p) => ({ ...p, nis: undefined }))
              }}
            />

            {/* Kelas */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold tracking-wider text-slate-600 uppercase">
                Kelas
              </Label>
              <select
                value={form.kelas}
                onChange={(e) => {
                  setForm((p) => ({ ...p, kelas: e.target.value }))
                  setErrors((p) => ({ ...p, kelas: undefined }))
                }}
                className={`h-11 rounded-xl border bg-slate-50 px-4 text-sm text-slate-700 focus:ring-2 focus:ring-teal-400 focus:outline-none ${
                  errors.kelas ? "border-red-300" : "border-slate-200"
                }`}
              >
                <option value="" disabled>
                  Pilih kelas...
                </option>
                {KELAS_OPTIONS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
              {errors.kelas && (
                <p className="flex items-center gap-1 text-xs text-red-500">
                  <AlertCircle className="h-3 w-3" /> {errors.kelas}
                </p>
              )}
            </div>

            {/* Jenis Kelamin */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold tracking-wider text-slate-600 uppercase">
                Jenis Kelamin
              </Label>
              <div className="flex gap-3">
                {["Laki-laki", "Perempuan"].map((jk) => (
                  <button
                    type="button"
                    key={jk}
                    onClick={() => {
                      setForm((p) => ({ ...p, jenisKelamin: jk }))
                      setErrors((p) => ({ ...p, jenisKelamin: undefined }))
                    }}
                    className={`h-11 flex-1 rounded-xl border text-sm font-medium transition-all ${
                      form.jenisKelamin === jk
                        ? "border-teal-400 bg-teal-50 font-semibold text-teal-700"
                        : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300"
                    }`}
                  >
                    {jk === "Laki-laki" ? "Laki-laki" : "Perempuan"}
                  </button>
                ))}
              </div>
              {errors.jenisKelamin && (
                <p className="flex items-center gap-1 text-xs text-red-500">
                  <AlertCircle className="h-3 w-3" /> {errors.jenisKelamin}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              onClick={onBack}
              className="h-11 flex-1 rounded-xl border border-slate-300 bg-transparent text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="h-11 flex-1 rounded-xl bg-linear-to-r from-teal-500 to-cyan-500 text-sm font-semibold text-white shadow-md shadow-teal-100 hover:from-teal-400 hover:to-cyan-400"
            >
              {loading ? "Menyimpan..." : "Simpan Siswa"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// ── IMPORT FORM
// ═══════════════════════════════════════════════════════════════════
function ImportForm({
  onBack,
  onSuccess,
}: {
  onBack: () => void
  onSuccess: (count: number) => void
}) {
  const [kelas, setKelas] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState("")
  const [rows, setRows] = useState<ImportRow[]>([])
  const [loading, setLoading] = useState(false)
  const [parsed, setParsed] = useState(false)
  const [kelasError, setKelasError] = useState(false)

  const processFile = useCallback(
    (file: File) => {
      setFileName(file.name)
      setParsed(false)
      setRows([])
      const ext = file.name.split(".").pop()?.toLowerCase()

      if (ext === "csv") {
        const reader = new FileReader()
        reader.onload = (e) => {
          const text = e.target?.result as string
          const rawRows = parseCSV(text)
          if (!kelas) {
            alert("Pilih kelas dulu!")
            return
          }
          const filtered = rawRows.slice(1).filter((r) => r.length >= 2 && r[0])

          const newRows = filtered.map((r, i) => {
            // Jika r[0] adalah Nama (format simple CSV), kita sesuaikan ke format yang diharapkan normalizeRow
            // normalizeRow mengharap: [?, nama, gender, nis, ...]
            // Tapi karena normalizeRow sudah spesifik untuk Excel, kita buat mapping manual di sini untuk CSV
            return validateRow(
              {
                nama: r[0] || "",
                nis: cleanNIS(r[1] || ""),
                kelas: kelas,
                jenisKelamin: r[3] || "", // Kolom ke-4 di template CSV
              },
              i
            )
          })

          setRows(newRows)
          setParsed(true)
        }
        reader.readAsText(file)
      } else if (ext === "xlsx" || ext === "xls") {
        // Production: uncomment dan install xlsx

        const reader = new FileReader()
        reader.onload = (e) => {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const wb = XLSX.read(data, { type: "array" })
          const ws = wb.Sheets[wb.SheetNames[0]]
          const rawRows = XLSX.utils.sheet_to_json(ws, {
            defval: "",
            range: 14, // 🔥 data mulai dari baris 14

            header: 1, // 🔥 pakai array, bukan object
          }) as string[][]

          const MAX_ROWS = 36

          const filtered = rawRows.filter((r) => r[1]).slice(0, MAX_ROWS)

          const newRows = filtered.map((r, i) =>
            validateRow(normalizeRow(r, kelas), i)
          )
          setRows(newRows)
          setParsed(true)
        }
        reader.readAsArrayBuffer(file)

        setParsed(true)
      } else {
        alert("Format file tidak didukung. Gunakan .csv, .xlsx, atau .xls")
      }
    },
    [kelas]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) processFile(file)
    },
    [processFile]
  )

  const handleImport = async () => {
    const validRows = rows.filter((r) => r.status === "valid")
    if (!validRows.length) return

    setLoading(true)

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          users: validRows.map((r) => ({
            nama: r.nama,
            nis: Number(r.nis),
            kelas: r.kelas,
            jenis_kelamin: r.jenisKelamin,
            email: `${r.nis}@school.id`,
            password: `${r.nis}`,
          })),
        }),
      })

      const result = await res.json()

      if (!res.ok) {
        console.error(result)
        alert(result.error || "Gagal import")
        return
      }

      onSuccess(validRows.length)
    } catch (err) {
      console.error(err)
      alert("Terjadi kesalahan saat import")
    } finally {
      setLoading(false)
    }
  }

  const validCount = rows.filter((r) => r.status === "valid").length
  const duplikatCount = rows.filter((r) => r.status === "duplikat").length
  const errorCount = rows.filter((r) => r.status === "error").length

  const STATUS_ICON: Record<ImportStatus, React.ReactNode> = {
    valid: <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-500" />,
    error: <XCircle className="h-4 w-4 shrink-0 text-red-400" />,
    duplikat: <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />,
  }

  const STATUS_ROW: Record<ImportStatus, string> = {
    valid: "",
    error: "bg-red-50/60",
    duplikat: "bg-amber-50/60",
  }

  return (
    <div className="flex flex-col gap-5">
      <button
        onClick={onBack}
        className="flex w-fit items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali
      </button>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="h-1" />
        <div className="flex flex-col gap-5 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                <FileSpreadsheet className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-800">
                  Import Excel / CSV
                </h2>
                <p className="text-xs text-slate-400">
                  Upload file untuk import data massal
                </p>
              </div>
            </div>
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-100"
            >
              <Download className="h-3.5 w-3.5" /> Template
            </button>
          </div>

          <div className="flex flex-col gap-1.5 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold text-slate-600">
              Format yang diterima
            </p>
            <div className="flex flex-wrap gap-2">
              {[".xlsx", ".xls", ".csv"].map((f) => (
                <span
                  key={f}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600"
                >
                  {f}
                </span>
              ))}
            </div>
            <p className="mt-0.5 text-[10px] text-slate-400">
              Kolom wajib:{" "}
              <span className="font-semibold text-slate-500">
                Nama, NIS, Kelas, Jenis_Kelamin
              </span>
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold text-slate-600 uppercase">
              Kelas
            </Label>
            <select
              value={kelas}
              onChange={(e) => {
                setKelas(e.target.value)
                setKelasError(false) // 🔥 reset error
              }}
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-black"
            >
              <option value="">Pilih kelas...</option>
              {KELAS_OPTIONS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>

          {!parsed ? (
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => {
                if (!kelas) {
                  setKelasError(true)
                  return
                }
                setKelasError(false)
                inputRef.current?.click()
              }}
              className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 transition-all ${
                kelasError
                  ? "border-red-400 bg-red-50"
                  : dragging
                    ? "border-blue-400 bg-blue-50"
                    : "border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/40"
              }`}
            >
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-colors ${dragging ? "bg-blue-100" : "border border-slate-200 bg-white"}`}
              >
                <Upload
                  className={`h-7 w-7 ${dragging ? "text-blue-500" : "text-slate-400"}`}
                />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-700">
                  {dragging ? "Lepas file di sini" : "Drag & drop file di sini"}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  atau klik untuk memilih file
                </p>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  if (!kelas) {
                    setKelasError(true)
                    return
                  }
                  setKelasError(false)
                  const f = e.target.files?.[0]
                  if (f) processFile(f)
                }}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
                <FileText className="h-4 w-4 shrink-0 text-blue-500" />
                <p className="flex-1 truncate text-xs font-semibold text-blue-700">
                  {fileName}
                </p>
                <button
                  onClick={() => {
                    setRows([])
                    setParsed(false)
                    setFileName("")
                  }}
                  className="text-blue-400 hover:text-blue-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    label: "Valid",
                    count: validCount,
                    color: "text-teal-600",
                    bg: "bg-teal-50 border-teal-100",
                  },
                  {
                    label: "Duplikat",
                    count: duplikatCount,
                    color: "text-amber-600",
                    bg: "bg-amber-50 border-amber-100",
                  },
                  {
                    label: "Error",
                    count: errorCount,
                    color: "text-red-500",
                    bg: "bg-red-50 border-red-100",
                  },
                ].map(({ label, count, color, bg }) => (
                  <div
                    key={label}
                    className={`flex flex-col items-center rounded-xl border py-3 ${bg}`}
                  >
                    <span
                      className={`text-xl leading-none font-black ${color}`}
                    >
                      {count}
                    </span>
                    <span className="mt-0.5 text-[10px] text-slate-500">
                      {label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-100">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        {["No", "Nama", "NIS", "Kelas", "Status"].map((h) => (
                          <th
                            key={h}
                            className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr
                          key={r.no}
                          className={`border-b border-slate-50 last:border-0 ${STATUS_ROW[r.status]}`}
                        >
                          <td className="px-4 py-2.5 text-xs text-slate-400">
                            {r.no}
                          </td>
                          <td className="px-4 py-2.5 text-xs font-medium text-slate-700">
                            {r.nama || (
                              <span className="text-slate-300 italic">
                                kosong
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-slate-600">
                            {r.nis || "—"}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-slate-600">
                            {r.kelas || "—"}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1.5">
                              {STATUS_ICON[r.status]}
                              {r.pesan ? (
                                <span className="text-[10px] text-slate-500">
                                  {r.pesan}
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold text-teal-600">
                                  Siap import
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {(duplikatCount > 0 || errorCount > 0) && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <p className="text-xs text-amber-700">
                    Hanya <strong>{validCount} data valid</strong> yang akan
                    diimport. Data duplikat dan error akan dilewati.
                  </p>
                </div>
              )}
            </div>
          )}

          {parsed && (
            <div className="flex gap-3">
              <Button
                onClick={onBack}
                className="h-11 flex-1 rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                Batal
              </Button>
              <Button
                onClick={handleImport}
                disabled={loading || validCount === 0}
                className="h-11 flex-1 rounded-xl bg-linear-to-r from-blue-500 to-cyan-500 text-sm font-bold text-white shadow-md shadow-blue-100 hover:from-blue-400 hover:to-cyan-400 disabled:opacity-40"
              >
                {loading ? "Mengimport..." : `Import ${validCount} Siswa`}
              </Button>
            </div>
          )}

          <div className="flex items-center justify-center">
            {kelasError && (
              <div className="flex items-center justify-center">
                <p className="animate-pulse text-xs text-red-500">
                  * Pilih kelas terlebih dahulu sebelum upload file
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// ── SUCCESS
// ═══════════════════════════════════════════════════════════════════
function SuccessScreen({
  count,
  onBack,
}: {
  count: number
  onBack: () => void
}) {
  const router = useRouter()
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16 text-center">
      <div
        className="flex h-24 w-24 items-center justify-center rounded-full"
        style={{
          background: "rgba(52,211,153,0.12)",
          border: "2px solid rgba(52,211,153,0.3)",
        }}
      >
        <CheckCircle2 className="h-14 w-14 text-emerald-400" />
      </div>
      <div>
        <h2 className="text-xl font-black text-slate-800">Berhasil!</h2>
        <p className="mt-1 text-sm text-slate-500">
          {count > 1 ? `${count} siswa` : "1 siswa"} berhasil ditambahkan ke
          sistem
        </p>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-2.5">
        <Button
          onClick={() => router.push("/admin/siswa")}
          className="h-11 w-full rounded-xl bg-linear-to-r from-teal-500 to-cyan-500 text-sm font-bold text-white"
        >
          Lihat Data Siswa
        </Button>
        <Button
          onClick={onBack}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          Tambah Siswa Lagi
        </Button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// ── PAGE
// ═══════════════════════════════════════════════════════════════════
export default function TambahSiswaPage() {
  const [mode, setMode] = useState<Mode>("pilih")
  const [success, setSuccess] = useState<{ show: boolean; count: number }>({
    show: false,
    count: 0,
  })

  const handleReset = () => {
    setMode("pilih")
    setSuccess({ show: false, count: 0 })
  }

  return (
    <AdminShell>
      <div className="mx-auto max-w-3xl px-4 py-5 md:px-6">
        <div className="mb-5">
          <h1 className="text-base font-bold text-slate-800">Tambah Siswa</h1>
          <p className="mt-0.5 text-xs text-slate-400">
            Input manual atau import dari file spreadsheet
          </p>
        </div>

        {success.show ? (
          <SuccessScreen count={success.count} onBack={handleReset} />
        ) : mode === "pilih" ? (
          <ModeSelect onSelect={setMode} />
        ) : mode === "manual" ? (
          <ManualForm
            onBack={() => setMode("pilih")}
            onSuccess={() => setSuccess({ show: true, count: 1 })}
          />
        ) : (
          <ImportForm
            onBack={() => setMode("pilih")}
            onSuccess={(count) => setSuccess({ show: true, count })}
          />
        )}
      </div>
    </AdminShell>
  )
}
