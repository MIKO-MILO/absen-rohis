"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import ClockWIB from "@/components/mycomponent/clock"
import { Clock, AlignLeft } from "lucide-react"

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
  nama: string
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

// ─── Component ────────────────────────────────────────────────────────────────
export default function AbsenSholatPage() {
  const router = useRouter()
  const [data, setData] = useState<RiwayatItem[]>([])
  const [, setLoading] = useState(true)
  const [panitia, setPanitia] = useState<{
    id: any
    nama: string
    divisi: string
  } | null>(null)

  useEffect(() => {
    const sessionStr = localStorage.getItem("user_session")
    if (!sessionStr) {
      router.push("/")
      return
    }

    const session = JSON.parse(sessionStr)
    // Pastikan yang login adalah panitia
    if (session.role !== "panitia") {
      router.push("/")
      return
    }
    setPanitia(session)

    const fetchAbsensi = async () => {
      try {
        const res = await fetch(`/api/absensi`)
        const result = await res.json()

        const formatted = result.map((e: any) => {
          let rawStatus = (e.status || "").trim().toLowerCase()
          if (rawStatus === "tidak hadir") rawStatus = "tidak_hadir"

          const tanggal = e.tanggal ?? "—"

          return {
            id: e.id,
            nama: e.users?.nama || "Tidak diketahui",
            nis: e.users?.nis || "—",
            kelas: e.users?.kelas || "—",
            tanggal,
            hari: getHari(tanggal),
            waktu: e.waktu ?? "—",
            status: (["hadir", "haid", "tidak_hadir"].includes(rawStatus)
              ? rawStatus
              : "tidak_hadir") as Status,
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
  }, [router])

  const getHari = (tanggal: string) => {
    if (!tanggal || tanggal === "—") return "—"

    const [y, m, d] = tanggal.split("-").map(Number)
    const date = new Date(y, m - 1, d)

    return date.toLocaleDateString("id-ID", {
      weekday: "long",
    })
  }

  function handleLogout(_event: React.MouseEvent<HTMLDivElement>): void {
    localStorage.removeItem("user_session")
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
              {panitia?.nama?.substring(0, 2).toUpperCase() || "..."}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base leading-tight font-semibold text-white">
              {panitia?.nama || "Memuat..."}
            </h1>
            <p className="text-xs text-teal-50">{panitia?.divisi || "Memuat..."}</p>
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
                        {panitia?.nama?.substring(0, 2).toUpperCase() || "..."}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-foreground">
                        {panitia?.nama || "Memuat..."}
                      </p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {panitia?.divisi || "Memuat..."}
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
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex w-full max-w-md flex-col gap-5 px-4 pt-5 pb-10">
        {/* ── Tombol Scan QR ── */}
        <div className="flex flex-col gap-2">
          <Button
            onClick={() => router.push("/rohis/pageqr")}
            className="flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-primary text-base font-bold text-white shadow-lg shadow-primary/20 transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, #0d9488 0%, #0891b2 100%)" }}
          >
            {" "}
            {"Generate QR Code"}
          </Button>
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
            {data.map((e) => (
              <Card
                key={e.id}
                className="rounded-2xl border border-border bg-card shadow-sm"
              >
                <CardContent className="flex items-center gap-3 px-4 py-3">
                  <div
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_DOT[e.status]}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-tight font-semibold text-foreground">
                      {e.nama}
                    </p>
                    <p className="text-xs leading-tight text-muted-foreground">
                      {e.hari}, {e.tanggal} -{" "}
                      {e.waktu !== "—" ? `${e.waktu} WIB` : "Tidak ada catatan"}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`shrink-0 rounded-lg border px-2.5 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[e.status]}`}
                  >
                    {STATUS_LABEL[e.status]}
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
