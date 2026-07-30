"use client"

import { CalendarDays, CheckCircle2 } from "lucide-react"

interface AttendanceBannerProps {
  title: string
  subtitle: string
  date: string
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
    { label: "Hadir", value: summary.hadir, color: "stroke-emerald-400", dotBg: "bg-emerald-400", textColor: "text-emerald-300" },
    { label: "Haid", value: summary.haid, color: "stroke-blue-400", dotBg: "bg-blue-400", textColor: "text-blue-300" },
    { label: "Tidak Hadir", value: summary.tidak_hadir, color: "stroke-rose-400", dotBg: "bg-rose-400", textColor: "text-rose-300" },
    { label: "Belum Absen", value: summary.belum_absen || 0, color: "stroke-white/20", dotBg: "bg-slate-300/50", textColor: "text-slate-300" },
  ]

  let currentOffset = 0

  return (
    <div
      className="relative flex flex-col justify-between gap-6 overflow-hidden rounded-3xl p-6 shadow-xl transition-all duration-300 sm:p-7 md:flex-row md:items-center md:p-8"
      style={{
        background: "linear-gradient(135deg, #134e4a 0%, #0f766e 55%, #042f2e 100%)",
      }}
    >
      {/* Background ambient lighting */}
      <div
        className="pointer-events-none absolute -top-16 -right-16 h-64 w-64 rounded-full bg-teal-400/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-20 left-10 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl"
        aria-hidden="true"
      />

      {/* Left Content */}
      <div className="relative z-10 space-y-3.5 md:max-w-[65%]">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-bold tracking-wider text-teal-200 uppercase backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-300 animate-pulse" />
            {subtitle}
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-4xl">
            {title}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-xs font-medium text-teal-100/90 sm:gap-3 sm:text-sm">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-1.5 backdrop-blur-md">
            <CalendarDays className="h-4 w-4 text-teal-300 shrink-0" />
            <span>{date}</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/20 px-3 py-1.5 font-semibold text-emerald-200">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{summary.hadir} dari {summary.total} siswa hadir</span>
          </div>
        </div>

        {/* Status Legend Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {segments.map((seg) => (
            <div
              key={seg.label}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] font-medium text-white/90 backdrop-blur-sm"
            >
              <span className={`h-2 w-2 rounded-full ${seg.dotBg}`} />
              <span className="text-teal-100/70">{seg.label}:</span>
              <span className={`font-bold ${seg.textColor}`}>{seg.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Content - Circular Gauge */}
      <div className="relative z-10 flex shrink-0 items-center justify-center self-center md:self-auto">
        <div className="relative flex h-28 w-28 items-center justify-center sm:h-32 sm:w-32 md:h-36 md:w-36">
          {/* Subtle Outer Ring Glow */}
          <div className="absolute inset-0 rounded-full bg-teal-300/10 blur-xl" />

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
            <span className="text-3xl leading-none font-black tracking-tight text-white sm:text-4xl">
              {hadirPct}%
            </span>
            <span className="mt-1 text-[8px] font-extrabold tracking-widest text-teal-200/90 uppercase sm:text-[9px] md:text-[10px]">
              Tingkat Kehadiran
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
