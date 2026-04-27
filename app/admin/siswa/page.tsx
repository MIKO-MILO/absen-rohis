"use client"

import { useState, useMemo, useEffect } from "react"
import { AdminShell } from "../_components/AdminShell"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Users,
  Search,
  MoreHorizontal,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  Plus,
  Pencil,
} from "lucide-react"
import { useRouter } from "next/navigation"

// ─── Types ────────────────────────────────────────────────────────────────────
type AbsenStatus = "hadir" | "Haid" | "tidak_hadir"

// Sesuai Table users
interface UserRecord {
  id: number
  nama: string
  kelas: string
  jenis_kelamin: string
  nis: number
  email: string
  password: string
  created_at: string
  avatar: string
}

// ─── Config ───────────────────────────────────────────────────────────────────
const STATUS_META: Record<
  AbsenStatus,
  { label: string; dot: string; badge: string }
> = {
  hadir: {
    label: "Hadir",
    dot: "bg-teal-400",
    badge: "bg-teal-50 text-teal-700 border-teal-200",
  },
  Haid: {
    label: "Haid",
    dot: "bg-amber-400",
    badge: "bg-amber-50 text-amber-600 border-amber-200",
  },
  tidak_hadir: {
    label: "Tidak Hadir",
    dot: "bg-red-400",
    badge: "bg-red-50 text-red-500 border-red-200",
  },
}

const KELAS_LIST = [
  "X RPL A",
  "X RPL B",
  "X RPL C",
  "XI IPA 1",
  "XI IPA 2",
  "XI IPS 1",
  "XII RPL B",
  "XII IPS 2",
  "XI RPL A",
]

const TABS = ["Semua", "Hadir", "Haid", "Tidak Hadir"] as const
type Tab = (typeof TABS)[number]

const TAB_TO_STATUS: Record<Tab, AbsenStatus | null> = {
  Semua: null,
  Hadir: "hadir",
  Haid: "Haid",
  "Tidak Hadir": "tidak_hadir",
}

const PER_PAGE = 11

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DataAbsenPage() {
  const [data, setData] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/users")
        const result = await res.json()
        console.log("URL:", process.env.NEXT_PUBLIC_SUPABASE_URL)
        console.log("KEY:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
        console.log(result)

        const formatted = result.map((u: any) => ({
          id: u.id,
          nama: u.nama,
          kelas: u.kelas,
          jenis_kelamin: u.jenis_kelamin,
          nis: u.nis,
          email: u.email,
          password: u.password,
          created_at: u.created_at,

          // tambahan untuk UI
          avatar: Math.floor(Math.random() * 70).toString(),
        }))

        setData(formatted)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>("Semua")
  const [search, setSearch] = useState("")
  const [filterKelas, setFilterKelas] = useState("Semua Kelas")
  const [filterTanggal, setFilterTanggal] = useState("")
  const [page, setPage] = useState(1)
  const [showFilterPanel, setShowFilterPanel] = useState(false)

  const todayStr = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  const filtered = useMemo(
    () =>
      data.filter((s) => {
        const matchSearch =
          !search ||
          s.nama.toLowerCase().includes(search.toLowerCase()) ||
          String(s.nis).includes(search) ||
          s.kelas.toLowerCase().includes(search.toLowerCase()) ||
          s.email.toLowerCase().includes(search.toLowerCase())
        const matchKelas =
          filterKelas === "Semua Kelas" || s.kelas === filterKelas
        return matchSearch && matchKelas
      }),
    [data, search, filterKelas]
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const activeFilterCount = [
    filterKelas !== "Semua Kelas",
    filterTanggal !== "",
    search !== "",
  ].filter(Boolean).length

  const resetFilters = () => {
    setSearch("")
    setFilterKelas("Semua Kelas")
    setFilterTanggal("")
    setActiveTab("Semua")
    setPage(1)
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data siswa ini?")) return

    console.log("Menghapus siswa dengan ID:", id)
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "DELETE",
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || "Gagal hapus data")
      }

      // update state setelah berhasil delete
      setData((prev) => prev.filter((s) => s.id !== id))
      alert("Data siswa berhasil dihapus")
    } catch (err: any) {
      console.error(err)
      alert(err.message || "Terjadi kesalahan saat menghapus data")
    }
  }

  const handleEdit = (id: number) => router.push(`/admin/editsiswa?id=${id}`)

  if (loading) {
    return <div className="p-5">Loading data...</div>
  }

  return (
    <AdminShell>
      <div className="flex flex-col gap-5 px-4 py-5 md:px-6">
        {/* Banner */}
        <div
          className="relative flex items-center justify-between overflow-hidden rounded-2xl p-5"
          style={{
            background: "linear-gradient(135deg,#0d9488 0%,#0891b2 100%)",
          }}
        >
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: -30,
              right: -30,
              width: 140,
              height: 140,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.07)",
            }}
          />
          <div
            aria-hidden
            style={{
              position: "absolute",
              bottom: -20,
              left: "40%",
              width: 90,
              height: 90,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.05)",
            }}
          />
          <div className="relative z-10">
            <p className="text-xs text-teal-100">Rekap Kehadiran</p>
            <h2 className="mt-0.5 text-xl font-black text-white">
              Sholat Dzuhur — Hari Ini
            </h2>
            <p className="mt-1 text-xs text-teal-200">{todayStr}</p>
          </div>
        </div>

        {/* Table card */}
        <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 border-b border-slate-50 px-5 pt-4 pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-800">
                  Rekap Absensi Dzuhur
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  {filtered.length} dari {data.length} siswa
                  {activeFilterCount > 0 && (
                    <button
                      onClick={resetFilters}
                      className="ml-2 inline-flex items-center gap-0.5 font-semibold text-teal-600 hover:underline"
                    >
                      <X className="h-3 w-3" /> Reset filter
                    </button>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Cari nama, NIS, email..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value)
                      setPage(1)
                    }}
                    className="h-9 w-52 rounded-xl border-slate-200 bg-slate-50 pl-8 text-xs focus-visible:ring-teal-400"
                  />
                </div>
                <button
                  onClick={() => setShowFilterPanel((v) => !v)}
                  className="relative flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-all"
                  style={{
                    background:
                      showFilterPanel || activeFilterCount > 0
                        ? "rgba(13,148,136,0.07)"
                        : "#fff",
                    borderColor:
                      showFilterPanel || activeFilterCount > 0
                        ? "#0d9488"
                        : "#e2e8f0",
                    color:
                      showFilterPanel || activeFilterCount > 0
                        ? "#0d9488"
                        : "#64748b",
                  }}
                >
                  <Filter className="h-3.5 w-3.5" />
                  Filter
                  {activeFilterCount > 0 && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-teal-500 text-[9px] text-white">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => router.push("/admin/tambahsiswa")}
                  className="flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-50"
                >
                  <Plus className="h-3.5 w-3.5" /> Tambah Siswa
                </button>
              </div>
            </div>

            {showFilterPanel && (
              <div className="flex flex-wrap gap-3 border-t border-slate-50 pt-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                    Kelas
                  </label>
                  <select
                    value={filterKelas}
                    onChange={(e) => {
                      setFilterKelas(e.target.value)
                      setPage(1)
                    }}
                    className="h-8 cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs text-slate-700 outline-none focus:border-teal-400"
                  >
                    <option>Semua Kelas</option>
                    {KELAS_LIST.map((k) => (
                      <option key={k}>{k}</option>
                    ))}
                  </select>
                  ""
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    value={filterTanggal}
                    onChange={(e) => {
                      setFilterTanggal(e.target.value)
                      setPage(1)
                    }}
                    className="h-8 cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs text-slate-700 outline-none focus:border-teal-400"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                    Cepat
                  </label>
                  <div className="flex gap-1.5">
                    {[
                      {
                        label: "Hari ini",
                        val: new Date().toISOString().split("T")[0],
                      },
                      { label: "Semua", val: "" },
                    ].map(({ label, val }) => (
                      <button
                        key={label}
                        onClick={() => {
                          setFilterTanggal(val)
                          setPage(1)
                        }}
                        className="h-8 rounded-lg border px-3 text-xs font-semibold transition-all"
                        style={{
                          background:
                            filterTanggal === val
                              ? "rgba(13,148,136,0.08)"
                              : "#fff",
                          borderColor:
                            filterTanggal === val ? "#0d9488" : "#e2e8f0",
                          color: filterTanggal === val ? "#0d9488" : "#64748b",
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {[
                    "No",
                    "Nama",
                    "NIS",
                    "Kelas",
                    "Jenis Kelamin",
                    "Email",
                    "Action",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-[11px] font-bold tracking-wider text-slate-400 uppercase first:pl-5 last:w-10"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="h-8 w-8 text-slate-200" />
                        <p className="text-sm text-slate-400">
                          Tidak ada data ditemukan
                        </p>
                        <button
                          onClick={resetFilters}
                          className="text-xs font-semibold text-teal-600 hover:underline"
                        >
                          Reset filter
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginated.map((s, i) => {
                    return (
                      <tr
                        key={s.id}
                        className="border-t border-slate-50 transition-colors hover:bg-slate-50/70"
                        style={{
                          background: i % 2 !== 0 ? "#fafcff" : undefined,
                        }}
                      >
                        {/* No */}
                        <td className="px-4 py-3">{i + 1}</td>
                        {/* Nama */}
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 flex-shrink-0">
                              <AvatarImage
                                src={`https://i.pravatar.cc/100?img=${s.avatar}`}
                              />
                              <AvatarFallback className="bg-teal-100 text-xs font-bold text-teal-700">
                                {s.nama.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <p className="text-sm leading-tight font-semibold text-slate-800">
                              {s.nama}
                            </p>
                          </div>
                        </td>

                        {/* NIS */}
                        <td className="px-4 py-3">
                          <p className="font-mono text-xs font-semibold text-slate-600">
                            {s.nis}
                          </p>
                        </td>

                        {/* Kelas */}
                        <td className="px-4 py-3">
                          <span className="inline-block rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                            {s.kelas}
                          </span>
                        </td>

                        {/* Jenis Kelamin */}
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block rounded-lg px-2 py-0.5 text-xs font-semibold ${
                              s.jenis_kelamin === "Perempuan"
                                ? "bg-pink-50 text-pink-600"
                                : "bg-blue-50 text-blue-600"
                            }`}
                          >
                            {s.jenis_kelamin === "Perempuan"
                              ? "♀ Perempuan"
                              : "♂ Laki-laki"}
                          </span>
                        </td>

                        {/* Email */}
                        <td className="px-4 py-3">
                          <p className="max-w-[160px] truncate text-xs text-slate-500">
                            {s.email}
                          </p>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-36 rounded-2xl p-1"
                            >
                              <DropdownMenuItem
                                className="cursor-pointer rounded-xl text-xs"
                                onClick={() => handleEdit(s.id)}
                              >
                                <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(s.id)}
                                className="cursor-pointer rounded-xl text-xs text-red-500 focus:bg-red-50 focus:text-red-500"
                              >
                                <Trash2 className="mr-2 h-3.5 w-3.5" />
                                Hapus
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-slate-50 px-5 py-3">
            <p className="text-xs text-slate-400">
              Halaman{" "}
              <span className="font-semibold text-slate-600">{page}</span> dari{" "}
              <span className="font-semibold text-slate-600">{totalPages}</span>
              &nbsp;·&nbsp; {filtered.length} data
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(
                  (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1
                )
                .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                  if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1)
                    acc.push("...")
                  acc.push(p)
                  return acc
                }, [])
                .map((p, i) =>
                  p === "..." ? (
                    <span
                      key={`el-${i}`}
                      className="w-7 text-center text-xs text-slate-400"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p as number)}
                      className="h-7 w-7 rounded-lg text-xs font-semibold transition-all"
                      style={{
                        background: page === p ? "#0d9488" : "transparent",
                        color: page === p ? "white" : "#64748b",
                      }}
                    >
                      {p}
                    </button>
                  )
                )}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  )
}
