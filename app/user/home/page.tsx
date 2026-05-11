/* eslint-disable react-hooks/set-state-in-effect */
"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import ClockWIB from "@/components/mycomponent/clock"
import { CheckCircle2, QrCode, Clock, AlignLeft, LogOut } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ModeButton } from "@/components/mode-button"
import { TEST_CONFIG, isWithinTimeRestriction } from "@/lib/test-config"

// ─── Types ────────────────────────────────────────────────────────────────────
type Status = "hadir" | "tidak_hadir" | "haid"

interface RiwayatItem {
  id: number
  tanggal: string
  hari: string
  waktu: string
  status: Status
  nama?: string
  nis?: string
  kelas?: string
  users?: {
    nama: string
    nis: string
    kelas: string
  }
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
  } | null
}

interface UserSession {
  id: string | number
  nama: string
  kelas: string
  role?: string
}

// ─── Config ───────────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<Status, string> = {
  hadir: "Hadir",
  tidak_hadir: "Tidak Hadir",
  haid: "Haid",
}

const STATUS_STYLE: Record<Status, string> = {
  hadir: "bg-primary/10 text-primary border-primary/20",
  tidak_hadir: "bg-destructive/10 text-destructive border-destructive/20",
  haid: "bg-blue-500/10 text-blue-500 border-blue-500/20",
}

const STATUS_DOT: Record<Status, string> = {
  hadir: "bg-primary",
  tidak_hadir: "bg-destructive",
  haid: "bg-blue-500",
}

const getHari = (tanggal: string) => {
  if (!tanggal || tanggal === "—") return "—"

  const [y, m, d] = tanggal.split("-").map(Number)
  const date = new Date(y, m - 1, d)

  return date.toLocaleDateString("id-ID", {
    weekday: "long",
  })
}

function getSummary(data: RiwayatItem[]) {
  return {
    hadir: data.filter((d) => d.status === "hadir").length,
    haid: data.filter((d) => d.status === "haid").length,
    tidak_hadir: data.filter((d) => d.status === "tidak_hadir").length,
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function UserHomePage() {
  const router = useRouter()
  const [data, setData] = useState<RiwayatItem[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<UserSession | null>(null)
  const [sudahAbsen, setSudahAbsen] = useState(false)
  const [now, setNow] = useState<Date | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setNow(new Date())
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const isTimeAllowed = mounted && now ? isWithinTimeRestriction(now) : true
  const shouldDisableButton =
    (sudahAbsen && TEST_CONFIG.ENABLE_ONE_TIME_SCAN) ||
    (mounted && !isTimeAllowed)

  const summary = getSummary(data)

  const fetchData = useCallback(async (userId: string | number) => {
    setLoading(true)
    try {
      // 🔥 1. ambil riwayat
      const res = await fetch(`/api/absensi?user_id=${userId}`)
      const result = await res.json()

      const formatted: RiwayatItem[] = (result as AbsensiResponse[])
        .map((r) => {
          let rawStatus = (r.status || "").trim().toLowerCase()
          if (rawStatus === "tidak hadir") rawStatus = "tidak_hadir"

          const tanggal = r.tanggal ?? "—"

          return {
            id: r.id,
            nama: r.users?.nama || "Tidak diketahui",
            nis: r.users?.nis || "—",
            kelas: r.users?.kelas || "—",
            tanggal,
            hari: getHari(tanggal),
            waktu: r.waktu ?? "—",
            status: (["hadir", "haid", "tidak_hadir"].includes(rawStatus)
              ? rawStatus
              : "tidak_hadir") as Status,
          }
        })
        .sort((a, b) => {
          const dateA = new Date(a.tanggal).getTime()
          const dateB = new Date(b.tanggal).getTime()
          if (dateB !== dateA) return dateB - dateA
          return b.waktu.localeCompare(a.waktu)
        })

      setData(formatted)

      // 🔥 2. cek ke DB
      const resToday = await fetch(`/api/absensi/today?user_id=${userId}`)
      const todayResult = await resToday.json()

      setSudahAbsen(todayResult.sudahAbsen)
    } catch (err) {
      console.error("Error fetching data:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    const sessionStr = localStorage.getItem("siswa_session")
    if (!sessionStr) {
      router.push("/")
      return
    }

    const session: UserSession = JSON.parse(sessionStr)
    if (isMounted) {
      setUser(session)
      fetchData(session.id)
    }

    return () => {
      isMounted = false
    }
  }, [router, fetchData])

  function handleLogout(): void {
    localStorage.removeItem("siswa_session")
    router.push("/")
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-background">
      {/* ── Header Banner ── */}
      <div
        className="relative w-full max-w-md overflow-hidden rounded-b-[2rem] px-5 pt-10 pb-8 shadow-lg shadow-teal-900/10"
        style={{
          background: "linear-gradient(135deg, #0d9488 0%, #0891b2 100%)",
        }}
      >
        {/* Decorative circles */}
        <div
          aria-hidden
          className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10"
        />
        <div
          aria-hidden
          className="absolute -bottom-5 -left-7.5 h-25 w-25 rounded-full bg-white/5"
        />

        {/* User Info */}
        <div className="relative z-10 flex items-center gap-3">
          <Avatar className="h-12 w-12 ring-2 ring-white/40 ring-offset-1 ring-offset-teal-600">
            <AvatarFallback className="bg-teal-700 font-bold text-white">
              {user?.nama?.substring(0, 2).toUpperCase() || "..."}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base leading-tight font-semibold text-white">
              {user?.nama || "Memuat..."}
            </h1>
            <p className="text-xs text-teal-50">{user?.kelas || "..."}</p>
            <ClockWIB />
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-xl bg-white/15 p-2 transition-colors outline-none hover:bg-white/25">
                  <AlignLeft className="h-5 w-5 text-white" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="w-56 rounded-2xl border border-border bg-card p-1.5 shadow-xl"
              >
                {/* Header info user */}
                <DropdownMenuLabel className="px-3 py-2">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">
                        {user?.nama?.substring(0, 2).toUpperCase() || "..."}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-foreground">
                        {user?.nama || "Memuat..."}
                      </p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {user?.kelas || "..."}
                      </p>
                    </div>
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator className="bg-border/50" />
                <ModeButton />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="text-sm font-medium">Keluar</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Dzuhur Status Card */}
        <div className="relative z-10 mt-5 flex items-center justify-between rounded-2xl border border-white/25 bg-white/20 p-4 backdrop-blur-md">
          <div>
            <p className="mb-0.5 text-[10px] font-semibold tracking-widest text-teal-50 uppercase">
              Absensi Sholat
            </p>
            <p className="text-2xl leading-none font-black text-white">
              Dzuhur
            </p>
            <div className="mt-1.5 flex items-center gap-1">
              <Clock className="h-3 w-3 text-teal-100" />
              <p className="text-xs text-teal-50">12:00 - 13:00 WIB</p>
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="flex flex-col items-center gap-1.5">
              {loading ? (
                // ── Loading ──
                <div className="flex flex-col items-center gap-1">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/20">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                  </div>
                  <span className="text-[10px] text-teal-50/50">
                    Mengecek...
                  </span>
                </div>
              ) : sudahAbsen && TEST_CONFIG.ENABLE_ONE_TIME_SCAN ? (
                // ── Sudah absen hari ini ──
                <div className="flex flex-col items-center gap-1">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-400/20 ring-2 ring-emerald-300/50">
                    <CheckCircle2 className="h-6 w-6 text-emerald-300 drop-shadow" />
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-200">
                    Sudah Absen
                  </span>
                </div>
              ) : (
                // ── Belum absen hari ini ──
                <div className="flex flex-col items-center gap-1">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-white/40 bg-white/10">
                    <Clock className="h-5 w-5 text-white/60" />
                  </div>
                  <span className="text-[10px] text-teal-50/70">
                    Belum Absen
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex w-full max-w-md flex-col gap-5 px-4 pt-5 pb-10">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: "Hadir",
              count: summary.hadir,
              color: "text-primary",
              bg: "bg-primary/10 border-primary/20",
            },
            {
              label: "Haid",
              count: summary.haid,
              color: "text-blue-500",
              bg: "bg-blue-500/10 border-blue-500/20",
            },
            {
              label: "Tidak Hadir",
              count: summary.tidak_hadir,
              color: "text-destructive",
              bg: "bg-destructive/10 border-destructive/20",
            },
          ].map(({ label, count, color, bg }) => (
            <div
              key={label}
              className={`flex flex-col items-center rounded-2xl border py-3 ${bg}`}
            >
              <span className={`text-2xl leading-none font-black ${color}`}>
                {count}
              </span>
              <span className="mt-1 text-center text-[10px] leading-tight text-muted-foreground">
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* ── Tombol Scan QR ── */}
        <div className="flex flex-col gap-2">
          <Button
            onClick={() => router.push("/user/scan")}
            disabled={mounted ? shouldDisableButton : false}
            className={`flex h-16 w-full items-center justify-center gap-3 rounded-2xl text-base font-bold transition-all duration-200 ${
              mounted && shouldDisableButton
                ? "cursor-not-allowed bg-muted text-muted-foreground"
                : "bg-[linear-gradient(135deg,#0d9488_0%,#0891b2_100%)] text-white shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98]"
            } `}
          >
            <QrCode
              className={`h-6 w-6 ${mounted && shouldDisableButton ? "text-muted-foreground" : "text-white"}`}
            />
            {!mounted ? (
              <span className="font-semibold">Scan QR untuk Absen</span>
            ) : !isTimeAllowed ? (
              <span className="font-semibold">
                Absensi Hanya Jumat 12:00-14:00
              </span>
            ) : sudahAbsen && TEST_CONFIG.ENABLE_ONE_TIME_SCAN ? (
              <span className="font-semibold">Sudah Absen Hari Ini</span>
            ) : (
              <span className="font-semibold">Scan QR untuk Absen</span>
            )}
          </Button>

          {!mounted ? (
            <p className="text-center text-xs text-muted-foreground">
              Arahkan kamera ke QR Code yang tersedia di masjid
            </p>
          ) : !isTimeAllowed ? (
            <p className="text-center text-xs font-semibold text-destructive">
              Absensi hanya tersedia pada hari Jumat pukul 12:00 - 14:00 WIB
            </p>
          ) : sudahAbsen && TEST_CONFIG.ENABLE_ONE_TIME_SCAN ? (
            <p className="text-center text-xs font-semibold text-primary">
              Anda Sudah Absen
            </p>
          ) : (
            <p className="text-center text-xs text-muted-foreground">
              Arahkan kamera ke QR Code yang tersedia di masjid
            </p>
          )}
        </div>

        <Separator className="bg-border" />

        {/* ── Riwayat ── */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">
              Riwayat Absensi Dzuhur
            </h2>
          </div>

          <div className="flex flex-col gap-2">
            {loading ? (
              // Skeleton loading
              [1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-20 w-full animate-pulse rounded-2xl bg-muted"
                />
              ))
            ) : data.length > 0 ? (
              data.map((r) => (
                <Card
                  key={r.id}
                  className="rounded-2xl border border-border bg-card shadow-sm"
                >
                  <CardContent className="flex items-center gap-3 px-4 py-3">
                    <div
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_DOT[r.status]}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-tight font-semibold text-foreground">
                        {r.hari}, {r.tanggal}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {r.waktu !== "—"
                          ? `Absen pukul ${r.waktu} WIB`
                          : "Tidak ada catatan"}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`shrink-0 rounded-lg border px-2.5 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[r.status]}`}
                    >
                      {STATUS_LABEL[r.status]}
                    </Badge>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Clock className="h-6 w-6 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  Belum ada riwayat absensi
                </p>
                <p className="mt-1 text-xs text-muted-foreground/60">
                  Data absensi kamu akan muncul di sini
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
