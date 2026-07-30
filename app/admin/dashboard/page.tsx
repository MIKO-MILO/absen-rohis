"use client"

import { AdminShell } from "../_components/AdminShell"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ArrowRight } from "lucide-react"
import { useEffect, useState, useMemo } from "react"
import { getEffectiveUserAsync } from "@/lib/auth-client"

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
  tidakHadir: number
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
  const CHART_H = 120
  const PAD_X = 30
  const PAD_Y = 25
  const BAR_GAP = 12

  const allVals = data.flatMap((d) => [d.hadir, d.haid, d.tidak])
  const max = Math.max(...allVals, 1) + 2

  const groupWidth = (CHART_W - PAD_X * 2) / Math.max(data.length, 1)
  const barWidth = Math.min((groupWidth - BAR_GAP) / 3.5, 12)

  return (
    <>
      <style>{`
        @keyframes growUp {
          from {
            transform: scaleY(0);
            opacity: 0;
          }
          to {
            transform: scaleY(1);
            opacity: 1;
          }
        }
        .bar-animate {
          transform-origin: bottom;
          animation: growUp 0.5s ease-out forwards;
        }
      `}</style>
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
          const xBase =
            PAD_X + i * groupWidth + (groupWidth - barWidth * 3.5) / 2
          const hHadir = (d.hadir / max) * (CHART_H - PAD_Y * 2)
          const hHaid = (d.haid / max) * (CHART_H - PAD_Y * 2)
          const hTidak = (d.tidak / max) * (CHART_H - PAD_Y * 2)
          const animationDelay = `${i * 0.1}s`

          return (
            <g key={d.label}>
              {/* Hadir Bar */}
              <g className="group relative">
                <rect
                  x={xBase}
                  y={CHART_H - PAD_Y - hHadir}
                  width={barWidth}
                  height={hHadir}
                  className="bar-animate fill-primary transition-opacity hover:opacity-80"
                  rx="1"
                  style={{
                    transformOrigin: `${xBase + barWidth / 2}px ${CHART_H - PAD_Y}px`,
                    animationDelay,
                  }}
                />
                {d.hadir > 0 && (
                  <text
                    x={xBase + barWidth / 2}
                    y={CHART_H - PAD_Y - hHadir - 4}
                    textAnchor="middle"
                    className="translate-y-1 fill-foreground text-[7px] font-bold opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
                    style={{
                      transitionDelay: "0.1s",
                    }}
                  >
                    {d.hadir}
                  </text>
                )}
              </g>
              {/* Haid Bar */}
              <g className="group relative">
                <rect
                  x={xBase + barWidth + 2}
                  y={CHART_H - PAD_Y - hHaid}
                  width={barWidth}
                  height={hHaid}
                  className="bar-animate fill-blue-400 transition-opacity hover:opacity-80"
                  rx="1"
                  style={{
                    transformOrigin: `${xBase + barWidth + 2 + barWidth / 2}px ${CHART_H - PAD_Y}px`,
                    animationDelay,
                  }}
                />
                {d.haid > 0 && (
                  <text
                    x={xBase + barWidth + 2 + barWidth / 2}
                    y={CHART_H - PAD_Y - hHaid - 4}
                    textAnchor="middle"
                    className="translate-y-1 fill-foreground text-[7px] font-bold opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
                    style={{
                      transitionDelay: "0.1s",
                    }}
                  >
                    {d.haid}
                  </text>
                )}
              </g>
              {/* Tidak Hadir Bar */}
              <g className="group relative">
                <rect
                  x={xBase + (barWidth + 2) * 2}
                  y={CHART_H - PAD_Y - hTidak}
                  width={barWidth}
                  height={hTidak}
                  className="bar-animate fill-destructive transition-opacity hover:opacity-80"
                  rx="1"
                  style={{
                    transformOrigin: `${xBase + (barWidth + 2) * 2 + barWidth / 2}px ${CHART_H - PAD_Y}px`,
                    animationDelay,
                  }}
                />
                {d.tidak > 0 && (
                  <text
                    x={xBase + (barWidth + 2) * 2 + barWidth / 2}
                    y={CHART_H - PAD_Y - hTidak - 4}
                    textAnchor="middle"
                    className="translate-y-1 fill-foreground text-[7px] font-bold opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
                    style={{
                      transitionDelay: "0.1s",
                    }}
                  >
                    {d.tidak}
                  </text>
                )}
              </g>
              {/* Label */}
              <text
                x={xBase + (barWidth * 3.5) / 2}
                y={CHART_H - 5}
                textAnchor="middle"
                className="fill-muted-foreground text-[7px] font-bold"
              >
                {d.label}
              </text>
            </g>
          )
        })}
      </svg>
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<SiswaRecord[]>([])
  const [allUsers, setAllUsers] = useState<UserRecord[]>([])
  const [, setAllAdmins] = useState<
    { id: number; nama: string; role?: string }[]
  >([])
  const [, setAllPanitia] = useState<
    { id: number; nama: string; divisi?: string }[]
  >([])
  const [classesList, setClassesList] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [checkingSession, setCheckingSession] = useState(true)
  const [showFridaysOnly, setShowFridaysOnly] = useState(true)
  const [userName, setUserName] = useState("")

  // Check session on mount
  useEffect(() => {
    const checkSession = async () => {
      const user = await getEffectiveUserAsync()
      if (
        !user ||
        (user.role !== "admin" &&
          user.role !== "superadmin" &&
          user.role !== "panitia")
      ) {
        router.push("/admin")
        return
      }
      setUserName(user.nama)
      setCheckingSession(false)
    }

    checkSession()
  }, [router])

  // ─── Stats ───
  const todayStr = new Date().toISOString().split("T")[0]


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

        const tidakHadirCount = total - hadirCount

        return {
          kelas: c,
          total,
          hadir: hadirCount,
          tidakHadir: tidakHadirCount,
          pct: total > 0 ? Math.round((hadirCount / total) * 100) : 0,
        }
      })
      .sort((a, b) => b.pct - a.pct)
  }, [classesList, allUsers, data, todayStr])

  // ─── Chart Data (Fridays or This Week) ───
  const chartData = useMemo(() => {
    const now = new Date()

    const dates: Date[] = []

    if (showFridaysOnly) {
      // Mode ON: Show all Fridays in current month
      const year = now.getFullYear()
      const month = now.getMonth()
      const d = new Date(year, month, 1)
      while (d.getMonth() === month) {
        if (d.getDay() === 5) {
          dates.push(new Date(d))
        }
        d.setDate(d.getDate() + 1)
      }
    } else {
      // Mode OFF: Show all days in current week (Monday to Sunday)
      const dayOfWeek = now.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      const monday = new Date(now)
      monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
      monday.setHours(0, 0, 0, 0)

      for (let i = 0; i < 7; i++) {
        const date = new Date(monday)
        date.setDate(monday.getDate() + i)
        dates.push(date)
      }
    }

    const result = dates.map((d) => {
      const dateStr = d.toISOString().split("T")[0]
      const label = d.toLocaleDateString("id-ID", {
        weekday: "short",
        day: "numeric",
      })
      const hadirCount = data.filter(
        (r) => r.tanggal === dateStr && r.status === "hadir"
      ).length
      const haidCount = data.filter(
        (r) => r.tanggal === dateStr && r.status === "haid"
      ).length
      // Same logic as stats today: total students minus (hadir + haid)
      const tidakCount = allUsers.length - (hadirCount + haidCount)

      return {
        hari: d.toLocaleDateString("id-ID", { weekday: "short" }),
        label,
        hadir: hadirCount,
        haid: haidCount,
        tidak: tidakCount,
      }
    })

    return result
  }, [data, showFridaysOnly, allUsers])

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
        const [resAbsensi, resUsers, resClasses, resAdmins, resPanitia] =
          await Promise.all([
            fetch("/api/absensi"),
            fetch("/api/users"),
            fetch("/api/classes"),
            fetch("/api/admin"),
            fetch("/api/panitia"),
          ])

        const absensiJson = await resAbsensi.json()
        const usersJson = await resUsers.json()
        const classesJson = await resClasses.json()
        const adminsJson = await resAdmins.json()
        const panitiaJson = await resPanitia.json()

        if (!isMounted) return

        setAllUsers(Array.isArray(usersJson) ? usersJson : [])
        setAllAdmins(Array.isArray(adminsJson) ? adminsJson : [])
        setAllPanitia(Array.isArray(panitiaJson) ? panitiaJson : [])
        if (classesJson.classes) {
          setClassesList(classesJson.classes)
        }

        const formatted = (
          Array.isArray(absensiJson) ? absensiJson : ([] as AbsensiResponse[])
        ).map((r): SiswaRecord => {
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
              {userName || "Admin"}
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

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* ── Bar chart mingguan ── */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm lg:col-span-2">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Tren Kehadiran ({showFridaysOnly ? "Jumat" : "Minggu Ini"})
                </h3>
                <p className="text-[11px] tracking-wider text-muted-foreground uppercase">
                  {showFridaysOnly
                    ? `Bulan ${new Date().toLocaleDateString("id-ID", { month: "long" })}`
                    : "Minggu ini"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label
                    htmlFor="chart-mode"
                    className="text-xs font-semibold text-muted-foreground"
                  >
                    Hanya Jumat
                  </Label>
                  <Switch
                    id="chart-mode"
                    checked={showFridaysOnly}
                    onCheckedChange={setShowFridaysOnly}
                  />
                </div>
                <div className="flex items-center gap-3">
                  {[
                    { label: "Hadir", color: "bg-primary" },
                    { label: "Haid", color: "bg-blue-400" },
                    { label: "Tidak Hadir", color: "bg-destructive" },
                  ].map(({ label, color }) => (
                    <div
                      key={label}
                      className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground"
                    >
                      <div className={`h-2.5 w-2.5 rounded-full ${color}`} />
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Chart area */}
            <div className="w-full">
              {loading ? (
                <div className="flex h-24 items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : (
                <BarChart data={chartData} />
              )}
            </div>
          </div>

          {/* ── Per kelas ── */}
          <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-foreground">Per Kelas</h3>
              <p className="text-[11px] tracking-wider text-muted-foreground uppercase">
                Tingkat Kehadiran
              </p>
            </div>
            <div className="flex flex-col gap-4">
              {classStats.length === 0 ? (
                <div className="flex h-32 flex-col items-center justify-center gap-2">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <p className="text-[11px] text-muted-foreground">
                    Memuat data kelas...
                  </p>
                </div>
              ) : (
                classStats.map((k) => (
                  <div key={k.kelas} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground/90">
                        {k.kelas}
                      </span>
                      <span
                        className={`text-xs font-black ${k.pct >= 85 ? "text-primary" : k.pct >= 70 ? "text-amber-500" : "text-destructive"}`}
                      >
                        {k.pct}%
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all duration-500"
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
                    <p className="text-[10px] text-muted-foreground">
                      {k.hadir}/{k.total} hadir · {k.tidakHadir} tidak hadir
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
