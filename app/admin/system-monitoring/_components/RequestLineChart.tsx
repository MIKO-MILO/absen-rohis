"use client"

interface Bucket {
  bucketLabel: string
  totalRequests: number
  successCount: number
  errorCount: number
  totalResponseTime: number
}

interface Props {
  data: Bucket[]
  height?: number
  /** Render error line overlay */
  showErrors?: boolean
}

/**
 * Inline SVG line/area chart.
 * Mengikuti pola existing BarChart di dashboard (inline SVG, no lib deps).
 */
export function RequestLineChart({ data, height = 240, showErrors = true }: Props) {
  const width = 800
  const padding = { top: 16, right: 16, bottom: 36, left: 44 }
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom

  if (!data || data.length === 0) {
    return (
      <div
        className="w-full flex items-center justify-center text-slate-400 text-sm border border-dashed rounded-lg border-slate-200 dark:border-slate-600"
        style={{ height }}
      >
        Belum ada data request untuk periode ini.
      </div>
    )
  }

  const maxReq = Math.max(1, ...data.map((d) => d.totalRequests))
  const stepX = data.length > 1 ? innerW / (data.length - 1) : innerW

  const pointsReq = data.map((d, i) => {
    const x = padding.left + (data.length === 1 ? innerW / 2 : i * stepX)
    const y =
      padding.top +
      innerH -
      (d.totalRequests / maxReq) * innerH
    return { x, y, d }
  })
  const areaPath =
    `M ${pointsReq[0].x} ${padding.top + innerH} ` +
    pointsReq.map((p) => `L ${p.x} ${p.y}`).join(" ") +
    ` L ${pointsReq[pointsReq.length - 1].x} ${padding.top + innerH} Z`
  const linePath = pointsReq.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")

  const pointsErr = data.map((d, i) => {
    const x = padding.left + (data.length === 1 ? innerW / 2 : i * stepX)
    const y =
      padding.top +
      innerH -
      (d.errorCount / maxReq) * innerH
    return { x, y }
  })
  const errPath = pointsErr
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ")

  const yTicks = 4
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) => Math.round((maxReq / yTicks) * i))

  const labelEvery = Math.max(1, Math.ceil(data.length / 12))

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto min-w-130"
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
                strokeDasharray="3 3"
              />
              <text
                x={padding.left - 8}
                y={y + 3}
                textAnchor="end"
                fontSize="10"
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
          strokeWidth="2.2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Error overlay */}
        {showErrors &&
          data.some((d) => d.errorCount > 0) && (
            <path
              d={errPath}
              fill="none"
              stroke="#e11d48"
              strokeWidth="1.8"
              strokeDasharray="4 3"
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity="0.85"
            />
          )}

        {/* Dots */}
        {pointsReq.map((p, i) => {
          if (data.length <= 24 && i % labelEvery !== 0 && i !== pointsReq.length - 1) return null
          return (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="2.6"
              fill="#356b60"
              stroke="#fff"
              strokeWidth="1"
            >
              <title>
                {p.d.bucketLabel}: {p.d.totalRequests.toLocaleString("id-ID")} req · {p.d.errorCount} err
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
              y={height - 14}
              textAnchor="middle"
              fontSize="10"
              fill="#64748b"
            >
              {d.bucketLabel}
            </text>
          )
        })}

        {/* Legend */}
        <g transform={`translate(${padding.left}, ${padding.top})`}>
          <g transform="translate(0,0)">
            <rect width="12" height="3" y="5" fill="url(#rmReqLine)" />
            <text x="18" y="9" fontSize="10" fill="#475569">Total Requests</text>
          </g>
          {showErrors &&
            data.some((d) => d.errorCount > 0) && (
              <g transform="translate(140,0)">
                <rect width="12" height="2" y="5.5" fill="#e11d48" strokeDasharray="4 3" />
                <text x="18" y="9" fontSize="10" fill="#475569">Errors</text>
              </g>
            )}
        </g>
      </svg>
    </div>
  )
}
