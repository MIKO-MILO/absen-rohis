/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/immutability */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import ClockWIB from "@/components/mycomponent/clock"
import {
  CheckCircle2,
  QrCode,
  Clock,
  AlignLeft,
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"

// ─── Types ────────────────────────────────────────────────────────────────────
type Status = "hadir" | "tidak_hadir" | "haid"

interface RiwayatItem {
  id: number
  tanggal: string
  hari: string
  waktu: string
  status: Status
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

// ─── Dummy riwayat ────────────────────────────────────────────────────────────
function getSummary(data: RiwayatItem[]) {
  return {
    hadir: data.filter((d) => d.status === "hadir").length,
    haid: data.filter((d) => d.status === "haid").length,
    tidak_hadir: data.filter((d) => d.status === "tidak_hadir").length,
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function AbsenSholatPage() {
  const router = useRouter()
  const [data, setData] = useState<RiwayatItem[]>([])
  const [, setLoading] = useState(true)
  const [user, setUser] = useState<{
    id: any
    nama: string
    kelas: string
  } | null>(null)
  const [sudahAbsen, setSudahAbsen] = useState(false)

  useEffect(() => {
    const sessionStr = localStorage.getItem("user_session")
    if (!sessionStr) {
      router.push("/")
      return
    }

    const session = JSON.parse(sessionStr)
    setUser(session)

    const fetchAbsensi = async () => {
      try {
        const res = await fetch(`/api/absensi?user_id=${session.id}`)
        const result = await res.json()

        const formatted = result.map((r: any) => {
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

        setData(formatted)

        // Cek apakah sudah absen hari ini
        const today = new Date().toISOString().split("T")[0]
        const hasAbsenToday = formatted.some(
          (r: any) => r.tanggal === today && r.status === "hadir"
        )
        setSudahAbsen(hasAbsenToday)
      } catch (err) {
        console.error("Error fetching absensi:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchAbsensi()
  }, [router])

  const getHari = (tanggal: string) => {
    if (!tanggal || tanggal === "—") return "—"

    const [y, m, d] = tanggal.split("-").map(Number)
    const date = new Date(y, m - 1, d)

    return date.toLocaleDateString("id-ID", {
      weekday: "long",
    })
  }

  const summary = getSummary(data)

  function handleLogout(_event: React.MouseEvent<HTMLDivElement>): void {
    localStorage.removeItem("user_session")
    router.push("/")
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-background">
      {/* ── Header Banner ── */}
      <div
        className="relative w-full max-w-md overflow-hidden shadow-lg shadow-teal-900/10 rounded-b-[2rem] pb-8 pt-10 px-5"
        style={{
          background: "linear-gradient(135deg, #0d9488 0%, #0891b2 100%)",
        }}
      >
        {/* Decorative circles */}
        <div
          aria-hidden
          className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10"
        />
        <div
          aria-hidden
          className="absolute -bottom-5 -left-7.5 w-25 h-25 rounded-full bg-white/5"
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
            <ModeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-xl bg-white/15 p-2 transition-colors outline-none hover:bg-white/25">
                  <AlignLeft className="h-5 w-5 text-white" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="w-52 rounded-2xl border border-border bg-card p-1.5 shadow-xl"
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
        <div
          className="relative z-10 mt-5 flex items-center justify-between rounded-2xl p-4 bg-white/20 backdrop-blur-md border border-white/25"
        >
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
            {sudahAbsen ? (
              <>
                <CheckCircle2 className="h-10 w-10 text-emerald-300 drop-shadow" />
                <span className="text-[10px] font-semibold text-emerald-200">
                  Sudah Absen
                </span>
              </>
            ) : (
              <>
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-white/40 bg-white/20">
                  <Clock className="h-5 w-5 text-white/60" />
                </div>
                <span className="text-[10px] text-teal-50">Belum Absen</span>
              </>
            )}
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
            disabled={sudahAbsen}
            className={`flex h-16 w-full items-center justify-center gap-3 rounded-2xl text-base font-bold transition-all duration-200 ${
              sudahAbsen
                ? "cursor-not-allowed border border-border bg-muted text-muted-foreground shadow-none"
                : "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98]"
            } `}
          >
            <QrCode
              className={`h-6 w-6 ${sudahAbsen ? "text-muted-foreground" : "text-primary-foreground"}`}
            />
            {sudahAbsen ? "Sudah Absen Hari Ini" : "Scan QR untuk Absen"}
          </Button>

          {sudahAbsen ? (
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
            {data.map((r) => (
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
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
