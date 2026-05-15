/* eslint-disable react-hooks/set-state-in-effect */
"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { AdminShell } from "../_components/AdminShell"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { AbsensiExportButton } from "@/components/AbsensiExportButton"
import {
  Users,
  Search,
  Clock,
  XCircle,
  UserCheck,
  RefreshCw,
  HelpCircle,
  CalendarDays,
  LucideIcon,
  Filter,
  Calendar,
  MoreHorizontal,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

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

const KELAS_LIST = [
  "X RPL A",
  "X RPL B",
  "X RPL C",
  "XI IPA 1",
  "XI IPA 2",
  "XI IPS 1",
  "XI RPL A",
  "XII RPL B",
  "XII IPS 2",
]

const TABS = ["Semua", "Hadir", "Haid", "Tidak Hadir", "Belum Absen"] as const
type Tab = (typeof TABS)[number]

const TAB_TO_STATUS: Record<Tab, AbsenStatus | null> = {
  Semua: null,
  Hadir: "hadir",
  Haid: "haid",
  "Tidak Hadir": "tidak_hadir",
  "Belum Absen": "belum_absen",
}

export default function MonitoringPage() {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [absensi, setAbsensi] = useState<AbsensiRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterKelas, setFilterKelas] = useState("X RPL A")
  const [activeTab, setActiveTab] = useState<Tab>("Semua")
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  )
  const [refreshing, setRefreshing] = useState(false)
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  const fetchData = useCallback(async () => {
    setRefreshing(true)
    try {
      const usersRes = await fetch("/api/users")
      const usersData = (await usersRes.json()) as UserRecord[]

      const absensiRes = await fetch("/api/absensi")
      const allAbsensi = (await absensiRes.json()) as AbsensiRecord[]

      const dateAbsensi = allAbsensi.filter(
        (a: AbsensiRecord) => a.tanggal === selectedDate
      )

      if (isMounted.current) {
        setUsers(usersData)
        setAbsensi(dateAbsensi)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      if (isMounted.current) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [selectedDate])

  useEffect(() => {
    fetchData()
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
    return monitoringData.filter((item) => {
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
  }, [monitoringData, search, filterKelas, activeTab])

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

  const hadirPct =
    summary.total > 0 ? Math.round((summary.hadir / summary.total) * 100) : 0

  const displayDateStr = new Date(selectedDate).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  const resetFilters = () => {
    setSearch("")
    setFilterKelas("X RPL A")
    setActiveTab("Semua")
    setSelectedDate(new Date().toISOString().split("T")[0])
  }

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
            <p className="text-xs text-teal-100">Monitoring Kelas</p>
            <h2 className="mt-0.5 text-xl font-black text-white">
              Kehadiran Siswa —{" "}
              {selectedDate === new Date().toISOString().split("T")[0]
                ? "Hari Ini"
                : "Arsip"}
            </h2>
            <p className="mt-1 text-xs text-teal-200">{displayDateStr}</p>
          </div>
          <div className="relative z-10 flex items-center gap-3">
            <div className="hidden flex-col items-center gap-0.5 rounded-2xl border border-white/15 bg-white/10 px-5 py-3 backdrop-blur-sm sm:flex">
              <span className="text-2xl leading-none font-black text-white">
                {hadirPct}%
              </span>
              <span className="text-[10px] text-teal-200">Tingkat Hadir</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Calendar className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-teal-100" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="h-9 cursor-pointer rounded-xl border border-white/20 bg-white/15 pr-3 pl-8 text-xs font-bold text-white backdrop-blur-sm transition-all outline-none hover:bg-white/25"
                />
              </div>
              <button
                onClick={fetchData}
                disabled={refreshing}
                className="flex h-9 items-center gap-2 rounded-xl border border-white/20 bg-white/15 px-4 text-xs font-bold text-white backdrop-blur-sm transition-all hover:bg-white/25 disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* ── Summary cards ── */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
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
              value: summary.tidakHadir,
              icon: XCircle,
              color: "text-destructive",
              bg: "border-destructive/20",
              iconBg: "bg-destructive/10",
            },
            {
              label: "Belum Absen",
              value: summary.belumAbsen,
              icon: HelpCircle,
              color: "text-slate-500",
              bg: "border-slate-200",
              iconBg: "bg-slate-100 dark:bg-slate-800",
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
          <div className="flex flex-col border-b border-border/50">
            <div className="flex flex-col gap-3 px-5 pt-4 pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-foreground">
                    Status Kehadiran Per Kelas
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Menampilkan {filteredData.length} siswa
                    {(search ||
                      filterKelas !== "X RPL A" ||
                      activeTab !== "Semua") && (
                      <button
                        onClick={resetFilters}
                        className="ml-2 inline-flex items-center gap-0.5 font-semibold text-primary hover:underline"
                      >
                        {/* <X className="h-3 w-3" /> Reset filter */}
                      </button>
                    )}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Cari nama, NIS, kelas..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="h-9 w-52 rounded-xl border-border bg-muted/50 pl-8 text-xs focus-visible:ring-primary"
                    />
                  </div>

                  {/* Status Filter Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-9 gap-2 rounded-xl border-border bg-muted/50 text-xs font-semibold text-muted-foreground"
                      >
                        <Filter className="h-3.5 w-3.5" />
                        {activeTab}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-44 rounded-xl"
                    >
                      {TABS.map((tab) => (
                        <DropdownMenuItem
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                        >
                          {tab}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Export Excel per Kelas */}
                  <AbsensiExportButton
                    kelas="X TEKNIK LOGISTIK (TL) - A"
                    tahunPelajaran="2025/2026"
                  />
                </div>
              </div>
            </div>

            {/* ─ Tabs (Kelas Filter) ─ */}
            <div className="no-scrollbar flex items-center overflow-x-auto border-t border-border/50 bg-muted/5 px-5">
              <div className="flex items-center">
                {KELAS_LIST.map((kelas) => (
                  <button
                    key={kelas}
                    onClick={() => setFilterKelas(kelas)}
                    className={`relative px-4 py-3 text-[11px] font-bold tracking-wider whitespace-nowrap uppercase transition-colors ${
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

          {/* ─ Table ─ */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-muted/30 text-[10px] font-black tracking-widest text-muted-foreground uppercase">
                  <th className="px-5 py-3">Siswa</th>
                  <th className="px-5 py-3">Tanggal dan Waktu</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
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
                ) : filteredData.length > 0 ? (
                  filteredData.map((item) => (
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
        </div>
      </div>
    </AdminShell>
  )
}
