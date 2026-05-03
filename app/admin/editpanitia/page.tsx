"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AdminShell } from "../_components/AdminShell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, ArrowLeft, UserCircle, CheckCircle2 } from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────
interface ManualFormType {
  nama: string
  nis: string
  kelas: string
  jenisKelamin: string
  email: string
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

// ═══════════════════════════════════════════════════════════════════
// ── FIELD Component
// ═══════════════════════════════════════════════════════════════════
function Field({
  label,
  placeholder,
  type = "text",
  value,
  error,
  onChange,
  disabled = false,
}: {
  label: string
  placeholder: string
  type?: string
  value: string
  error?: string
  onChange: (v: string) => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        {label}
      </Label>
      <Input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`h-11 rounded-xl border bg-muted/50 px-4 text-sm focus-visible:ring-primary ${
          error ? "border-destructive/50" : "border-border"
        } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
      />
      {error && (
        <p className="flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="h-3 w-3" /> {error}
        </p>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// ── MAIN PAGE
// ═══════════════════════════════════════════════════════════════════
export default function EditPanitiaPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = searchParams.get("id")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Partial<ManualFormType>>({})
  const [success, setSuccess] = useState(false)

  console.log("Edit page - id from URL:", id, "type:", typeof id)

  const validate = () => {
    const e: Partial<ManualFormType> = {}
    if (!form.nama.trim()) e.nama = "Nama wajib diisi"
    if (!form.nis.trim()) e.nis = "NIS wajib diisi"
    if (!form.kelas) e.kelas = "Kelas wajib dipilih"
    if (!form.jenisKelamin) e.jenisKelamin = "Jenis kelamin wajib dipilih"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: form.nama,
          nis: Number(form.nis),
          kelas: form.kelas,
          jenis_kelamin: form.jenisKelamin,
          email: form.email,
        }),
      })

      if (!res.ok) {
        const result = await res.json()
        alert(result.error || "Gagal mengupdate data")
        return
      }

      setSuccess(true)
    } catch (err) {
      console.error(err)
      alert("Terjadi kesalahan")
    } finally {
      setSubmitting(false)
    }
  }

  const [form, setForm] = useState<ManualFormType>({
    nama: "",
    nis: "",
    kelas: "",
    jenisKelamin: "",
    email: "",
  })

  useEffect(() => {
    if (!id) {
      router.push("/admin/siswa")
      return
    }

    const fetchSiswa = async () => {
      try {
        const res = await fetch(`/api/users/${id}`)
        const text = await res.text()
        console.log("Response status:", res.status)
        console.log("Response body:", text)

        if (!res.ok) throw new Error(`Gagal mengambil data: ${text}`)

        let data
        try {
          data = JSON.parse(text)
        } catch {
          throw new Error("Format response tidak valid")
        }

        setForm({
          nama: data.nama || "",
          nis: String(data.nis) || "",
          kelas: data.kelas || "",
          jenisKelamin: data.jenis_kelamin || "",
          email: data.email || "",
        })
      } catch (err) {
        console.error("Fetch error:", err)
        alert("Siswa tidak ditemukan")
        router.push("/admin/siswa")
      } finally {
        setLoading(false)
      }
    }

    fetchSiswa()
  }, [id, router])

  if (loading) {
    return (
      <AdminShell>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm font-medium text-muted-foreground">
              Memuat data panitia...
            </p>
          </div>
        </div>
      </AdminShell>
    )
  }

  if (success) {
    return (
      <AdminShell>
        <div className="flex h-[60vh] items-center justify-center px-4">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-8 text-center shadow-xl shadow-muted-foreground/10">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-xl font-black text-foreground">
              Update Berhasil!
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Data panitia <strong>{form.nama}</strong> telah berhasil
              diperbarui.
            </p>
            <Button
              onClick={() => router.push("/admin/panitia")}
              className="mt-8 h-12 w-full rounded-2xl bg-primary text-sm font-bold text-primary-foreground hover:opacity-90"
            >
              Kembali ke Data Panitia
            </Button>
          </div>
        </div>
      </AdminShell>
    )
  }

  return (
    <AdminShell>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali
          </button>
          <h1 className="text-lg font-bold text-foreground">
            Edit Data Panitia
          </h1>
        </div>

        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-xl shadow-muted-foreground/5">
          <div className="h-1.5 bg-linear-to-r from-primary to-primary/60" />

          <div className="p-6 md:p-8">
            <div className="mb-8 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <UserCircle className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Informasi Panitia
                </h2>
                <p className="text-xs text-muted-foreground">
                  Pastikan semua data sudah benar sebelum menyimpan.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Kelas
                </Label>
                <select
                  value={form.kelas}
                  onChange={(e) => {
                    setForm((p) => ({ ...p, kelas: e.target.value }))
                    setErrors((p) => ({ ...p, kelas: undefined }))
                  }}
                  className={`h-11 rounded-xl border bg-muted/50 px-4 text-sm text-foreground transition-all focus:ring-2 focus:ring-primary focus:outline-none ${
                    errors.kelas ? "border-destructive/50" : "border-border"
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
                  <p className="flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="h-3 w-3" /> {errors.kelas}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
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
                          ? "border-primary bg-primary/10 font-semibold text-primary"
                          : "border-border bg-muted/50 text-muted-foreground hover:border-muted-foreground/50"
                      }`}
                    >
                      {jk}
                    </button>
                  ))}
                </div>
                {errors.jenisKelamin && (
                  <p className="flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="h-3 w-3" /> {errors.jenisKelamin}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <Field
                  label="Email"
                  placeholder="email@sekolah.id"
                  value={form.email}
                  onChange={(v) => setForm((p) => ({ ...p, email: v }))}
                />
              </div>
            </div>

            <div className="mt-10 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="h-12 rounded-2xl px-8 text-sm font-bold text-muted-foreground transition-all hover:bg-muted"
              >
                Batal
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="h-12 rounded-2xl bg-primary px-10 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/10 transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
              >
                {submitting ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    Menyimpan...
                  </div>
                ) : (
                  "Simpan Perubahan"
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  )
}
