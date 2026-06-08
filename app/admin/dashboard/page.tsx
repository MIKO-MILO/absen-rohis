"use client"

import { AdminShell } from "../_components/AdminShell"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import {
  UserCheck,
  HeartPulse,
  XCircle,
  ArrowRight,
  GraduationCap,
} from "lucide-react"
import { useEffect, useState, useMemo } from "react"

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

interface UserRecord {
  id: number
  nama: string
  nis: string
  kelas: string
  role?: string
}

interface ClassStat {
  kelas: string
  total: number
  hadir: number
  pct: number
}

type Status = "hadir" | "haid" | "tidak_hadir"

// ─── Bar Chart ───────────────────────────────────────────────────────────────
function BarChart({
  data,
}: {
  data: {
    hari: string
    hadir: number
    haid: number
    tidak: number
    label: string
  }[]
}) {
  const CHART_W = 400
  const CHART_H = 100
  const PAD_X = 30
  const PAD_Y = 15
  const BAR_GAP = 12

  const allVals = data.flatMap((d) => [d.hadir, d.haid, d.tidak])
  const max = Math.max(...allVals, 1) + 2

  const groupWidth = (CHART_W - PAD_X * 2) / Math.max(data.length, 1)
  const barWidth = Math.min((groupWidth - BAR_GAP) / 3.5, 12)

  return (
    <svg
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      className="h-auto w-full"
      preserveAspectRatio="none"
    >
      {/* Grid lines */}
      {[0, 0.5, 1].map((r) => (
        <line
          key={r}
          x1={PAD_X}
          y1={CHART_H - PAD_Y - r * (CHART_H - PAD_Y * 2)}
          x2={CHART_W - PAD_X}
          y2={CHART_H - PAD_Y - r * (CHART_H - PAD_Y * 2)}
          className="stroke-border"
          strokeWidth="0.5"
          strokeDasharray="4 4"
        />
      ))}

      {data.map((d, i) => {
        const xBase = PAD_X + i * groupWidth + (groupWidth - barWidth * 3.5) / 2
        const hHadir = (d.hadir / max) * (CHART_H - PAD_Y * 2)
        const hHaid = (d.haid / max) * (CHART_H - PAD_Y * 2)
        const hTidak = (d.tidak / max) * (CHART_H - PAD_Y * 2)

        return (
          <g key={d.label}>
            {/* Hadir Bar */}
            <rect
              x={xBase}
              y={CHART_H - PAD_Y - hHadir}
              width={barWidth}
              height={hHadir}
              className="fill-primary"
              rx="1"
            />
            {/* Haid Bar */}
            <rect
              x={xBase + barWidth + 2}
              y={CHART_H - PAD_Y - hHaid}
              width={barWidth}
              height={hHaid}
              className="fill-blue-400"
              rx="1"
            />
            {/* Tidak Hadir Bar */}
            <rect
              x={xBase + (barWidth + 2) * 2}
              y={CHART_H - PAD_Y - hTidak}
              width={barWidth}
              height={hTidak}
              className="fill-destructive"
              rx="1"
            />
            {/* Label */}
            <text
              x={xBase + (barWidth * 3.5) / 2}
              y={CHART_H - 2}
              textAnchor="middle"
              className="fill-muted-foreground text-[7px] font-bold"
            >
              {d.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<SiswaRecord[]>([])
  const [allUsers, setAllUsers] = useState<UserRecord[]>([])
  const [classesList, setClassesList] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  // ─── Stats ───
  const todayStr = new Date().toISOString().split("T")[0]

  const statsToday = useMemo(() => {
    const todayRecords = data.filter((r) => r.tanggal === todayStr)
    const hadir = todayRecords.filter((r) => r.status === "hadir").length
    const haid = todayRecords.filter((r) => r.status === "haid").length

    // Total students from allUsers
    const total = allUsers.length
    const tidak = total - (hadir + haid)

    // Presence percentage: (Hadir + Haid) / Total Students
    const hadirPct = total > 0 ? Math.round(((hadir + haid) / total) * 100) : 0

    return { hadir, haid, tidak, total, hadirPct }
  }, [data, allUsers, todayStr])

  // ─── Class Stats ───
  const classStats = useMemo<ClassStat[]>(() => {
    // Use explicit classesList from API or fallback to users' classes
    const classes =
      classesList.length > 0
        ? classesList
        : Array.from(new Set(allUsers.map((u) => u.kelas)))
            .filter((k) => k && k !== "—")
            .sort()

    return classes
      .map((c) => {
        const usersInClass = allUsers.filter((u) => u.kelas === c)
        const total = usersInClass.length

        // Find attendance for these users today
        const userNises = new Set(usersInClass.map((u) => u.nis))
        const todayRecordsInClass = data.filter(
          (r) => r.tanggal === todayStr && userNises.has(r.nis)
        )

        const hadirCount = todayRecordsInClass.filter(
          (r) => r.status === "hadir" || r.status === "haid"
        ).length

        return {
          kelas: c,
          total,
          hadir: hadirCount,
          pct: total > 0 ? Math.round((hadirCount / total) * 100) : 0,
        }
      })
      .sort((a, b) => b.pct - a.pct)
  }, [classesList, allUsers, data, todayStr])

  // ─── Chart Data (Fridays of Current Month) ───
  const chartData = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()

    // Find all Fridays in current month
    const fridays = []
    const d = new Date(year, month, 1)
    while (d.getMonth() === month) {
      if (d.getDay() === 5) {
        fridays.push(new Date(d))
      }
      d.setDate(d.getDate() + 1)
    }

    return fridays.map((f) => {
      const dateStr = f.toISOString().split("T")[0]
      const label = f.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
      })
      return {
        hari: "Jum",
        label,
        hadir: data.filter((r) => r.tanggal === dateStr && r.status === "hadir")
          .length,
        haid: data.filter((r) => r.tanggal === dateStr && r.status === "haid")
          .length,
        tidak: data.filter(
          (r) => r.tanggal === dateStr && r.status === "tidak_hadir"
        ).length,
      }
    })
  }, [data])

  const getHari = (tanggal: string) => {
    if (!tanggal || tanggal === "—") return "—"
    const [y, m, d] = tanggal.split("-").map(Number)
    const date = new Date(y, m - 1, d)
    return date.toLocaleDateString("id-ID", { weekday: "long" })
  }

  useEffect(() => {
    let isMounted = true

    const fetchData = async () => {
      try {
        const [resAbsensi, resUsers, resClasses] = await Promise.all([
          fetch("/api/absensi"),
          fetch("/api/users"),
          fetch("/api/classes"),
        ])

        const absensiJson = await resAbsensi.json()
        const usersJson = await resUsers.json()
        const classesJson = await resClasses.json()

        if (!isMounted) return

        setAllUsers(Array.isArray(usersJson) ? usersJson : [])
        if (classesJson.classes) {
          setClassesList(classesJson.classes)
        }

        const formatted = (absensiJson as AbsensiResponse[]).map(
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
        setData(formatted)
      } catch (err: unknown) {
        console.error(err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchData()
    return () => {
      isMounted = false
    }
  }, [])

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
            <p className="text-xs text-teal-100">Selamat datang kembali</p>
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
        </div>

        {/* ── Summary cards ── */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            {
              label: "Total Siswa",
              value: statsToday.total,
              sub: "Siswa terdaftar",
              icon: GraduationCap,
              color: "text-slate-600 dark:text-slate-400",
              bg: "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800",
              iconBg: "bg-slate-100 dark:bg-slate-800",
            },
            {
              label: "Hadir",
              value: statsToday.hadir,
              sub: `${statsToday.hadirPct}% kehadiran`,
              icon: UserCheck,
              color: "text-teal-600 dark:text-teal-400",
              bg: "bg-white dark:bg-slate-900 border-teal-100 dark:border-teal-900/30",
              iconBg: "bg-teal-50 dark:bg-teal-900/20",
            },
            {
              label: "Haid",
              value: statsToday.haid,
              sub: "Siswa berhalangan",
              icon: HeartPulse,
              color: "text-blue-600 dark:text-blue-400",
              bg: "bg-white dark:bg-slate-900 border-blue-100 dark:border-blue-900/30",
              iconBg: "bg-blue-50 dark:bg-blue-900/20",
            },
            {
              label: "Tidak Hadir",
              value: statsToday.tidak,
              sub: "Belum absen hari ini",
              icon: XCircle,
              color: "text-rose-600 dark:text-rose-400",
              bg: "bg-white dark:bg-slate-900 border-rose-100 dark:border-rose-900/30",
              iconBg: "bg-rose-50 dark:bg-rose-900/20",
            },
          ].map(({ label, value, sub, color, bg }) => (
            <div
              key={label}
              className={`relative flex flex-col gap-3 overflow-hidden rounded-3xl border p-5 shadow-sm transition-all hover:shadow-md ${bg}`}
            >
              <div className="flex items-center justify-between"></div>
              <div>
                <p className={`text-3xl leading-none font-black ${color}`}>
                  {loading ? "..." : value}
                </p>
                <p className="mt-2 text-xs font-bold text-foreground">
                  {label}
                </p>
                <p className="mt-0.5 text-[10px] font-medium text-muted-foreground/80">
                  {sub}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* ── Bar chart mingguan ── */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm lg:col-span-2">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Tren Kehadiran (Jumat)
                </h3>
                <p className="text-[10px] tracking-wider text-muted-foreground uppercase">
                  Bulan{" "}
                  {new Date().toLocaleDateString("id-ID", { month: "long" })}
                </p>
              </div>
              <div className="flex items-center gap-4">
                {[
                  { label: "Hadir", color: "bg-primary" },
                  { label: "Haid", color: "bg-blue-400" },
                  { label: "Tidak", color: "bg-destructive" },
                ].map(({ label, color }) => (
                  <div
                    key={label}
                    className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase"
                  >
                    <div className={`h-2 w-2 rounded-full ${color}`} />
                    {label}
                  </div>
                ))}
              </div>
            </div>

            {/* Chart area */}
            <div className="w-full">
              {loading ? (
                <div className="flex h-24 items-center justify-center">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : (
                <BarChart data={chartData} />
              )}
            </div>
          </div>

          {/* ── Per kelas ── */}
          <div className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-foreground">Per Kelas</h3>
              <p className="text-[10px] tracking-wider text-muted-foreground uppercase">
                Tingkat Kehadiran
              </p>
            </div>
            <div className="flex flex-col gap-3.5">
              {classStats.length === 0 ? (
                <div className="flex h-32 flex-col items-center justify-center gap-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <p className="text-[10px] text-muted-foreground">
                    Memuat data kelas...
                  </p>
                </div>
              ) : (
                classStats.map((k) => (
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
                ))
              )}
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
                    {r.status === "hadir"
                      ? "Hadir"
                      : r.status === "haid"
                        ? "Haid"
                        : "Tidak Hadir"}
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
