"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AdminShell } from "../_components/AdminShell"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AbsensiExportButton } from "@/components/AbsensiExportButton"
import { Button } from "@/components/ui/button"
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
  Search,
  Clock,
  XCircle,
  UserCheck,
  MoreHorizontal,
  Trash2,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Filter,
  AlertTriangle,
  Download,
  FileSpreadsheet,
} from "lucide-react"
import { FilterModal } from "@/components/FilterModal"
import { AttendanceBanner } from "@/components/AttendanceBanner"

// ─── Types ─────────────────────────────────────────────────────────────────────
type AbsenStatus = "hadir" | "haid" | "tidak_hadir"

interface SiswaRecord {
  id: number
  nama: string
  nis: string
  kelas: string
  jenis_kelamin?: string
  waktu: string
  status: AbsenStatus
  tanggal: string
}

interface AbsensiResponse {
  id: number
  status: string
  tanggal: string
  waktu: string
  users: {
    nama: string
    nis: string
    kelas: string
    jenis_kelamin: string
  } | null
}

// ─── Config ─────────────────────────────────────────────────────────────────────
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

const TABS = ["Semua", "Hadir", "Haid", "Tidak Hadir"] as const
type Tab = (typeof TABS)[number]

const TAB_TO_STATUS: Record<Tab, AbsenStatus | null> = {
  Semua: null,
  Hadir: "hadir",
  Haid: "haid",
  "Tidak Hadir": "tidak_hadir",
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DataAbsenPage() {
  const router = useRouter()
  const [data, setData] = useState<SiswaRecord[]>([])
  const [classes, setClasses] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [checkingSession, setCheckingSession] = useState(true)

  // Check session on mount
  useEffect(() => {
    const checkSession = () => {
      const adminSession = localStorage.getItem("admin_session")
      const panitiaSession = localStorage.getItem("panitia_session")

      if (!adminSession && !panitiaSession) {
        router.push("/admin")
        return
      }
      setCheckingSession(false)
    }

    checkSession()
  }, [router])

  useEffect(() => {
    let isMounted = true
    const fetchAbsensi = async () => {
      try {
        const [absensiRes, classesRes] = await Promise.all([
          fetch("/api/absensi"),
          fetch("/api/classes"),
        ])

        if (!absensiRes.ok) throw new Error("Gagal mengambil data absensi")

        const result = await absensiRes.json()
        const classesData = await classesRes.json()

        if (!isMounted) return

        const formatted = (result as AbsensiResponse[]).map(
          (s): SiswaRecord => {
            let rawStatus = (s.status || "").trim().toLowerCase()
            if (rawStatus === "tidak hadir") rawStatus = "tidak_hadir"

            return {
              id: s.id,
              nama: s.users?.nama || "Tidak diketahui",
              nis: s.users?.nis || "—",
              kelas: s.users?.kelas || "—",
              jenis_kelamin: s.users?.jenis_kelamin || "—",
              tanggal: s.tanggal ?? "—",
              waktu: s.waktu ?? "—",
              status: (["hadir", "haid", "tidak_hadir"].includes(rawStatus)
                ? rawStatus
                : "tidak_hadir") as AbsenStatus,
            }
          }
        )
        setData(formatted)
        if (classesData.classes) {
          setClasses(classesData.classes)
        }
      } catch (err) {
        console.error("Error fetching data:", err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchAbsensi()
    return () => {
      isMounted = false
    }
  }, [])

  const [activeTab, setActiveTab] = useState<Tab>("Semua")
  const [search, setSearch] = useState("")
  const [filterKelas, setFilterKelas] = useState("")
  const [filterTanggal, setFilterTanggal] = useState("")
  const [selectedSort, setSelectedSort] = useState("nama-asc")
  const [page, setPage] = useState(1)
  const [showFilterModal, setShowFilterModal] = useState(false)
  const clearSelected = () => setSelected(new Set())
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportAllClasses, setExportAllClasses] = useState(false)
  const [perPage, setPerPage] = useState(8)

  // ── Dynamic Row Calculation ────────────────────────────────────────────────
  useEffect(() => {
    const calculateRows = () => {
      // Tinggi layar - (Header + Banner + Summary + Toolbar + Tabs + Footer + Padding)
      // Estimasi non-tabel: ~530px
      const availableHeight = window.innerHeight - 530
      const rowHeight = 62 // Baris absen lebih tinggi sedikit karena avatar
      const estimatedRows = Math.max(5, Math.floor(availableHeight / rowHeight))
      setPerPage(estimatedRows)
    }

    calculateRows()
    window.addEventListener("resize", calculateRows)
    return () => window.removeEventListener("resize", calculateRows)
  }, [])

  const todayStr = !loading
    ? new Date().toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
    : ""

  const displayDateStr = filterTanggal
    ? new Date(filterTanggal).toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
    : todayStr

  // ── Filter logic ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const filteredData = data.filter((s) => {
      const matchTab =
        TAB_TO_STATUS[activeTab] === null ||
        s.status === TAB_TO_STATUS[activeTab]
      const matchSearch =
        !search ||
        s.nama.toLowerCase().includes(search.toLowerCase()) ||
        s.nis.includes(search) ||
        s.kelas.toLowerCase().includes(search.toLowerCase())
      const matchKelas = !filterKelas || s.kelas === filterKelas
      const matchTgl = !filterTanggal || s.tanggal === filterTanggal
      return matchTab && matchSearch && matchKelas && matchTgl
    })
    return filteredData.sort((a, b) => {
      const [sortBy, sortOrder] = selectedSort.split("-") as [
        "nama" | "waktu",
        "asc" | "desc",
      ]
      let cmp = 0
      if (sortBy === "nama") {
        cmp = a.nama.localeCompare(b.nama, "id-ID")
      } else {
        cmp = a.waktu.localeCompare(b.waktu)
      }
      return sortOrder === "asc" ? cmp : -cmp
    })
  }, [data, activeTab, search, filterKelas, filterTanggal, selectedSort])

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const paginated = filtered.slice((page - 1) * perPage, page * perPage)
  const paginatedIds = paginated.map((s) => s.id)

  const allPageSelected =
    paginatedIds.length > 0 && paginatedIds.every((id) => selected.has(id))
  const somePageSelected = paginatedIds.some((id) => selected.has(id))

  const summary = useMemo(
    () => ({
      total: data.length,
      hadir: data.filter((d) => d.status === "hadir").length,
      haid: data.filter((d) => d.status === "haid").length,
      tidak_hadir: data.filter((d) => d.status === "tidak_hadir").length,
    }),
    [data]
  )


  const activeFilterCount = [
    filterKelas !== "",
    filterTanggal !== "",
    search !== "",
  ].filter(Boolean).length
  const resetFilters = () => {
    setSearch("")
    setFilterKelas("")
    setFilterTanggal("")
    setSelectedSort("nama-asc")
    setActiveTab("Semua")
    setPage(1)
  }

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab)
    setPage(1)
  }

  // ── Checkbox ────────────────────────────────────────────────────────────────
  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allPageSelected) {
        paginatedIds.forEach((id) => next.delete(id))
      } else {
        paginatedIds.forEach((id) => next.add(id))
      }
      return next
    })
  }

  const toggleOne = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })

  const openDeleteModal = (id: number) => {
    setDeletingId(id)
    setShowDeleteModal(true)
  }

  const handleDelete = async () => {
    if (!deletingId) return
    try {
      const res = await fetch(`/api/absensi/${deletingId}`, {
        method: "DELETE",
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || "Gagal hapus data")
      setData((prev) => prev.filter((s) => s.id !== deletingId))
      setSelected((prev) => {
        const next = new Set(prev)
        next.delete(deletingId)
        return next
      })
    } catch (err: unknown) {
      alert((err as Error).message || "Terjadi kesalahan saat menghapus data")
    } finally {
      setShowDeleteModal(false)
      setDeletingId(null)
    }
  }

  // ── Delete bulk ─────────────────────────────────────────────────────────────
  const handleBulkDelete = async () => {
    try {
      await Promise.all(
        Array.from(selected).map((id) =>
          fetch(`/api/absensi/${id}`, { method: "DELETE" })
        )
      )
      setData((prev) => prev.filter((s) => !selected.has(s.id)))
      clearSelected()
    } catch (err: unknown) {
      alert((err as Error).message || "Terjadi kesalahan saat menghapus data")
    } finally {
      setShowDeleteModal(false)
    }
  }

  const confirmDelete = () => {
    if (deletingId) {
      handleDelete()
    } else {
      handleBulkDelete()
    }
  }

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

  if (checkingSession) {
    return (
      <AdminShell>
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Memeriksa sesi...</p>
          </div>
        </div>
      </AdminShell>
    )
  }

  return (
    <AdminShell>
      <div className="flex flex-col gap-5 py-5 md:px-6">
        {/* ── Banner ── */}
        <AttendanceBanner
          title="Data Absen Siswa Rohis"
          subtitle="Data Absensi"
          date={todayStr}
          totalLabel="Total Absen"
          summary={{
            total: summary.total,
            hadir: summary.hadir,
            haid: summary.haid,
            tidak_hadir: summary.tidak_hadir,
          }}
        />

        {/* ── Summary cards ── */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {[
            {
              label: "Total Siswa",
              value: summary.total,
              pct: summary.total > 0 ? 100 : 0,
              sub: "Total absensi tercatat",
              icon: Users,
              color: "text-slate-700 dark:text-slate-200",
              bg: "bg-card border-border/80 hover:border-slate-400/40",
              iconBg: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
              barColor: "bg-slate-400 dark:bg-slate-600",
            },
            {
              label: "Hadir",
              value: summary.hadir,
              pct: summary.total > 0 ? Math.round((summary.hadir / summary.total) * 100) : 0,
              sub: "Hadir hari ini",
              icon: UserCheck,
              color: "text-teal-600 dark:text-teal-400",
              bg: "bg-card border-border/80 hover:border-teal-500/40",
              iconBg: "bg-teal-500/10 text-teal-600 dark:bg-teal-400/10 dark:text-teal-400",
              barColor: "bg-teal-500",
            },
            {
              label: "Haid",
              value: summary.haid,
              pct: summary.total > 0 ? Math.round((summary.haid / summary.total) * 100) : 0,
              sub: "Berhalangan sholat",
              icon: Clock,
              color: "text-blue-600 dark:text-blue-400",
              bg: "bg-card border-border/80 hover:border-blue-500/40",
              iconBg: "bg-blue-500/10 text-blue-600 dark:bg-blue-400/10 dark:text-blue-400",
              barColor: "bg-blue-500",
            },
            {
              label: "Tidak Hadir",
              value: summary.tidak_hadir,
              pct: summary.total > 0 ? Math.round((summary.tidak_hadir / summary.total) * 100) : 0,
              sub: "Alpa / Izin / Sakit",
              icon: XCircle,
              color: "text-rose-600 dark:text-rose-400",
              bg: "bg-card border-border/80 hover:border-rose-500/40",
              iconBg: "bg-rose-500/10 text-rose-600 dark:bg-rose-400/10 dark:text-rose-400",
              barColor: "bg-rose-500",
            },
          ].map(({ label, value, pct, sub, icon: Icon, color, bg, iconBg, barColor }) => (
            <div
              key={label}
              className="group flex flex-col items-center justify-center rounded-[24px] border border-border/50 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:bg-card"
            >
              <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110 ${iconBg}`}>
                <Icon className="h-6 w-6" />
              </div>
              <p className={`text-3xl font-black leading-none tracking-tight sm:text-4xl ${color}`}>
                {value}
              </p>
              <p className="mt-2 text-xs font-bold tracking-tight text-foreground sm:text-sm">
                {label}
              </p>
              <p className="mt-1 text-center text-[10px] font-medium text-muted-foreground sm:text-[11px]">
                {sub}
              </p>
            </div>
          ))}
        </div>

        {/* ── Table card ── */}
        <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {/* ─ Toolbar ─ */}
          <div className="flex flex-col gap-4 border-b border-border/50 px-5 pt-5 pb-5">
            {/* Judul & Statistik */}
            <div>
              <h2 className="text-base font-bold text-foreground">
                Rekap Absensi Dzuhur
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {filtered.length} dari {data.length} siswa
              </p>
            </div>

            {/* Row 2: Search & Actions */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              {/* Search Bar */}
              <div className="group relative w-full md:flex-1">
                <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-hover:text-[#0d9488]" />
                <Input
                  placeholder="Cari nama, NIS, kelas..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  className="h-11 w-full rounded-xl border-border bg-muted/20 pl-10 text-sm transition-all duration-200 hover:shadow-sm focus-visible:ring-primary"
                />
              </div>

              {/* Tombol Aksi (Filter & Export) */}
              <div className="flex w-full items-center gap-3 md:w-auto">
                <button
                  onClick={() => setShowFilterModal(true)}
                  className="group relative flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-xs font-bold text-foreground transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-md md:w-32 md:flex-none"
                >
                  <Filter className="h-4 w-4 transition-colors duration-200 group-hover:text-[#0d9488]" />
                  Filter
                  {activeFilterCount > 0 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-black text-primary-foreground">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => {
                    setExportAllClasses(false)
                    setShowExportModal(true)
                  }}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 text-xs font-bold text-white shadow-sm shadow-teal-500/20 transition-all hover:-translate-y-0.5 hover:bg-teal-700 hover:shadow-md md:w-44 md:flex-none"
                >
                  <Download className="h-4 w-4" />
                  Export Data
                </button>
              </div>
            </div>
          </div>

          {/* ─ Tabs ─ */}
          <div className="flex items-center border-b border-border/50 px-5">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`relative px-4 py-3 text-xs font-bold transition-colors ${activeTab === tab
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

          {/* ─ Mobile Card List ─ */}
          <div className="flex flex-col divide-y divide-border/50 md:hidden">
            {paginated.length > 0 ? (
              paginated.map((s) => (
                <div
                  key={s.id}
                  className="p-3 transition-colors active:bg-muted/50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selected.has(s.id)}
                          onChange={() => toggleOne(s.id)}
                          className="h-3.5 w-3.5 cursor-pointer rounded border-border accent-primary"
                        />
                        <Avatar className="h-9 w-9 border-2 border-background shadow-sm">
                          <AvatarFallback className="bg-primary/10 text-[10px] font-bold text-primary">
                            {s.nama.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div>
                        <p className="line-clamp-1 text-[13px] font-bold text-foreground">
                          {s.nama}
                        </p>
                        <p className="text-[9px] font-medium text-muted-foreground">
                          {s.nis} • {s.kelas}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-44 rounded-xl"
                      >
                        <DropdownMenuLabel>Action</DropdownMenuLabel>
                        <DropdownMenuSeparator />
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
                          onClick={() => openDeleteModal(s.id)}
                          className="flex cursor-pointer items-center gap-2 rounded-lg text-xs text-destructive focus:bg-destructive/10 focus:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Hapus Record
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5 text-[10px] font-semibold text-foreground">
                        <Clock className="h-2.5 w-2.5 text-primary" />
                        {s.waktu === "—" ? "Belum absen" : `${s.waktu} WIB`}
                      </div>
                      <div className="flex items-center gap-1.5 text-[8px] text-muted-foreground">
                        <CalendarDays className="h-2.5 w-2.5" />
                        {s.tanggal}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`rounded-lg border px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase ${STATUS_META[s.status].badge}`}
                    >
                      {STATUS_META[s.status].label}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center">
                <Search className="mx-auto h-8 w-8 text-muted/30" />
                <p className="mt-2 text-sm font-bold text-foreground">
                  Tidak ada data
                </p>
                <button
                  onClick={resetFilters}
                  className="mt-2 text-xs font-bold text-primary hover:underline"
                >
                  Reset filter
                </button>
              </div>
            )}
          </div>

          {/* ─ Table (Desktop & Tablet) ─ */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-muted/30 text-[10px] font-black tracking-widest text-muted-foreground uppercase">
                  <th className="w-12 py-3 pr-2 pl-5">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      ref={(el) => {
                        if (el)
                          el.indeterminate =
                            somePageSelected && !allPageSelected
                      }}
                      onChange={toggleAll}
                      className="h-4 w-4 cursor-pointer rounded border-border accent-primary"
                    />
                  </th>
                  {[
                    { label: "Siswa", width: "" },
                    { label: "Waktu & Tanggal", width: "w-60" },
                    { label: "Status", width: "w-40" },
                    { label: "Action", width: "w-16" },
                  ].map((h) => (
                    <th
                      key={h.label}
                      className={`px-5 py-3 ${h.label === "Action" ? "text-right" : ""} ${h.width}`}
                    >
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {paginated.length > 0 ? (
                  paginated.map((s) => (
                    <tr
                      key={s.id}
                      className="group transition-colors hover:bg-muted/40"
                    >
                      <td className="py-3 pr-2 pl-5">
                        <input
                          type="checkbox"
                          checked={selected.has(s.id)}
                          onChange={() => toggleOne(s.id)}
                          className="h-4 w-4 cursor-pointer rounded border-border accent-primary"
                        />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 border-2 border-background">
                            <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
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
                            <DropdownMenuLabel>Action</DropdownMenuLabel>
                            <DropdownMenuSeparator />
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
                              onClick={() => openDeleteModal(s.id)}
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
                    <td colSpan={5} className="px-5 py-12 text-center">
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

      {/* Filter Modal */}
      <FilterModal
        open={showFilterModal}
        onOpenChange={setShowFilterModal}
        title="Filter Data Absen"
        description="Filter data absensi sesuai dengan kriteria yang Anda inginkan"
        classes={classes}
        selectedClass={filterKelas}
        onClassChange={(val) => {
          setFilterKelas(val)
          setPage(1)
        }}
        startDate={filterTanggal}
        onStartDateChange={(val) => {
          setFilterTanggal(val)
          setPage(1)
        }}
        onReset={resetFilters}
      />

      {/* Export Modal */}
      <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
        <DialogContent className="inset-0 h-dvh w-screen max-w-none translate-x-0 translate-y-0 gap-0 overflow-y-auto rounded-none border-none p-0 shadow-2xl sm:top-1/2 sm:left-1/2 sm:h-auto sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[2.5rem]">
          <div className="p-6 md:p-8">
            <DialogHeader className="mb-6">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400">
                <FileSpreadsheet className="h-9 w-9" />
              </div>
              <DialogTitle className="text-2xl font-black tracking-tight text-foreground">
                Export Laporan Absensi
              </DialogTitle>
              <DialogDescription className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Pilih format dan lingkup data yang ingin Anda ekspor ke Excel.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <div className="rounded-[1.5rem] border border-border bg-muted/30 p-5">
                <p className="mb-4 text-[10px] font-black tracking-[0.2em] text-muted-foreground uppercase">
                  Ringkasan Ekspor
                </p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground/70">
                      Cakupan Data
                    </span>
                    <span className="text-xs font-bold text-teal-600">
                      {exportAllClasses
                        ? "Semua Kelas"
                        : filterKelas === "Semua Kelas"
                          ? classes[0] || "Semua Kelas"
                          : filterKelas || "Semua Kelas"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground/70">
                      Periode
                    </span>
                    <span className="text-xs font-bold text-teal-600">
                      {displayDateStr}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground/70">
                      Format
                    </span>
                    <span className="text-xs font-bold text-teal-600">
                      Excel (.xlsx)
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <AbsensiExportButton
                  kelas={
                    filterKelas === "Semua Kelas"
                      ? classes[0] || ""
                      : filterKelas
                  }
                  tahunPelajaran="2025/2026"
                  className="w-full"
                  exportAllClasses={exportAllClasses}
                  onExportAllClassesChange={setExportAllClasses}
                />
                <Button
                  variant="ghost"
                  onClick={() => setShowExportModal(false)}
                  className="h-14 w-full rounded-2xl text-sm font-bold text-muted-foreground transition-all hover:bg-muted/50 hover:text-foreground"
                >
                  Batal
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-[320px] rounded-3xl p-6">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-xl font-bold">
                Konfirmasi Hapus
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {deletingId
                  ? "Anda yakin ingin menghapus record absensi ini? Tindakan ini tidak dapat dibatalkan."
                  : `Anda yakin ingin menghapus ${selected.size} record absensi? Tindakan ini tidak dapat dibatalkan.`}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-6 flex w-full gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
                className="rounded-2x flex-1 border-border py-6 font-semibold"
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                className="rounded-2x flex-1 bg-red-600 py-6 font-semibold text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
              >
                Hapus
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminShell>
  )
}
