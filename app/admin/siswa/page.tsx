"use client"

import { useState, useMemo } from "react"
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
  ClipboardList,
  Search,
  Clock,
  XCircle,
  UserCheck,
  MoreHorizontal,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Download,
  Filter,
  X,
  TrendingUp,
  CalendarDays,
  RefreshCw,
  CheckCircle2,
  Plus,
} from "lucide-react"
import { useRouter } from "next/navigation"
import * as XLSX from "xlsx"

// ─── Types ────────────────────────────────────────────────────────────────────
type AbsenStatus = "hadir" | "Haid" | "tidak_hadir" | "Haid"

interface SiswaRecord {
  id: number
  nama: string
  nis: string
  kelas: string
  avatar: string
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
    dot: "bg-teal-400",
    badge: "bg-teal-50 text-teal-700 border-teal-200",
    color: "#0d9488",
    bg: "rgba(13,148,136,0.08)",
  },
  Haid: {
    label: "Haid",
    dot: "bg-amber-400",
    badge: "bg-amber-50 text-amber-600 border-amber-200",
    color: "#d97706",
    bg: "rgba(217,119,6,0.08)",
  },
  tidak_hadir: {
    label: "Tidak Hadir",
    dot: "bg-red-400",
    badge: "bg-red-50 text-red-500 border-red-200",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.08)",
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

// ─── Dummy data ───────────────────────────────────────────────────────────────
const SISWA_DATA: SiswaRecord[] = [
  {
    id: 1,
    nama: "Aretha Safira P.",
    nis: "22001",
    kelas: "X RPL C",
    avatar: "11",
    waktu: "12:03",
    status: "hadir",
    tanggal: "2026-04-23",
  },
  {
    id: 2,
    nama: "Muhammad Fajar",
    nis: "22002",
    kelas: "X RPL A",
    avatar: "12",
    waktu: "12:05",
    status: "hadir",
    tanggal: "2026-04-23",
  },
  {
    id: 3,
    nama: "Siti Nurhaliza",
    nis: "22003",
    kelas: "XI IPA 2",
    avatar: "13",
    waktu: "12:22",
    status: "Haid",
    tanggal: "2026-04-23",
  },
  {
    id: 4,
    nama: "Budi Santoso",
    nis: "22004",
    kelas: "XI IPS 1",
    avatar: "14",
    waktu: "—",
    status: "tidak_hadir",
    tanggal: "2026-04-23",
  },
  {
    id: 5,
    nama: "Dewi Rahayu",
    nis: "22005",
    kelas: "XII RPL B",
    avatar: "15",
    waktu: "12:08",
    status: "hadir",
    tanggal: "2026-04-23",
  },
  {
    id: 6,
    nama: "Ahmad Zainuddin",
    nis: "22006",
    kelas: "X RPL B",
    avatar: "16",
    waktu: "—",
    status: "Haid",
    tanggal: "2026-04-23",
  },
  {
    id: 7,
    nama: "Nurul Hidayah",
    nis: "22007",
    kelas: "XI IPA 1",
    avatar: "17",
    waktu: "12:11",
    status: "hadir",
    tanggal: "2026-04-23",
  },
  {
    id: 8,
    nama: "Rizky Pratama",
    nis: "22008",
    kelas: "XII IPS 2",
    avatar: "18",
    waktu: "12:30",
    status: "Haid",
    tanggal: "2026-04-23",
  },
  {
    id: 9,
    nama: "Fatimah Az-Zahra",
    nis: "22009",
    kelas: "X RPL C",
    avatar: "19",
    waktu: "12:04",
    status: "hadir",
    tanggal: "2026-04-23",
  },
  {
    id: 10,
    nama: "Hendra Kurniawan",
    nis: "22010",
    kelas: "XI RPL A",
    avatar: "20",
    waktu: "—",
    status: "tidak_hadir",
    tanggal: "2026-04-23",
  },
  {
    id: 11,
    nama: "Reza Maulana",
    nis: "22011",
    kelas: "XII RPL B",
    avatar: "22",
    waktu: "12:15",
    status: "hadir",
    tanggal: "2026-04-23",
  },
  {
    id: 12,
    nama: "Putri Ayu Lestari",
    nis: "22012",
    kelas: "XI IPS 1",
    avatar: "25",
    waktu: "—",
    status: "tidak_hadir",
    tanggal: "2026-04-23",
  },
  {
    id: 13,
    nama: "Fadhil Rahmatullah",
    nis: "22013",
    kelas: "X RPL C",
    avatar: "27",
    waktu: "12:19",
    status: "hadir",
    tanggal: "2026-04-23",
  },
  {
    id: 14,
    nama: "Zahra Fitria",
    nis: "22014",
    kelas: "XI IPA 1",
    avatar: "30",
    waktu: "12:31",
    status: "Haid",
    tanggal: "2026-04-23",
  },
  {
    id: 15,
    nama: "Bagas Setiawan",
    nis: "22015",
    kelas: "X RPL A",
    avatar: "32",
    waktu: "12:07",
    status: "hadir",
    tanggal: "2026-04-23",
  },
  {
    id: 16,
    nama: "Nabilah Azzahra",
    nis: "22016",
    kelas: "XI IPS 1",
    avatar: "35",
    waktu: "—",
    status: "Haid",
    tanggal: "2026-04-23",
  },
  {
    id: 17,
    nama: "Irfan Hakim",
    nis: "22017",
    kelas: "XII RPL B",
    avatar: "38",
    waktu: "12:04",
    status: "hadir",
    tanggal: "2026-04-23",
  },
  {
    id: 18,
    nama: "Salwa Oktavia",
    nis: "22018",
    kelas: "XI IPA 2",
    avatar: "41",
    waktu: "12:13",
    status: "hadir",
    tanggal: "2026-04-23",
  },
]

const TABS = ["Semua", "Hadir", "Haid", "Tidak Hadir", "Haid"] as const
type Tab = (typeof TABS)[number]

const TAB_TO_STATUS: Record<Tab, AbsenStatus | null> = {
  Semua: null,
  Hadir: "hadir",
  Haid: "Haid",
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
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>("Semua")
  const [search, setSearch] = useState("")
  const [filterKelas, setFilterKelas] = useState("Semua Kelas")
  const [filterTanggal, setFilterTanggal] = useState("")
  const [page, setPage] = useState(1)
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [data, setData] = useState<SiswaRecord[]>(SISWA_DATA)
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
      Haid: data.filter((d) => d.status === "Haid").length,
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

  const handleStatusChange = (id: number, newStatus: AbsenStatus) => {
    setData((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: newStatus } : s))
    )
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
            {/* <div className="hidden flex-col items-center gap-0.5 rounded-2xl border border-white/15 bg-white/10 px-5 py-3 backdrop-blur-sm sm:flex">
              <span className="text-2xl leading-none font-black text-white">
                {hadirPct}%
              </span>
              <span className="text-[10px] text-teal-200">Tingkat Hadir</span>
            </div> */}
          </div>
        </div>

        {/* ── Summary cards ── */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            {
              label: "Total Siswa",
              value: summary.total,
              icon: Users,
              color: "text-slate-600",
              bg: "border-slate-100",
              iconBg: "bg-slate-50",
            },
            {
              label: "Hadir",
              value: summary.hadir,
              icon: UserCheck,
              color: "text-teal-600",
              bg: "border-teal-50",
              iconBg: "bg-teal-50",
            },
            {
              label: "Haid",
              value: summary.Haid,
              icon: Clock,
              color: "text-amber-500",
              bg: "border-amber-50",
              iconBg: "bg-amber-50",
            },
            {
              label: "Tidak Hadir",
              value: summary.tidak_hadir,
              icon: XCircle,
              color: "text-red-500",
              bg: "border-red-50",
              iconBg: "bg-red-50",
            },
          ].map(({ label, value, icon: Icon, color, bg, iconBg }) => (
            <div
              key={label}
              className={`rounded-2xl border bg-white ${bg} flex flex-col gap-2 px-4 py-4 shadow-sm`}
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
                <p className="mt-0.5 text-xs text-slate-500">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Table card ── */}
        <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          {/* ─ Toolbar ─ */}
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
                {/* Search */}
                <div className="relative">
                  <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Cari nama, NIS, kelas..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value)
                      setPage(1)
                    }}
                    className="h-9 w-52 rounded-xl border-slate-200 bg-slate-50 pl-8 text-xs focus-visible:ring-teal-400"
                  />
                </div>

                {/* Filter toggle */}
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
                    <span className="text-[9px flex h-4 w-4 items-center justify-center rounded-full border bg-teal-500 text-white">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => router.push("/admin/tambahsiswa")}
                  className="flex h-9 items-center gap-2 rounded-xl border border-slate-300 bg-white/15 px-4 text-xs font-semibold text-slate-400 backdrop-blur-sm transition-all hover:bg-white/25"
                >
                  Tambah Siswa baru
                  <Plus className="h-3.5 w-3.5" />
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
              <div className="flex flex-wrap gap-3 border-t border-slate-50 pt-1 pb-0.5">
                {/* Kelas */}
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
                    className="h-8 cursor-pointer rounded-lg border border-slate-200 bg-slate-50 pr-8 pl-3 text-xs text-slate-700 outline-none focus:border-teal-400"
                  >
                    <option>Semua Kelas</option>
                    {KELAS_LIST.map((k) => (
                      <option key={k}>{k}</option>
                    ))}
                  </select>
                </div>

                {/* Tanggal */}
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

                {/* Quick date buttons */}
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

          {/* ─ Tabs ─ */}
          <div className="scrollbar-none flex gap-0 overflow-x-auto border-b border-slate-50 px-5">
            {TABS.map((tab) => {
              const count =
                tab === "Semua"
                  ? data.length
                  : data.filter((s) => s.status === TAB_TO_STATUS[tab]).length
              const isActive = activeTab === tab
              return (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className="flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all"
                  style={{
                    borderColor: isActive ? "#0d9488" : "transparent",
                    color: isActive ? "#0d9488" : "#94a3b8",
                  }}
                >
                  {tab}
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                    style={{
                      background: isActive ? "rgba(13,148,136,0.1)" : "#f1f5f9",
                      color: isActive ? "#0d9488" : "#94a3b8",
                    }}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* ─ Table ─ */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th className="px-5 py-3 text-left text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                    Siswa
                  </th>
                  <th className="px-3 py-3 text-left text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                    Kelas
                  </th>
                  <th className="px-3 py-3 text-left text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                    Tanggal
                  </th>
                  <th className="px-3 py-3 text-left text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                    Waktu
                  </th>
                  <th className="px-3 py-3 text-left text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                    Status
                  </th>
                  <th className="w-10 px-3 py-3" />
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
                    const st = STATUS_META[s.status]
                    return (
                      <tr
                        key={s.id}
                        className="border-t border-slate-50 transition-colors hover:bg-slate-50/70"
                        style={{
                          background: i % 2 !== 0 ? "#fafcff" : undefined,
                        }}
                      >
                        {/* Siswa */}
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
                            <div>
                              <p className="text-sm leading-tight font-semibold text-slate-800">
                                {s.nama}
                              </p>
                              <p className="font-mono text-xs text-slate-400">
                                {s.nis}
                              </p>
                            </div>
                          </div>
                        </td>
                        {/* Kelas */}
                        <td className="px-3 py-3">
                          <span className="inline-block rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                            {s.kelas}
                          </span>
                        </td>
                        {/* Tanggal */}
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <CalendarDays className="h-3.5 w-3.5 text-slate-300" />
                            {new Date(s.tanggal).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </div>
                        </td>
                        {/* Waktu */}
                        <td className="px-3 py-3">
                          <div
                            className="flex items-center gap-1.5 text-xs font-semibold"
                            style={{
                              color: s.waktu === "—" ? "#cbd5e1" : "#334155",
                            }}
                          >
                            <Clock className="h-3.5 w-3.5 text-slate-300" />
                            {s.waktu === "—" ? "—" : `${s.waktu} WIB`}
                          </div>
                        </td>
                        {/* Status */}
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className={`h-2 w-2 flex-shrink-0 rounded-full ${st.dot}`}
                            />
                            <Badge
                              variant="outline"
                              className={`rounded-lg border px-2 py-0.5 text-[10px] font-semibold ${st.badge}`}
                            >
                              {st.label}
                            </Badge>
                          </div>
                        </td>
                        {/* Actions */}
                        <td className="px-3 py-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-44 rounded-2xl p-1"
                            >
                              <DropdownMenuLabel className="px-2 pb-1 text-[10px] text-slate-400">
                                Ubah Status
                              </DropdownMenuLabel>
                              {(
                                [
                                  "hadir",
                                  "Haid",
                                  "tidak_hadir",
                                ] as AbsenStatus[]
                              ).map((st) => (
                                <DropdownMenuItem
                                  key={st}
                                  onClick={() => handleStatusChange(s.id, st)}
                                  className="cursor-pointer gap-2 rounded-xl text-xs"
                                >
                                  <div
                                    className={`h-2 w-2 flex-shrink-0 rounded-full ${STATUS_META[st].dot}`}
                                  />
                                  {STATUS_META[st].label}
                                  {s.status === st && (
                                    <CheckCircle2 className="ml-auto h-3 w-3 text-teal-500" />
                                  )}
                                </DropdownMenuItem>
                              ))}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="cursor-pointer rounded-xl text-xs">
                                <Eye className="mr-2 h-3.5 w-3.5 text-slate-400" />{" "}
                                Detail
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(s.id)}
                                className="cursor-pointer rounded-xl text-xs text-red-500 focus:bg-red-50 focus:text-red-500"
                              >
                                <Trash2 className="mr-2 h-3.5 w-3.5" /> Hapus
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

          {/* ─ Pagination ─ */}
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
                      key={`ellipsis-${i}`}
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
