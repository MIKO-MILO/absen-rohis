"use client"

import { useState, useMemo, useEffect } from "react"
import { AdminShell } from "../_components/AdminShell"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Users,
  QrCode,
  Search,
  Clock,
  XCircle,
  UserCheck,
  MoreHorizontal,
  Trash2,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  X,
  CalendarDays,
  Filter,
} from "lucide-react"
import { useRouter } from "next/navigation"
import * as XLSX from "xlsx"

// ─── Types ────────────────────────────────────────────────────────────────────
type AbsenStatus = "hadir" | "haid" | "tidak_hadir"

interface SiswaRecord {
  id: number
  nama: string
  nis: string
  kelas: string
  waktu: string
  status: AbsenStatus
  tanggal: string
}

// ─── Config ───────────────────────────────────────────────────────────────────
const STATUS_META: Record<
  AbsenStatus,
  { label: string; dot: string; badge: string; color: string; bg: string }
> = {
  hadir: {
    label: "Hadir",
    dot: "bg-primary",
    badge: "bg-primary/10 text-primary border-primary/20",
    color: "var(--color-primary)",
    bg: "var(--color-primary)",
  },
  haid: {
    label: "Haid",
    dot: "bg-blue-400",
    badge: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    color: "#3b82f6",
    bg: "#3b82f6",
  },
  tidak_hadir: {
    label: "Tidak Hadir",
    dot: "bg-destructive",
    badge: "bg-destructive/10 text-destructive border-destructive/20",
    color: "var(--color-destructive)",
    bg: "var(--color-destructive)",
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
  Haid: "haid",
  "Tidak Hadir": "tidak_hadir",
}

// ─── Export to XLSX ───────────────────────────────────────────────────────────
function exportToExcel(data: SiswaRecord[], filename = "Absensi-Dzuhur") {
  const rows = data.map((s, i) => ({
    No: i + 1,
    NIS: s.nis,
    "Nama Siswa": s.nama,
    Kelas: s.kelas,
    Tanggal: s.tanggal,
    "Waktu Absen": s.waktu === "—" ? "" : `${s.waktu} WIB`,
    Status: STATUS_META[s.status].label,
  }))

  const ws = XLSX.utils.json_to_sheet(rows)

  // Column widths
  ws["!cols"] = [
    { wch: 5 },
    { wch: 10 },
    { wch: 24 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Absensi Dzuhur")
  XLSX.writeFile(
    wb,
    `${filename}-${new Date().toISOString().split("T")[0]}.xlsx`
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DataAbsenPage() {
  const [data, setData] = useState<SiswaRecord[]>([])
  const [, setLoading] = useState(true)

  useEffect(() => {
    const fetchAbsensi = async () => {
      try {
        const res = await fetch("/api/absensi")
        const result = await res.json()
        console.log("URL:", process.env.NEXT_PUBLIC_SUPABASE_URL)
        console.log("KEY:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
        console.log(result)

        const formatted = result.map((s: SiswaRecord) => {
          let rawStatus = (s.status || "").trim().toLowerCase()
          if (rawStatus === "tidak hadir") rawStatus = "tidak_hadir"

          return {
            id: s.id,
            nama: s.nama || "Tidak diketahui",
            nis: s.nis || "—",
            kelas: s.kelas || "—",
            tanggal: s.tanggal ?? "—",
            waktu: s.waktu ?? "—",
            status: (["hadir", "haid", "tidak_hadir"].includes(rawStatus)
              ? rawStatus
              : "tidak_hadir") as AbsenStatus,
          }
        })
        setData(formatted)
      } catch (err) {
        console.error("Error fetching absensi:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchAbsensi()
  }, [])

  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>("Semua")
  const [search, setSearch] = useState("")
  const [filterKelas, setFilterKelas] = useState("Semua Kelas")
  const [filterTanggal, setFilterTanggal] = useState("")
  const [page, setPage] = useState(1)
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const PER_PAGE = 8

  const todayStr = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  // ── Filter logic ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return data.filter((s) => {
      const matchTab =
        TAB_TO_STATUS[activeTab] === null ||
        s.status === TAB_TO_STATUS[activeTab]
      const matchSearch =
        !search ||
        s.nama.toLowerCase().includes(search.toLowerCase()) ||
        s.nis.includes(search) ||
        s.kelas.toLowerCase().includes(search.toLowerCase())
      const matchKelas =
        filterKelas === "Semua Kelas" || s.kelas === filterKelas
      const matchTgl = !filterTanggal || s.tanggal === filterTanggal
      return matchTab && matchSearch && matchKelas && matchTgl
    })
  }, [data, activeTab, search, filterKelas, filterTanggal])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const summary = useMemo(
    () => ({
      total: data.length,
      hadir: data.filter((d) => d.status === "hadir").length,
      haid: data.filter((d) => d.status === "haid").length,
      tidak_hadir: data.filter((d) => d.status === "tidak_hadir").length,
    }),
    [data]
  )

  const hadirPct = Math.round((summary.hadir / summary.total) * 100)

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

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab)
    setPage(1)
  }

  const handleDelete = (id: number) =>
    setData((prev) => prev.filter((s) => s.id !== id))

  const handleStatusChange = async (id: number, newStatus: AbsenStatus) => {
    // Optimistic update
    const oldData = [...data]
    setData((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: newStatus } : s))
    )

    try {
      const res = await fetch(`/api/absensi/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) {
        const result = await res.json()
        throw new Error(result.error || "Gagal memperbarui status")
      }
    } catch (err: unknown) {
      console.error(err)
      alert(err instanceof Error ? err.message : "Terjadi kesalahan")
      setData(oldData)
    }
  }

  return (
    <AdminShell>
      <div className="flex flex-col gap-5 px-4 py-5 md:px-6">
        {/* ── Banner ── */}
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
          <div className="relative z-10 flex items-center gap-3">
            {/* Attendance ring */}
            <div className="hidden flex-col items-center gap-0.5 rounded-2xl border border-white/15 bg-white/10 px-5 py-3 backdrop-blur-sm sm:flex">
              <span className="text-2xl leading-none font-black text-white">
                {hadirPct}%
              </span>
              <span className="text-[10px] text-teal-200">Tingkat Hadir</span>
            </div>
            <button
              onClick={() => router.push("/admin/generate-qr")}
              className="flex h-9 items-center gap-2 rounded-xl border border-white/20 bg-white/15 px-4 text-xs font-bold text-white backdrop-blur-sm transition-all hover:bg-white/25"
            >
              <QrCode className="h-3.5 w-3.5" /> Generate QR
            </button>
          </div>
        </div>

        {/* ── Summary cards ── */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            {
              label: "Total Siswa",
              value: summary.total,
              icon: Users,
              color: "text-muted-foreground",
              bg: "border-border",
              iconBg: "bg-muted",
            },
            {
              label: "Hadir",
              value: summary.hadir,
              icon: UserCheck,
              color: "text-primary",
              bg: "border-primary/20",
              iconBg: "bg-primary/10",
            },
            {
              label: "Haid",
              value: summary.haid,
              icon: Clock,
              color: "text-blue-500",
              bg: "border-blue-500/20",
              iconBg: "bg-blue-500/10",
            },
            {
              label: "Tidak Hadir",
              value: summary.tidak_hadir,
              icon: XCircle,
              color: "text-destructive",
              bg: "border-destructive/20",
              iconBg: "bg-destructive/10",
            },
          ].map(({ label, value, icon: Icon, color, bg, iconBg }) => (
            <div
              key={label}
              className={`rounded-2xl border bg-card ${bg} flex flex-col gap-2 px-4 py-4 shadow-sm`}
            >
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconBg}`}
              >
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <div>
                <p className={`text-2xl leading-none font-black ${color}`}>
                  {value}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Table card ── */}
        <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {/* ─ Toolbar ─ */}
          <div className="flex flex-col gap-3 border-b border-border/50 px-5 pt-4 pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-foreground">
                  Rekap Absensi Dzuhur
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {filtered.length} dari {data.length} siswa
                  {activeFilterCount > 0 && (
                    <button
                      onClick={resetFilters}
                      className="ml-2 inline-flex items-center gap-0.5 font-semibold text-primary hover:underline"
                    >
                      <X className="h-3 w-3" /> Reset filter
                    </button>
                  )}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Cari nama, NIS, kelas..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value)
                      setPage(1)
                    }}
                    className="h-9 w-52 rounded-xl border-border bg-muted/50 pl-8 text-xs focus-visible:ring-primary"
                  />
                </div>

                {/* Filter toggle */}
                <button
                  onClick={() => setShowFilterPanel((v) => !v)}
                  className="relative flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-all"
                  style={{
                    background:
                      showFilterPanel || activeFilterCount > 0
                        ? "var(--color-primary-transparent)"
                        : "transparent",
                    borderColor:
                      showFilterPanel || activeFilterCount > 0
                        ? "var(--color-primary)"
                        : "var(--color-border)",
                    color:
                      showFilterPanel || activeFilterCount > 0
                        ? "var(--color-primary)"
                        : "var(--color-muted-foreground)",
                  }}
                >
                  <Filter className="h-3.5 w-3.5" />
                  Filter
                  {activeFilterCount > 0 && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-black text-primary-foreground">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                {/* Export Excel */}
                <button
                  onClick={() => exportToExcel(filtered)}
                  className="flex h-9 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Export Excel
                </button>
              </div>
            </div>

            {/* Filter panel */}
            {showFilterPanel && (
              <div className="flex flex-wrap gap-3 border-t border-border/50 pt-1 pb-0.5">
                {/* Kelas */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Kelas
                  </label>
                  <select
                    value={filterKelas}
                    onChange={(e) => {
                      setFilterKelas(e.target.value)
                      setPage(1)
                    }}
                    className="h-8 cursor-pointer rounded-lg border border-border bg-muted/50 pr-8 pl-3 text-xs text-foreground outline-none focus:border-primary"
                  >
                    <option>Semua Kelas</option>
                    {KELAS_LIST.map((k) => (
                      <option key={k}>{k}</option>
                    ))}
                  </select>
                </div>

                {/* Tanggal */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    value={filterTanggal}
                    onChange={(e) => {
                      setFilterTanggal(e.target.value)
                      setPage(1)
                    }}
                    className="h-8 cursor-pointer rounded-lg border border-border bg-muted/50 px-3 text-xs text-foreground outline-none focus:border-primary"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ─ Tabs ─ */}
          <div className="flex items-center border-b border-border/50 px-5">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`relative px-4 py-3 text-xs font-bold transition-colors ${
                  activeTab === tab
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <div className="absolute right-0 bottom-0 left-0 h-0.5 bg-primary" />
                )}
              </button>
            ))}
          </div>

          {/* ─ Table ─ */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-muted/30 text-[10px] font-black tracking-widest text-muted-foreground uppercase">
                  <th className="px-5 py-3">Siswa</th>
                  <th className="px-5 py-3">Waktu & Tanggal</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {paginated.length > 0 ? (
                  paginated.map((s) => (
                    <tr
                      key={s.id}
                      className="group transition-colors hover:bg-muted/40"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 border-2 border-background">
                            <AvatarImage
                              src={`https://i.pravatar.cc/100?u=${s.id}`}
                            />
                            <AvatarFallback className="bg-primary/10 text-[10px] font-bold text-primary">
                              {s.nama.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-bold text-foreground">
                              {s.nama}
                            </p>
                            <p className="text-[10px] font-medium text-muted-foreground">
                              {s.nis} • {s.kelas}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                            <Clock className="h-3 w-3 text-primary" />
                            {s.waktu === "—" ? "Belum absen" : `${s.waktu} WIB`}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <CalendarDays className="h-3 w-3" />
                            {s.tanggal}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge
                          variant="outline"
                          className={`rounded-lg border px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${STATUS_META[s.status].badge}`}
                        >
                          {STATUS_META[s.status].label}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-44 rounded-xl"
                          >
                            <DropdownMenuLabel className="text-[10px] font-bold text-muted-foreground uppercase">
                              Ubah Status
                            </DropdownMenuLabel>
                            {Object.entries(STATUS_META).map(([key, meta]) => (
                              <DropdownMenuItem
                                key={key}
                                onClick={() =>
                                  handleStatusChange(s.id, key as AbsenStatus)
                                }
                                className="flex cursor-pointer items-center gap-2 rounded-lg text-xs"
                              >
                                <div
                                  className={`h-2 w-2 rounded-full ${meta.dot}`}
                                />
                                {meta.label}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(s.id)}
                              className="flex cursor-pointer items-center gap-2 rounded-lg text-xs text-destructive focus:bg-destructive/10 focus:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Hapus Record
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
                          <Search className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-bold text-foreground">
                          Tidak ada data ditemukan
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Coba sesuaikan filter atau kata kunci pencarian Anda
                        </p>
                        <button
                          onClick={resetFilters}
                          className="mt-2 text-xs font-bold text-primary hover:underline"
                        >
                          Reset semua filter
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ─ Pagination ─ */}
          <div className="flex items-center justify-between border-t border-border/50 bg-muted/20 px-5 py-4">
            <p className="text-[10px] font-bold text-muted-foreground uppercase">
              Halaman {page} dari {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-all hover:bg-muted disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-all hover:bg-muted disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  )
}
