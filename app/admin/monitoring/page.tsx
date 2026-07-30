/* eslint-disable react-hooks/set-state-in-effect */
"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { AdminShell } from "../_components/AdminShell"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Users,
  Search,
  Clock,
  XCircle,
  UserCheck,
  HelpCircle,
  CalendarDays,
  LucideIcon,
  Filter,
  MoreHorizontal,
  FileSpreadsheet,
  Download,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react"
import { FilterModal } from "@/components/FilterModal"
import { AttendanceBanner } from "@/components/AttendanceBanner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { AbsensiExportButton } from "@/components/AbsensiExportButton"

// ─── Types ────────────────────────────────────────────────────────────────────
type AbsenStatus = "hadir" | "haid" | "tidak_hadir" | "belum_absen"

interface UserRecord {
  id: number
  nama: string
  kelas: string
  nis: string
}

interface AbsensiRecord {
  user_id: number
  status: string
  nis: string
  nama: string
  jenis_kelamin: string
  waktu: string
  tanggal: string
}

const STATUS_META: Record<
  AbsenStatus,
  {
    label: string
    dot: string
    badge: string
    color: string
    bg: string
    icon: LucideIcon
  }
> = {
  hadir: {
    label: "Hadir",
    dot: "bg-primary",
    badge: "bg-primary/10 text-primary border-primary/20",
    color: "text-primary",
    bg: "bg-primary/10",
    icon: UserCheck,
  },
  haid: {
    label: "Haid",
    dot: "bg-blue-400",
    badge: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    icon: Clock,
  },
  tidak_hadir: {
    label: "Tidak Hadir",
    dot: "bg-destructive",
    badge: "bg-destructive/10 text-destructive border-destructive/20",
    color: "text-destructive",
    bg: "bg-destructive/10",
    icon: XCircle,
  },
  belum_absen: {
    label: "Belum Absen",
    dot: "bg-slate-400",
    badge:
      "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
    color: "text-slate-500",
    bg: "bg-slate-100 dark:bg-slate-800",
    icon: HelpCircle,
  },
}

type Tab = "Semua" | "Hadir" | "Haid" | "Tidak Hadir" | "Belum Absen"

const TAB_TO_STATUS: Record<Tab, AbsenStatus | null> = {
  Semua: null,
  Hadir: "hadir",
  Haid: "haid",
  "Tidak Hadir": "tidak_hadir",
  "Belum Absen": "belum_absen",
}

export default function MonitoringPage() {
  const router = useRouter()
  const [checkingSession, setCheckingSession] = useState(true)
  const [users, setUsers] = useState<UserRecord[]>([])
  const [absensi, setAbsensi] = useState<AbsensiRecord[]>([])
  const [classes, setClasses] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterKelas, setFilterKelas] = useState("")
  const [activeTab, setActiveTab] = useState<Tab>("Semua")
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  )
  const [selectedSort, setSelectedSort] = useState("nama-asc")
  const [, setRefreshing] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportAllClasses, setExportAllClasses] = useState(false)
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [perPage, setPerPage] = useState(10)
  const [page, setPage] = useState(1)
  const isMounted = useRef(true)

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

  // ── Dynamic Row Calculation ────────────────────────────────────────────────
  useEffect(() => {
    const calculateRows = () => {
      // Estimasi non-tabel: ~530px
      const availableHeight = window.innerHeight - 530
      const rowHeight = 62
      const estimatedRows = Math.max(5, Math.floor(availableHeight / rowHeight))
      setPerPage(estimatedRows)
    }
    calculateRows()
    window.addEventListener("resize", calculateRows)
    return () => window.removeEventListener("resize", calculateRows)
  }, [])

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  const fetchData = useCallback(async () => {
    setRefreshing(true)
    try {
      const [usersRes, absensiRes, classesRes] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/absensi"),
        fetch("/api/classes"),
      ])

      const rawUsersData = await usersRes.json()
      const rawAbsensiData = await absensiRes.json()
      const usersData = Array.isArray(rawUsersData)
        ? (rawUsersData as UserRecord[])
        : []
      const allAbsensi = Array.isArray(rawAbsensiData)
        ? (rawAbsensiData as AbsensiRecord[])
        : []
      const classesData = await classesRes.json()

      const dateAbsensi = allAbsensi.filter(
        (a: AbsensiRecord) => a.tanggal === selectedDate
      )

      if (isMounted.current) {
        setUsers(usersData)
        setAbsensi(dateAbsensi)
        if (classesData.classes) {
          setClasses(classesData.classes)
          if (!filterKelas && classesData.classes.length > 0) {
            setFilterKelas(classesData.classes[0])
          }
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      if (isMounted.current) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [selectedDate, filterKelas])

  useEffect(() => {
    fetchData()

    // Auto refresh setiap 30 detik
    const interval = setInterval(() => {
      fetchData()
    }, 10000)

    return () => clearInterval(interval)
  }, [fetchData])

  const monitoringData = useMemo(() => {
    const now = new Date()
    const todayStr = now.toISOString().split("T")[0]
    const isPastDeadline =
      selectedDate < todayStr ||
      (selectedDate === todayStr && now.getHours() >= 14)

    return users.map((user) => {
      const userAbsen = absensi.find((a) => a.user_id === user.id)

      let status: AbsenStatus =
        (userAbsen?.status as AbsenStatus) || "belum_absen"

      // Jika sudah lewat jam 14:00 di hari Jumat (atau hari Jumat yang sudah lewat)
      // maka yang belum absen dianggap "tidak_hadir"
      if (status === "belum_absen" && isPastDeadline) {
        status = "tidak_hadir"
      }

      return {
        ...user,
        status,
        waktu: userAbsen?.waktu || "—",
        tanggal: userAbsen?.tanggal || selectedDate,
      }
    })
  }, [users, absensi, selectedDate])

  const filteredData = useMemo(() => {
    const filtered = monitoringData.filter((item) => {
      const matchesSearch =
        !search ||
        item.nama.toLowerCase().includes(search.toLowerCase()) ||
        item.nis.toString().includes(search) ||
        item.kelas.toLowerCase().includes(search.toLowerCase())
      const matchesKelas = item.kelas === filterKelas
      const matchTab =
        TAB_TO_STATUS[activeTab] === null ||
        item.status === TAB_TO_STATUS[activeTab]
      return matchesSearch && matchesKelas && matchTab
    })

    // Sorting
    return [...filtered].sort((a, b) => {
      const [sortBy, sortOrder] = selectedSort.split("-") as [
        "nama" | "waktu" | "kelas",
        "asc" | "desc",
      ]
      let comparison = 0
      switch (sortBy) {
        case "nama":
          comparison = a.nama.localeCompare(b.nama, "id-ID")
          break
        case "kelas":
          comparison = a.kelas.localeCompare(b.kelas, "id-ID")
          break
        case "waktu":
          // Handle cases where waktu is "—"
          if (a.waktu === "—" && b.waktu === "—") comparison = 0
          else if (a.waktu === "—") comparison = 1
          else if (b.waktu === "—") comparison = -1
          else comparison = a.waktu.localeCompare(b.waktu, "id-ID")
          break
      }
      return sortOrder === "asc" ? comparison : -comparison
    })
  }, [monitoringData, search, filterKelas, activeTab, selectedSort])

  const totalPages = Math.max(1, Math.ceil(filteredData.length / perPage))
  const paginated = filteredData.slice((page - 1) * perPage, page * perPage)

  const summary = useMemo(() => {
    const total = filteredData.length
    const hadir = filteredData.filter((d) => d.status === "hadir").length
    const haid = filteredData.filter((d) => d.status === "haid").length
    const tidakHadir = filteredData.filter(
      (d) => d.status === "tidak_hadir"
    ).length
    const belumAbsen = filteredData.filter(
      (d) => d.status === "belum_absen"
    ).length

    return { total, hadir, haid, tidakHadir, belumAbsen }
  }, [filteredData])

  const activeFilterCount = [
    search !== "",
    activeTab !== "Semua",
    selectedDate !== new Date().toISOString().split("T")[0],
  ].filter(Boolean).length

  const resetFilters = () => {
    setSearch("")
    setActiveTab("Semua")
    setSelectedDate(new Date().toISOString().split("T")[0])
    setSelectedSort("nama-asc")
    setPage(1)
  }

  const displayDateStr = new Date(selectedDate).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  const handleStatusChange = async (userId: number, newStatus: AbsenStatus) => {
    try {
      setRefreshing(true)

      const sessionStr = localStorage.getItem("admin_session")
      const session = sessionStr ? JSON.parse(sessionStr) : null
      const adminId = session?.id || null

      const res = await fetch("/api/qr/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          status: newStatus === "haid" ? "berhalangan" : "hadir",
          tanggal: selectedDate, // Kirim tanggal yang sedang dilihat
          admin_id: adminId, // Kirim ID admin yang merubah
          qr_token: "MANUAL_UPDATE", // Flag untuk update manual oleh admin
        }),
      })

      if (!res.ok) {
        const result = await res.json()
        throw new Error(result.error || "Gagal memperbarui status")
      }

      // Refresh data setelah update
      await fetchData()
    } catch (err: unknown) {
      console.error(err)
      alert(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setRefreshing(false)
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
          title={
            selectedDate === new Date().toISOString().split("T")[0]
              ? "Monitoring Siswa Rohis"
              : "Arsip Kehadiran Rohis"
          }
          subtitle="Data Siswa"
          date={displayDateStr}
          totalLabel="Total Siswa"
          summary={{
            total: summary.total,
            hadir: summary.hadir,
            haid: summary.haid,
            tidak_hadir: summary.tidakHadir,
            belum_absen: summary.belumAbsen,
          }}
        />

        {/* ── Summary cards ── */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
          {[
            {
              label: "Total Siswa",
              value: summary.total,
              sub: "Total absensi tercatat",
              icon: Users,
              color: "text-slate-700 dark:text-slate-200",
              bg: "bg-white hover:border-slate-300/70 dark:bg-card",
              iconBg:
                "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
            },
            {
              label: "Hadir",
              value: summary.hadir,
              sub: "Hadir hari ini",
              icon: UserCheck,
              color: "text-teal-600 dark:text-teal-400",
              bg: "bg-white hover:border-teal-300/70 dark:bg-card",
              iconBg:
                "bg-teal-500/10 text-teal-600 dark:bg-teal-400/10 dark:text-teal-400",
            },
            {
              label: "Haid",
              value: summary.haid,
              sub: "Berhalangan sholat",
              icon: Clock,
              color: "text-blue-600 dark:text-blue-400",
              bg: "bg-white hover:border-blue-300/70 dark:bg-card",
              iconBg:
                "bg-blue-500/10 text-blue-600 dark:bg-blue-400/10 dark:text-blue-400",
            },
            {
              label: "Tidak Hadir",
              value: summary.tidakHadir,
              sub: "Alpa / Izin / Sakit",
              icon: XCircle,
              color: "text-rose-600 dark:text-rose-400",
              bg: "bg-white hover:border-rose-300/70 dark:bg-card",
              iconBg:
                "bg-rose-500/10 text-rose-600 dark:bg-rose-400/10 dark:text-rose-400",
            },
            {
              label: "Belum Absen",
              value: summary.belumAbsen,
              sub: "Belum mengisi presensi",
              icon: HelpCircle,
              color: "text-amber-600 dark:text-amber-400",
              bg: "bg-white hover:border-amber-300/70 dark:bg-card",
              iconBg:
                "bg-amber-500/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400",
            },
          ].map(
            ({ label, value, sub, icon: Icon, color, bg, iconBg }, index) => (
              <div
                key={label}
                className={`group flex min-h-[184px] flex-col items-center justify-center rounded-[28px] border border-slate-200/80 p-4 text-center shadow-[0_4px_18px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_24px_rgba(15,23,42,0.12)] sm:min-h-[200px] sm:p-5 dark:border-border/80 ${bg} ${
                  index === 0 ? "col-span-2 md:col-span-1" : ""
                }`}
              >
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110 sm:h-16 sm:w-16 ${iconBg}`}
                >
                  <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
                </div>
                <div className="mt-5 space-y-2">
                  <p
                    className={`text-4xl leading-none font-black tracking-tight sm:text-5xl ${color}`}
                  >
                    {value}
                  </p>
                  <p className="text-base font-bold text-foreground">{label}</p>
                </div>
                <div className="mt-2 max-w-[140px]">
                  <p className="text-xs leading-relaxed font-medium text-muted-foreground sm:text-sm">
                    {sub}
                  </p>
                </div>
              </div>
            )
          )}
        </div>

        {/* ── Table card ── */}
        <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {/* ─ Toolbar ─ */}
          <div className="flex flex-col border-b border-border/50">
            <div className="flex flex-col gap-4 border-b border-border/50 px-5 pt-5 pb-5">
              {/* Judul & Statistik */}
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Status Kehadiran Per Kelas
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Menampilkan {filteredData.length} siswa
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
                    style={{
                      borderColor:
                        activeFilterCount > 0
                          ? "var(--color-primary)"
                          : "var(--color-border)",
                      color:
                        activeFilterCount > 0
                          ? "var(--color-primary)"
                          : "inherit",
                    }}
                  >
                    <Filter className="h-4 w-4 transition-colors duration-200 group-hover:text-[#0d9488]" />
                    Filter
                    {activeFilterCount > 0 && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-black text-primary-foreground">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>

                  <Button
                    onClick={() => {
                      setExportAllClasses(false)
                      setShowExportModal(true)
                    }}
                    className="h-11 flex-1 gap-2 rounded-xl bg-teal-600 text-xs font-bold text-white shadow-sm shadow-teal-500/20 hover:bg-teal-700 md:w-40 md:flex-none"
                  >
                    <Download className="h-4 w-4" />
                    Export Data
                  </Button>
                </div>
              </div>
            </div>

            <div className="no-scrollbar flex items-center border-b border-border/50 px-5">
              <div className="flex items-center">
                {classes.map((kelas) => (
                  <button
                    key={kelas}
                    onClick={() => {
                      setFilterKelas(kelas)
                      setPage(1)
                    }}
                    className={`relative px-4 py-3 text-xs font-bold transition-colors ${
                      filterKelas === kelas
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {kelas}
                    {filterKelas === kelas && (
                      <div className="absolute right-0 bottom-0 left-0 h-0.5 bg-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ─ Mobile Card List ─ */}
          <div className="flex flex-col divide-y divide-border/50 md:hidden">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-muted" />
                      <div className="space-y-2">
                        <div className="h-3 w-32 rounded bg-muted" />
                        <div className="h-2 w-20 rounded bg-muted" />
                      </div>
                    </div>
                    <div className="h-6 w-16 rounded-lg bg-muted" />
                  </div>
                </div>
              ))
            ) : paginated.length > 0 ? (
              paginated.map((item) => {
                const statusMeta = STATUS_META[item.status]
                const StatusIcon = statusMeta.icon

                return (
                  <div
                    key={item.id}
                    className="p-3 transition-colors active:bg-muted/50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                          <AvatarFallback className="bg-primary/10 text-[10px] font-bold text-primary">
                            {item.nama.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-sm leading-tight font-bold text-foreground">
                            {item.nama}
                          </p>
                          <p className="mt-1 text-[10px] font-medium text-muted-foreground">
                            {item.nis} • {item.kelas}
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
                                handleStatusChange(item.id, key as AbsenStatus)
                              }
                              className="flex cursor-pointer items-center gap-2 rounded-lg text-xs"
                            >
                              <div
                                className={`h-2 w-2 rounded-full ${meta.dot}`}
                              />
                              {meta.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className={`rounded-lg border px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase ${statusMeta.badge}`}
                      >
                        <StatusIcon className="mr-1.5 h-3 w-3" />
                        {statusMeta.label}
                      </Badge>

                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-foreground">
                          <Clock
                            className={`h-2.5 w-2.5 ${item.status === "belum_absen" ? "text-slate-400" : "text-primary"}`}
                          />
                          {item.waktu === "—"
                            ? "Belum absen"
                            : `${item.waktu} WIB`}
                        </div>
                        <div className="flex items-center gap-1.5 text-[8px] text-muted-foreground">
                          <CalendarDays className="h-2.5 w-2.5" />
                          {item.tanggal}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="py-12 text-center">
                <Search className="mx-auto h-8 w-8 text-muted/30" />
                <p className="mt-2 text-sm font-bold text-foreground">
                  Tidak ada data
                </p>
                {activeFilterCount > 0 && (
                  <button
                    onClick={resetFilters}
                    className="mt-2 text-xs font-bold text-primary hover:underline"
                  >
                    Reset filter
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ─ Table (Desktop & Tablet) ─ */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-muted/30 text-[10px] font-black tracking-widest text-muted-foreground uppercase">
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
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-muted" />
                          <div className="space-y-2">
                            <div className="h-3 w-32 rounded bg-muted" />
                            <div className="h-2 w-20 rounded bg-muted" />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-3 w-16 rounded bg-muted" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-5 w-20 rounded-lg bg-muted" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="ml-auto h-3 w-24 rounded bg-muted" />
                      </td>
                    </tr>
                  ))
                ) : paginated.length > 0 ? (
                  paginated.map((item) => (
                    <tr
                      key={item.id}
                      className="group transition-colors hover:bg-muted/40"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 border-2 border-background">
                            <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                              {item.nama.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-bold text-foreground">
                              {item.nama}
                            </p>
                            <p className="text-[10px] font-medium text-muted-foreground">
                              {item.nis} • {item.kelas}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                            <Clock
                              className={`h-3 w-3 ${item.status === "belum_absen" ? "text-slate-400" : "text-primary"}`}
                            />
                            {item.waktu === "—"
                              ? "Belum absen"
                              : `${item.status === "belum_absen" ? "Belum absen" : item.waktu} WIB`}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <CalendarDays className="h-3 w-3" />
                            {item.tanggal}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge
                          variant="outline"
                          className={`rounded-lg border px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${STATUS_META[item.status].badge}`}
                        >
                          {STATUS_META[item.status].label}
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
                                  handleStatusChange(
                                    item.id,
                                    key as AbsenStatus
                                  )
                                }
                                className="flex cursor-pointer items-center gap-2 rounded-lg text-xs"
                              >
                                <div
                                  className={`h-2 w-2 rounded-full ${meta.dot}`}
                                />
                                {meta.label}
                              </DropdownMenuItem>
                            ))}
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
        title="Filter Monitoring"
        description="Filter data monitoring kehadiran sesuai kriteria"
        startDate={selectedDate}
        onStartDateChange={(val) => {
          setSelectedDate(val)
          setPage(1)
        }}
        statuses={[
          { value: "Semua", label: "Semua" },
          { value: "Hadir", label: "Hadir" },
          { value: "Haid", label: "Haid" },
          { value: "Tidak Hadir", label: "Tidak Hadir" },
          { value: "Belum Absen", label: "Belum Absen" },
        ]}
        selectedStatus={activeTab}
        onStatusChange={(val) => {
          setActiveTab((val || "Semua") as Tab)
          setPage(1)
        }}
        sortOptions={[
          { value: "nama-asc", label: "Nama (A-Z)" },
          { value: "nama-desc", label: "Nama (Z-A)" },
          { value: "kelas-asc", label: "Kelas (A-Z)" },
          { value: "kelas-desc", label: "Kelas (Z-A)" },
          { value: "waktu-desc", label: "Waktu (Terbaru)" },
          { value: "waktu-asc", label: "Waktu (Terlama)" },
        ]}
        selectedSort={selectedSort}
        onSortChange={(val) => {
          setSelectedSort(val)
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
                  kelas={filterKelas}
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
    </AdminShell>
  )
}
