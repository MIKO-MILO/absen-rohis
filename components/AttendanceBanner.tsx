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

  const radius = 15.9155

  const segments = [
    { label: "Hadir", value: summary.hadir, color: "stroke-emerald-400" },
    { label: "Haid", value: summary.haid, color: "stroke-blue-400" },
    {
      label: "Tidak Hadir",
      value: summary.tidak_hadir,
      color: "stroke-rose-400",
    },
    {
      label: "Belum Absen",
      value: summary.belum_absen || 0,
      color: "stroke-white/20",
    },
  ]

  let currentOffset = 0

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
          <div className="relative flex h-20 w-20 items-center justify-center sm:h-28 sm:w-28">
            {/* Subtle Outer Ring Glow */}
            <div className="absolute inset-0 rounded-full bg-white/10 blur-xl" />

            <svg
              viewBox="0 0 42 42"
              className="h-full w-full -rotate-90 transform drop-shadow-md"
            >
              {/* Background circle track */}
              <circle
                cx="21"
                cy="21"
                r={radius}
                fill="transparent"
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="4.5"
              />
              {/* Segments */}
              {segments.map((segment, index) => {
                if (summary.total === 0 || segment.value === 0) return null
                const percentage = (segment.value / summary.total) * 100
                const strokeDasharray = `${percentage} ${100 - percentage}`
                const strokeDashoffset = -currentOffset
                currentOffset += percentage

                return (
                  <circle
                    key={index}
                    cx="21"
                    cy="21"
                    r={radius}
                    fill="transparent"
                    className={`${segment.color} transition-all duration-700 ease-out`}
                    strokeWidth="4.5"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                  />
                )
              })}
            </svg>

            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-xl leading-none font-black text-white sm:text-3xl">
                {hadirPct}%
              </span>
              <span className="mt-1 text-[6px] font-bold tracking-[0.16em] text-white/75 uppercase sm:text-[8px]">
                Kehadiran
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
