"use client"

import { AdminShell } from "../_components/AdminShell"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Users,
  UserCheck,
  HeartPulse,
  XCircle,
  QrCode,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from "lucide-react"
import { useEffect, useState } from "react"

interface SiswaRecord {
  id: number
  nama: string
  nis: string
  hari: string
  kelas: string
  waktu: string
  status: Status
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
  } | null
}

type Status = "hadir" | "haid" | "tidak_hadir"

// ─── Dummy data ───────────────────────────────────────────────────────────────
const WEEKLY = [
  { hari: "Sen", hadir: 28, Haid: 4, tidak: 3 },
  { hari: "Sel", hadir: 31, Haid: 2, tidak: 2 },
  { hari: "Rab", hadir: 25, Haid: 6, tidak: 4 },
  { hari: "Kam", hadir: 33, Haid: 1, tidak: 1 },
  { hari: "Jum", hadir: 29, Haid: 3, tidak: 3 },
]

const KELAS_DATA = [
  { kelas: "X RPL A", total: 32, hadir: 28, pct: 88 },
  { kelas: "X RPL C", total: 30, hadir: 27, pct: 90 },
  { kelas: "XI IPA 1", total: 34, hadir: 25, pct: 74 },
  { kelas: "XI IPS 2", total: 28, hadir: 20, pct: 71 },
  { kelas: "XII RPL B", total: 30, hadir: 29, pct: 97 },
]

// ─── Line Chart ───────────────────────────────────────────────────────────────
const CHART_W = 400
const CHART_H = 120
const PAD_X = 10
const PAD_Y = 10

function toPoints(values: number[], max: number): string {
  return values
    .map((v, i) => {
      const x = PAD_X + (i / (values.length - 1)) * (CHART_W - PAD_X * 2)
      const y = PAD_Y + (1 - v / max) * (CHART_H - PAD_Y * 2)
      return `${x},${y}`
    })
    .join(" ")
}

function toAreaPath(values: number[], max: number): string {
  const pts = values.map((v, i) => {
    const x = PAD_X + (i / (values.length - 1)) * (CHART_W - PAD_X * 2)
    const y = PAD_Y + (1 - v / max) * (CHART_H - PAD_Y * 2)
    return `${x},${y}`
  })
  const bottom = CHART_H - PAD_Y
  return `M ${pts[0]} L ${pts.join(" L ")} L ${PAD_X + CHART_W - PAD_X * 2},${bottom} L ${PAD_X},${bottom} Z`
}

function LineChart() {
  const allVals = WEEKLY.flatMap((d) => [d.hadir, d.Haid, d.tidak])
  const max = Math.max(...allVals) + 4

  const hadirPts = WEEKLY.map((d) => d.hadir)
  const HaidPts = WEEKLY.map((d) => d.Haid)
  const tidakPts = WEEKLY.map((d) => d.tidak)

  const lines = [
    {
      values: hadirPts,
      stroke: "#0d9488",
      fill: "url(#fillHadir)",
      id: "fillHadir",
      c1: "#2dd4bf",
      c2: "#0d9488",
    },
    {
      values: HaidPts,
      stroke: "#3b82f6",
      fill: "url(#fillHaid)",
      id: "fillHaid",
      c1: "#d97706",
      c2: "#3b82f6",
    },
    {
      values: tidakPts,
      stroke: "#f87171",
      fill: "url(#fillTidak)",
      id: "fillTidak",
      c1: "#fca5a5",
      c2: "#f87171",
    },
  ]

  return (
    <svg
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      className="w-full"
      style={{ height: 120 }}
      preserveAspectRatio="none"
    >
      <defs>
        {lines.map(({ id, c1, c2 }) => (
          <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c1} stopOpacity="0.25" />
            <stop offset="100%" stopColor={c2} stopOpacity="0.02" />
          </linearGradient>
        ))}
      </defs>

      {/* Horizontal grid lines */}
      {[0.25, 0.5, 0.75].map((r) => (
        <line
          key={r}
          x1={PAD_X}
          y1={PAD_Y + (1 - r) * (CHART_H - PAD_Y * 2)}
          x2={CHART_W - PAD_X}
          y2={PAD_Y + (1 - r) * (CHART_H - PAD_Y * 2)}
          className="stroke-border"
          strokeWidth="1"
        />
      ))}

      {/* Area fills */}
      {lines.map(({ values, fill, id }) => (
        <path key={`area-${id}`} d={toAreaPath(values, max)} fill={fill} />
      ))}

      {/* Lines */}
      {lines.map(({ values, stroke, id }) => (
        <polyline
          key={`line-${id}`}
          points={toPoints(values, max)}
          fill="none"
          stroke={stroke}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}

      {/* Dots */}
      {lines.map(({ values, stroke, id }) =>
        values.map((v, i) => {
          const x = PAD_X + (i / (values.length - 1)) * (CHART_W - PAD_X * 2)
          const y = PAD_Y + (1 - v / max) * (CHART_H - PAD_Y * 2)
          return (
            <circle
              key={`dot-${id}-${i}`}
              cx={x}
              cy={y}
              r="3"
              fill="white"
              stroke={stroke}
              strokeWidth="2"
            />
          )
        })
      )}
    </svg>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<SiswaRecord[]>([])
  const [loading, setLoading] = useState(true)

  const today = WEEKLY[WEEKLY.length - 1]
  const yesterday = WEEKLY[WEEKLY.length - 2]
  const totalToday = today.hadir + today.Haid + today.tidak
  const hadirPct = Math.round((today.hadir / totalToday) * 100)
  const trendUp = today.hadir >= yesterday.hadir

  const getHari = (tanggal: string) => {
    if (!tanggal || tanggal === "—") return "—"

    const [y, m, d] = tanggal.split("-").map(Number)
    const date = new Date(y, m - 1, d)

    return date.toLocaleDateString("id-ID", {
      weekday: "long",
    })
  }

  useEffect(() => {
    let isMounted = true

    const fetchAbsensi = async () => {
      try {
        const res = await fetch("/api/absensi")
        const result = await res.json()

        if (!isMounted) return

        const formatted = (result as AbsensiResponse[]).map(
          (r): SiswaRecord => {
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
          }
        )
        if (isMounted) {
          setData(formatted)
        }
      } catch (err: unknown) {
        console.error(err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchAbsensi()

    return () => {
      isMounted = false
    }
  }, [router])

  return (
    <AdminShell>
      <div className="flex flex-col gap-5 px-4 py-5 md:px-6">
        {/* ── Greeting banner ── */}
        <div
          className="relative flex items-center justify-between overflow-hidden rounded-2xl p-5"
          style={{
            background: "linear-gradient(135deg, #0d9488 0%, #0891b2 100%)",
          }}
        >
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: "-30px",
              right: "-30px",
              width: "140px",
              height: "140px",
              borderRadius: "50%",
              background: "rgba(255,255,255,0.07)",
            }}
          />
          <div
            aria-hidden
            style={{
              position: "absolute",
              bottom: "-20px",
              left: "40%",
              width: "90px",
              height: "90px",
              borderRadius: "50%",
              background: "rgba(255,255,255,0.05)",
            }}
          />
          <div className="relative z-10">
            <p className="text-xs text-teal-100">Selamat datang kembali 👋</p>
            <h2 className="mt-0.5 text-xl font-black text-white">
              Ustadz Hasan
            </h2>
            <p className="mt-1 text-xs text-teal-200">
              {!loading
                ? new Date().toLocaleDateString("id-ID", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : ""}
            </p>
          </div>
          <Button
            onClick={() => router.push("/admin/generate-qr")}
            className="relative z-10 h-9 shrink-0 rounded-xl border border-white/30 bg-white/20 text-xs font-semibold text-white backdrop-blur-sm hover:bg-white/30"
          >
            <QrCode className="mr-1.5 h-3.5 w-3.5" />
            Generate QR
          </Button>
        </div>

        {/* ── Summary cards ── */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            {
              label: "Total Siswa",
              value: 35,
              sub: "+2 bulan ini",
              icon: Users,
              color: "text-muted-foreground",
              bg: "bg-card border-border",
              iconBg: "bg-muted",
              trend: null,
            },
            {
              label: "Hadir Hari Ini",
              value: today.hadir,
              sub: `${hadirPct}% kehadiran`,
              icon: UserCheck,
              color: "text-primary",
              bg: "bg-card border-primary/20",
              iconBg: "bg-primary/10",
              trend: trendUp,
            },
            {
              label: "Haid",
              value: today.Haid,
              sub: "hari ini",
              icon: HeartPulse,
              color: "text-blue-500",
              bg: "bg-card border-blue-500/20",
              iconBg: "bg-blue-500/10",
              trend: null,
            },
            {
              label: "Tidak Hadir",
              value: today.tidak,
              sub: "hari ini",
              icon: XCircle,
              color: "text-destructive",
              bg: "bg-card border-destructive/20",
              iconBg: "bg-destructive/10",
              trend: null,
            },
          ].map(
            ({ label, value, sub, icon: Icon, color, bg, iconBg, trend }) => (
              <div
                key={label}
                className={`flex flex-col gap-2 rounded-2xl border px-4 py-4 shadow-sm ${bg}`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconBg}`}
                  >
                    <Icon className={`h-4 w-4 ${color}`} />
                  </div>
                  {trend !== null &&
                    (trend ? (
                      <TrendingUp className="h-3.5 w-3.5 text-teal-500" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5 text-red-400" />
                    ))}
                </div>
                <div>
                  <p className={`text-2xl leading-none font-black ${color}`}>
                    {value}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {label}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground/80">
                    {sub}
                  </p>
                </div>
              </div>
            )
          )}
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* ── Line chart mingguan ── */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Kehadiran Minggu Ini
                </h3>
                <p className="text-xs text-muted-foreground">Sholat Dzuhur</p>
              </div>
              <div className="flex items-center gap-3">
                {[
                  { label: "Hadir", color: "bg-primary" },
                  { label: "Haid", color: "bg-blue-400" },
                  { label: "Tidak Hadir", color: "bg-destructive" },
                ].map(({ label, color }) => (
                  <div
                    key={label}
                    className="flex items-center gap-1 text-[10px] text-muted-foreground"
                  >
                    <div className={`h-2 w-2 rounded-full ${color}`} />
                    {label}
                  </div>
                ))}
              </div>
            </div>

            {/* Chart area */}
            <div className="w-full">
              <LineChart />
            </div>

            {/* X-axis labels */}
            <div className="mt-1 flex justify-between px-2">
              {WEEKLY.map((d) => (
                <span
                  key={d.hari}
                  className="flex-1 text-center text-[10px] font-medium text-muted-foreground"
                >
                  {d.hari}
                </span>
              ))}
            </div>
          </div>

          {/* ── Per kelas ── */}
          <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-foreground">Per Kelas</h3>
              <p className="text-xs text-muted-foreground">Tingkat kehadiran</p>
            </div>
            <div className="flex flex-col gap-3.5">
              {KELAS_DATA.map((k) => (
                <div key={k.kelas}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground/90">
                      {k.kelas}
                    </span>
                    <span
                      className={`text-xs font-bold ${k.pct >= 85 ? "text-primary" : k.pct >= 70 ? "text-amber-500" : "text-destructive"}`}
                    >
                      {k.pct}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${k.pct}%`,
                        background:
                          k.pct >= 85
                            ? "linear-gradient(90deg,var(--color-primary),var(--color-primary))"
                            : k.pct >= 70
                              ? "linear-gradient(90deg,#fbbf24,#f59e0b)"
                              : "linear-gradient(90deg,#f87171,#ef4444)",
                      }}
                    />
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {k.hadir}/{k.total} hadir
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Absen terbaru ── */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border/50 px-5 pt-4 pb-3">
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Absen Terbaru
              </h3>
              <p className="text-xs text-muted-foreground">
                Aktivitas hari ini
              </p>
            </div>
            <button
              onClick={() => router.push("/admin/absen")}
              className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              Lihat semua <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="divide-y divide-border/50">
            {data.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/60"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {r.nama}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.kelas} {r.hari}, {r.tanggal} -{" "}
                    {r.waktu !== "—" ? `${r.waktu} WIB` : "Tidak ada catatan"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-muted-foreground/60"></span>
                  <Badge
                    variant="outline"
                    className={`rounded-lg border px-2 py-0.5 text-[10px] font-semibold ${
                      r.status === "hadir"
                        ? "border-primary/20 bg-primary/10 text-primary"
                        : r.status === "haid"
                          ? "border-blue-500/20 bg-blue-500/10 text-blue-500"
                          : "border-destructive/20 bg-destructive/10 text-destructive"
                    }`}
                  >
                    {r.status === "hadir" ? "Hadir" : "Haid"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminShell>
  )
}
