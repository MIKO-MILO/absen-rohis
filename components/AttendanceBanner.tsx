"use client"

import { CalendarDays } from "lucide-react"

interface AttendanceBannerProps {
  title: string
  subtitle: string
  date: string
  totalLabel?: string
  summary: {
    total: number
    hadir: number
    haid: number
    tidak_hadir: number
    belum_absen?: number
  }
}

export function AttendanceBanner({
  title,
  subtitle,
  date,
  summary,
}: AttendanceBannerProps) {
  const hadirPct =
    summary.total > 0 ? Math.round((summary.hadir / summary.total) * 100) : 0

  const size = 42
  const strokeWidth = 5.5
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const gapLength = summary.total > 0 ? circumference * 0.018 : 0

  const segments = [
    { label: "Hadir", value: summary.hadir, color: "#34d399" },
    { label: "Haid", value: summary.haid, color: "#60a5fa" },
    { label: "Tidak Hadir", value: summary.tidak_hadir, color: "#fb7185" },
    {
      label: "Belum Absen",
      value: summary.belum_absen || 0,
      color: "rgba(255,255,255,0.28)",
    },
  ].filter((segment) => segment.value > 0)

  let offset = 0
  const renderedSegments = segments.map((segment) => {
    const portion =
      summary.total > 0 ? (segment.value / summary.total) * circumference : 0
    const dash = Math.max(portion - gapLength, 0)
    const strokeDashoffset = -offset
    offset += portion
    return { ...segment, dash, strokeDashoffset }
  })

  return (
    <div
      className="relative overflow-hidden rounded-[24px] px-4 py-5 text-white shadow-[0_20px_45px_-28px_rgba(8,145,178,0.9)] sm:px-7 sm:py-6 md:px-8"
      style={{
        background:
          "linear-gradient(135deg, #0d9488 0%, #0891b2 58%, #06b6d4 100%)",
      }}
    >
      <div
        className="pointer-events-none absolute -top-16 -right-16 h-44 w-44 rounded-full bg-white/10 blur-2xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-0 left-1/3 h-12 w-12 translate-y-1/2 rounded-full bg-white/10 sm:h-16 sm:w-16"
        aria-hidden="true"
      />

      <div className="relative z-10 flex items-start justify-between gap-4 sm:gap-6 md:items-center">
        <div className="min-w-0 flex-1 space-y-3">
          <p className="text-[10px] font-bold tracking-[0.18em] text-white/70 uppercase">
            {subtitle}
          </p>
          <div className="space-y-2">
            <h2 className="text-xl font-black tracking-tight text-white sm:text-3xl">
              {title}
            </h2>
            <div className="flex items-center gap-2 text-[11px] font-medium text-white/85 sm:text-sm">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
              <span className="line-clamp-2">{date}</span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 justify-end">
          <div className="relative flex h-24 w-24 items-center justify-center sm:h-32 sm:w-32">
            {/* Soft glow behind chart */}
            <div
              className="absolute inset-1 rounded-full bg-white/15 blur-xl"
              aria-hidden="true"
            />

            <svg
              viewBox={`0 0 ${size} ${size}`}
              className="relative h-full w-full -rotate-90 drop-shadow-[0_6px_14px_rgba(0,0,0,0.18)]"
              aria-hidden="true"
            >
              {/* Soft inner disc */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius - strokeWidth * 0.65}
                fill="rgba(255,255,255,0.08)"
              />

              {/* Track */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke="rgba(255,255,255,0.16)"
                strokeWidth={strokeWidth}
              />

              {/* Segments */}
              {summary.total > 0 &&
                renderedSegments.map((segment) => (
                  <circle
                    key={segment.label}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="transparent"
                    stroke={segment.color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="butt"
                    strokeDasharray={`${segment.dash} ${circumference - segment.dash}`}
                    strokeDashoffset={segment.strokeDashoffset}
                    className="transition-all duration-700 ease-out"
                  />
                ))}
            </svg>

            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[1.35rem] leading-none font-black tracking-tight text-white sm:text-[1.85rem]">
                {hadirPct}%
              </span>
              <span className="mt-1 text-[6px] font-bold tracking-[0.18em] text-white/70 uppercase sm:text-[8px]">
                Kehadiran
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
