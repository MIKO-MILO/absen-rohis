"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import ClockWIB from "@/components/mycomponent/clock"
import {
  CheckCircle2,
  QrCode,
  Clock,
  ChevronRight,
  AlignLeft,
  User,
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut } from "lucide-react"

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
  hadir: "bg-teal-50 text-teal-700 border-teal-200",
  tidak_hadir: "bg-red-50 text-red-500 border-red-200",
  haid: "bg-amber-50 text-amber-600 border-amber-200",
}

const STATUS_DOT: Record<Status, string> = {
  hadir: "bg-teal-400",
  tidak_hadir: "bg-red-400",
  haid: "bg-amber-400",
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function AbsenSholatPage() {
  const [data, setData] = useState<RiwayatItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAbsensi = async () => {
      try {
        const res = await fetch(`/api/absensi`)
        const result = await res.json()
        console.log(result)

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
            hari: getHari(tanggal), // ✅ TAMBAH INI
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
  }, [])

  const getHari = (tanggal: string) => {
    if (!tanggal || tanggal === "—") return "—"

    const [y, m, d] = tanggal.split("-").map(Number)
    const date = new Date(y, m - 1, d)

    return date.toLocaleDateString("id-ID", {
      weekday: "long",
    })
  }

  const router = useRouter()

  function handleLogout(event: React.MouseEvent<HTMLDivElement>): void {
    // throw new Error("Function not implemented.");
    router.push("/")
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center"
      style={{
        background:
          "linear-gradient(160deg, #f0fdf9 0%, #f8fafc 60%, #eff6ff 100%)",
      }}
    >
      {/* ── Header Banner ── */}
      <div
        className="relative w-full max-w-md overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0d9488 0%, #0891b2 100%)",
          borderRadius: "0 0 2rem 2rem",
          paddingBottom: "2rem",
          paddingTop: "2.5rem",
          paddingLeft: "1.25rem",
          paddingRight: "1.25rem",
        }}
      >
        {/* Decorative circles */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: "-40px",
            right: "-40px",
            width: "160px",
            height: "160px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.08)",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            bottom: "-20px",
            left: "-30px",
            width: "100px",
            height: "100px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.06)",
          }}
        />

        {/* User Info */}
        <div className="relative z-10 flex items-center gap-3">
          <Avatar className="h-12 w-12 ring-2 ring-white/40 ring-offset-1 ring-offset-teal-700">
            <AvatarFallback className="bg-teal-800 font-bold text-white">
              AH
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base leading-tight font-semibold text-white">
              Aretha Safira P.
            </h1>
            <p className="text-xs text-white">X RPL C</p>
            <ClockWIB />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-xl bg-white/15 p-2 transition-colors outline-none hover:bg-white/25">
                <AlignLeft className="h-5 w-5 text-white" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={8}
              className="w-52 rounded-2xl border border-slate-100 bg-white p-1.5 shadow-xl"
            >
              {/* Header info user */}
              <DropdownMenuLabel className="px-3 py-2">
                <div className="flex items-center gap-2.5">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-teal-700 text-xs font-bold text-white">
                      AH
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-slate-800">
                      Aretha Safira P.
                    </p>
                    <p className="truncate text-[10px] text-slate-400">
                      X RPL C
                    </p>
                  </div>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuItem
                onClick={handleLogout}
                className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-red-500 hover:bg-red-50 focus:bg-red-50 focus:text-red-500"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-sm font-medium">Keluar</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Dzuhur Status Card */}
        <div
          className="relative z-10 mt-5 flex items-center justify-between rounded-2xl p-4"
          style={{
            background: "rgba(255,255,255,0.18)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.25)",
          }}
        >
          <div>
            <p className="mb-0.5 text-[10px] font-semibold tracking-widest text-teal-100 uppercase">
              Absensi Sholat
            </p>
            <p className="text-2xl leading-none font-black text-white">
              Dzuhur
            </p>
            <div className="mt-1.5 flex items-center gap-1">
              <Clock className="h-3 w-3 text-teal-200" />
              <p className="text-xs text-teal-100">12:00 - 13:00 WIB</p>
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
            className="flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 text-base font-bold text-white shadow-lg shadow-teal-200/60 transition-all duration-200 hover:from-teal-400 hover:to-cyan-400 active:scale-[0.98]"
          >
            {" "}
            {"Generate QR Code"}
          </Button>
        </div>

        <Separator className="bg-slate-200" />

        {/* ── Riwayat ── */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-700">
              Riwayat Absensi Dzuhur
            </h2>
          </div>

          <div className="flex flex-col gap-2">
            {data.map((e) => (
              <Card
                key={e.id}
                className="rounded-2xl border border-slate-100 bg-white shadow-sm"
              >
                <CardContent className="flex items-center gap-3 px-4 py-3">
                  <div
                    className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${STATUS_DOT[e.status]}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-tight font-semibold text-slate-800">
                      {e.nama}
                    </p>
                    <p className="text-xs leading-tight text-slate-500">
                      {e.hari}, {e.tanggal} -{" "}
                      {e.waktu !== "—" ? `${e.waktu} WIB` : "Tidak ada catatan"}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`flex-shrink-0 rounded-lg border px-2.5 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[e.status]}`}
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
