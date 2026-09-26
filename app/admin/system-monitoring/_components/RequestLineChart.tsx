"use client"

import { useRef, useState, useEffect, useCallback } from "react"

interface Bucket {
  bucketLabel: string
  totalRequests: number
  successCount: number
  errorCount: number
  totalResponseTime: number
}

interface Props {
  data: Bucket[]
  /** Render error line overlay */
  showErrors?: boolean
  className?: string
}

/**
 * Fully responsive inline SVG line/area chart.
 * Uses ResizeObserver to dynamically size the SVG viewBox
 * so the chart looks great on mobile, tablet, desktop, and ultrawide.
 */
export function RequestLineChart({
  data,
  showErrors = true,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 600, height: 260 })

  // Observe container size and recalculate SVG dimensions
  const updateDimensions = useCallback(() => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const w = Math.max(300, Math.round(rect.width))
    // Responsive height: more square-ish on mobile, wider ratio on desktop
    const h = w < 480 ? Math.round(w * 0.6) : w < 768 ? Math.round(w * 0.45) : Math.round(w * 0.35)
    const clampedH = Math.max(180, Math.min(h, 400))
    setDimensions({ width: w, height: clampedH })
  }, [])

  useEffect(() => {
    updateDimensions()
    const el = containerRef.current
    if (!el) return

    const ro = new ResizeObserver(() => updateDimensions())
    ro.observe(el)
    return () => ro.disconnect()
  }, [updateDimensions])

  const { width, height } = dimensions

  // Adaptive padding & font sizes based on width
  const isSmall = width < 480
  const isMedium = width < 768
  const fontSize = isSmall ? 9 : isMedium ? 10 : 12
  const legendFontSize = isSmall ? 9 : isMedium ? 10 : 12
  const dotRadius = isSmall ? 2.5 : 3.2
  const padding = {
    top: isSmall ? 28 : 32,
    right: isSmall ? 12 : 20,
    bottom: isSmall ? 28 : 36,
    left: isSmall ? 36 : isMedium ? 42 : 52,
  }

  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom

  if (!data || data.length === 0) {
    return (
      <div
        ref={containerRef}
        className={
          "flex w-full items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-400 dark:border-slate-600 " +
          (className ?? "aspect-[16/7] min-h-[180px] max-h-[400px]")
        }
      >
        Belum ada data request untuk periode ini.
      </div>
    )
  }

  const maxReq = Math.max(1, ...data.map((d) => d.totalRequests))
  const stepX = data.length > 1 ? innerW / (data.length - 1) : innerW

  const pointsReq = data.map((d, i) => {
    const x = padding.left + (data.length === 1 ? innerW / 2 : i * stepX)
    const y = padding.top + innerH - (d.totalRequests / maxReq) * innerH
    return { x, y, d }
  })

  const areaPath =
    `M ${pointsReq[0].x} ${padding.top + innerH} ` +
    pointsReq.map((p) => `L ${p.x} ${p.y}`).join(" ") +
    ` L ${pointsReq[pointsReq.length - 1].x} ${padding.top + innerH} Z`
  const linePath = pointsReq
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ")

  const pointsErr = data.map((d, i) => {
    const x = padding.left + (data.length === 1 ? innerW / 2 : i * stepX)
    const y = padding.top + innerH - (d.errorCount / maxReq) * innerH
    return { x, y }
  })
  const errPath = pointsErr
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ")

  const yTicks = isSmall ? 3 : 4
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) =>
    Math.round((maxReq / yTicks) * i)
  )

  // Adaptive X label frequency based on chart width & data points
  const maxLabels = isSmall ? 6 : isMedium ? 8 : 13
  const labelEvery = Math.max(1, Math.ceil(data.length / maxLabels))

  return (
    <div
      ref={containerRef}
      className={
        "w-full " +
        (className ?? "aspect-[16/7] min-h-[180px] max-h-[400px]")
      }
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="block h-full w-full"
        role="img"
        aria-label="Request activity chart"
      >
        <defs>
          <linearGradient id="rmReqFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#4d9284" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#4d9284" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="rmReqLine" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#4d9284" />
            <stop offset="100%" stopColor="#356b60" />
          </linearGradient>
        </defs>

        {/* Grid + Y labels */}
        {yTickValues.map((v, i) => {
          const y = padding.top + innerH - (v / maxReq) * innerH
          return (
            <g key={i}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
                stroke="#e2e8f0"
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 8}
                y={y + 4}
                textAnchor="end"
                fontSize={fontSize}
                fill="#94a3b8"
              >
                {v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
              </text>
            </g>
          )
        })}

        {/* Area + Line requests */}
        <path d={areaPath} fill="url(#rmReqFill)" />
        <path
          d={linePath}
          fill="none"
          stroke="url(#rmReqLine)"
          strokeWidth={isSmall ? 2 : 2.6}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Error overlay */}
        {showErrors && data.some((d) => d.errorCount > 0) && (
          <path
            d={errPath}
            fill="none"
            stroke="#e11d48"
            strokeWidth={isSmall ? 1.6 : 2.2}
            strokeDasharray="5 4"
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity="0.9"
          />
        )}

        {/* Dots */}
        {pointsReq.map((p, i) => {
          if (
            data.length <= 24 &&
            i % labelEvery !== 0 &&
            i !== pointsReq.length - 1
          )
            return null
          return (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={dotRadius}
              fill="#356b60"
              stroke="#fff"
              strokeWidth="1.4"
            >
              <title>
                {p.d.bucketLabel}: {p.d.totalRequests.toLocaleString("id-ID")}{" "}
                req · {p.d.errorCount} err
              </title>
            </circle>
          )
        })}

        {/* X axis labels */}
        {data.map((d, i) => {
          if (i % labelEvery !== 0 && i !== data.length - 1) return null
          const x = padding.left + (data.length === 1 ? innerW / 2 : i * stepX)
          return (
            <text
              key={i}
              x={x}
              y={height - (isSmall ? 6 : 12)}
              textAnchor="middle"
              fontSize={fontSize}
              fill="#64748b"
            >
              {d.bucketLabel}
            </text>
          )
        })}

        {/* Legend — centered at top */}
        <g transform={`translate(${width / 2 - (showErrors && data.some((d) => d.errorCount > 0) ? 100 : 55)}, 8)`}>
          <g transform="translate(0,0)">
            <rect width="14" height="3.5" y="4" rx="1" fill="url(#rmReqLine)" />
            <text x="18" y="9" fontSize={legendFontSize} fill="#475569">
              Total Requests
            </text>
          </g>
          {showErrors && data.some((d) => d.errorCount > 0) && (
            <g transform="translate(120,0)">
              <rect
                width="14"
                height="2.5"
                y="4.5"
                rx="1"
                fill="#e11d48"
              />
              <text x="18" y="9" fontSize={legendFontSize} fill="#475569">
                Errors
              </text>
            </g>
          )}
        </g>
      </svg>
    </div>
  )
}
