"use client"

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useLayoutEffect,
} from "react"
import { AdminShell } from "@/app/admin/_components/AdminShell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  RefreshCw,
  Search,
  X,
  Terminal,
  ChevronDown,
  ChevronRight,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuditActivity {
  source: "audit"
  id: number
  timestamp: string
  actorName: string
  actorRole: string
  action: string
  targetType: string | null
  targetId: number | null
  description: string | null
}

interface MetricBucket {
  source: "metrics"
  endpoint: string
  method: string
  bucketDate: string
  bucketHour: number
  bucketLabel: string
  totalRequests: number
  successCount: number
  errorCount: number
  errorRate: number
  avgResponseTime: number
}

interface Summary {
  auditEvents: number
  metricBuckets: number
  totalRequests: number
  totalErrors: number
  avgResponseTime: number
}

interface ApiResponse {
  summary: Summary
  auditActivities: AuditActivity[]
  metricBuckets: MetricBucket[]
  pagination: { page: number; limit: number; auditTotal: number }
  generatedAt: string
}

// Every line in the terminal buffer is an audit row
type LogLine = AuditActivity

// ─── Constants ────────────────────────────────────────────────────────────────

const POLL_MS    = 15_000   // incremental poll interval (ms) (increased for cost safety)
const LOG_CAP    = 500     // max audit lines kept in memory

type Range      = "1h" | "6h" | "24h"
type TypeFilter = "all" | "audit" | "metrics" | "errors"

const RANGES: { value: Range; label: string }[] = [
  { value: "1h",  label: "1h"  },
  { value: "6h",  label: "6h"  },
  { value: "24h", label: "24h" },
]

const TYPE_FILTERS: { value: TypeFilter; label: string }[] = [
  { value: "all",     label: "ALL"      },
  { value: "audit",   label: "ACTIVITY" },
  { value: "metrics", label: "METRICS"  },
  { value: "errors",  label: "ERRORS"   },
]

// action → { terminal category tag, log level }
const ACTION_META: Record<string, {
  category: string
  level: "INFO" | "SUCCESS" | "WARNING" | "ERROR"
}> = {
  login:               { category: "AUTH",       level: "SUCCESS" },
  logout:              { category: "AUTH",       level: "INFO"    },
  generate_qr:         { category: "QR",         level: "INFO"    },
  scan_qr:             { category: "ATTENDANCE", level: "SUCCESS" },
  approve_absensi:     { category: "ATTENDANCE", level: "SUCCESS" },
  update_config:       { category: "CONFIG",     level: "WARNING" },
  create_admin:        { category: "ADMIN",      level: "INFO"    },
  update_admin:        { category: "ADMIN",      level: "WARNING" },
  delete_admin:        { category: "ADMIN",      level: "ERROR"   },
  create_panitia:      { category: "PANITIA",    level: "INFO"    },
  update_panitia:      { category: "PANITIA",    level: "WARNING" },
  delete_panitia:      { category: "PANITIA",    level: "ERROR"   },
  create_siswa:        { category: "SISWA",      level: "INFO"    },
  update_siswa:        { category: "SISWA",      level: "WARNING" },
  delete_siswa:        { category: "SISWA",      level: "ERROR"   },
  start_impersonation: { category: "SECURITY",   level: "WARNING" },
  stop_impersonation:  { category: "SECURITY",   level: "INFO"    },
}

const ACTION_MSG: Record<string, string> = {
  login:               "berhasil login",
  logout:              "logout",
  generate_qr:         "generate QR code",
  scan_qr:             "melakukan absensi (scan QR)",
  approve_absensi:     "approve absensi",
  update_config:       "mengubah konfigurasi sistem",
  create_admin:        "menambah admin baru",
  update_admin:        "mengubah data admin",
  delete_admin:        "menghapus admin",
  create_panitia:      "menambah panitia baru",
  update_panitia:      "mengubah data panitia",
  delete_panitia:      "menghapus panitia",
  create_siswa:        "menambah siswa baru",
  update_siswa:        "mengubah data siswa",
  delete_siswa:        "menghapus siswa",
  start_impersonation: "memulai impersonation",
  stop_impersonation:  "mengakhiri impersonation",
}

// ─── Colour palette ───────────────────────────────────────────────────────────

const LEVEL_CLS: Record<string, { badge: string; msg: string; row: string }> = {
  INFO:    {
    badge: "text-sky-400",
    msg:   "text-slate-300",
    row:   "",
  },
  SUCCESS: {
    badge: "text-emerald-400",
    msg:   "text-emerald-200",
    row:   "",
  },
  WARNING: {
    badge: "text-amber-400",
    msg:   "text-amber-200",
    row:   "",
  },
  ERROR:   {
    badge: "text-rose-400",
    msg:   "text-rose-200",
    row:   "bg-rose-950/20",
  },
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function getAuditMeta(action: string) {
  return ACTION_META[action] ?? { category: "SYSTEM", level: "INFO" as const }
}

function buildMessage(activity: AuditActivity): string {
  const base = ACTION_MSG[activity.action] ?? activity.action.replace(/_/g, " ")
  // Prefer the description from the DB when available — it's always more specific
  return activity.description ?? `${activity.actorName} ${base}`
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("id-ID", {
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    })
  } catch { return "??:??:??" }
}

function fmtDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("id-ID", { hour12: false })
  } catch { return "—" }
}

function getMetricLevel(errorRate: number): "SUCCESS" | "WARNING" | "ERROR" {
  if (errorRate >= 10) return "ERROR"
  if (errorRate > 0)   return "WARNING"
  return "SUCCESS"
}

// ─── Terminal log row ─────────────────────────────────────────────────────────
// Format: [HH:MM:SS] [LEVEL  ] [CATEGORY  ] message …

function LogRow({
  activity,
  isNew,
  onClick,
}: {
  activity: AuditActivity
  isNew: boolean
  onClick: () => void
}) {
  const meta  = getAuditMeta(activity.action)
  const cls   = LEVEL_CLS[meta.level]
  const msg   = buildMessage(activity)

  // Padded to fixed widths so every column aligns
  // [LEVEL   ] → 9 chars incl. brackets  →  "[SUCCESS]"
  // [CATEGORY  ] → 12 chars incl. brackets → "[ATTENDANCE]"
  const levelTag    = `[${meta.level.padEnd(7)}]`
  const categoryTag = `[${meta.category.padEnd(10)}]`

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left group flex items-baseline px-4 py-[3px]",
        "font-mono text-[12.5px] leading-[1.55] hover:bg-white/[0.035]",
        "transition-colors rounded-[2px]",
        cls.row,
        isNew && "animate-[termFadeIn_0.35s_ease_forwards]",
      )}
    >
      {/* HH:MM:SS — 68 px */}
      <span className="shrink-0 text-slate-600 tabular-nums w-[68px] select-none">
        {fmtTime(activity.timestamp)}
      </span>

      {/* [LEVEL   ] — 80 px */}
      <span className={cn("shrink-0 font-bold w-[80px]", cls.badge)}>
        {levelTag}
      </span>

      {/* [CATEGORY  ] — 108 px */}
      <span className="shrink-0 text-slate-500 w-[108px]">
        {categoryTag}
      </span>

      {/* message body */}
      <span className={cn("flex-1 min-w-0 truncate", cls.msg)}>
        {msg}
      </span>

      {/* expand chevron */}
      <span className="shrink-0 text-slate-800 group-hover:text-slate-500 pl-3 transition-colors select-none">
        ›
      </span>
    </button>
  )
}

// ─── Metric summary row (collapsible section, NOT in the live stream) ─────────

function MetricSummaryRow({
  bucket,
  onClick,
}: {
  bucket: MetricBucket
  onClick: () => void
}) {
  const level = getMetricLevel(bucket.errorRate)
  const cls   = LEVEL_CLS[level]

  const levelTag    = `[${level.padEnd(7)}]`
  const categoryTag = "[API       ]"
  const msg = bucket.errorCount > 0
    ? `${bucket.method} ${bucket.endpoint} → ${bucket.errorCount} error${bucket.errorCount !== 1 ? "s" : ""} / ${bucket.totalRequests} req  avg ${bucket.avgResponseTime}ms  (${bucket.bucketLabel})`
    : `${bucket.method} ${bucket.endpoint} → ${bucket.totalRequests} req  avg ${bucket.avgResponseTime}ms  (${bucket.bucketLabel})`

  return (
    <button
      onClick={onClick}
      className="w-full text-left group flex items-baseline px-4 py-[3px] font-mono text-[12.5px] leading-[1.55] hover:bg-white/[0.035] transition-colors rounded-[2px]"
    >
      <span className="shrink-0 text-slate-700 tabular-nums w-[68px] select-none">
        {String(bucket.bucketHour).padStart(2, "0")}:xx
      </span>
      <span className={cn("shrink-0 font-bold w-[80px]", cls.badge)}>
        {levelTag}
      </span>
      <span className="shrink-0 text-slate-600 w-[108px]">
        {categoryTag}
      </span>
      <span className={cn("flex-1 min-w-0 truncate text-slate-500", bucket.errorCount > 0 && cls.msg)}>
        {msg}
      </span>
      <span className="shrink-0 text-slate-800 group-hover:text-slate-500 pl-3 transition-colors select-none">
        ›
      </span>
    </button>
  )
}

// ─── Detail slide-over ────────────────────────────────────────────────────────

function DetailPanel({
  item,
  onClose,
}: {
  item: AuditActivity | MetricBucket | null
  onClose: () => void
}) {
  if (!item) return null

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-xs" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm bg-[#0e1117] border-l border-slate-700/80 shadow-2xl flex flex-col h-full font-mono">

        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700/80 bg-[#161b22]">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            {item.source === "audit" ? "// event detail" : "// metric detail"}
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2.5 text-xs">
          {item.source === "audit" ? (() => {
            const meta = getAuditMeta(item.action)
            const cls  = LEVEL_CLS[meta.level]
            return (
              <>
                <DR k="timestamp"   v={fmtDateTime(item.timestamp)} />
                <DR k="level"       v={meta.level}         vc={cls.badge} />
                <DR k="category"    v={`[${meta.category}]`} vc="text-slate-300" />
                <DR k="actor"       v={item.actorName}     vc="text-slate-100 font-semibold" />
                <DR k="role"        v={item.actorRole.toUpperCase()} />
                <DR k="action"      v={item.action}        vc={cls.msg} />
                {item.targetType && <DR k="target_type" v={item.targetType} />}
                {item.targetId != null && <DR k="target_id" v={String(item.targetId)} />}
                {item.description && <DR k="description" v={item.description} />}
                <div className="pt-2 border-t border-slate-800">
                  <DR k="source" v="audit_logs" vc="text-slate-600" />
                </div>
              </>
            )
          })() : (() => {
            const level = getMetricLevel(item.errorRate)
            const cls   = LEVEL_CLS[level]
            return (
              <>
                <DR k="bucket"      v={`${item.bucketDate}  ${item.bucketLabel}`} />
                <DR k="method"      v={item.method} />
                <DR k="endpoint"    v={item.endpoint}     vc="text-slate-100" />
                <DR k="status"      v={`[${level}]`}      vc={cls.badge} />
                <div className="pt-2 border-t border-slate-800 space-y-2.5">
                  <DR k="total_req"   v={item.totalRequests.toLocaleString("id-ID")} />
                  <DR k="success"     v={item.successCount.toLocaleString("id-ID")}  vc="text-emerald-400" />
                  <DR k="errors"      v={item.errorCount.toLocaleString("id-ID")}    vc={item.errorCount > 0 ? "text-rose-400" : undefined} />
                  <DR k="error_rate"  v={`${item.errorRate}%`}                       vc={item.errorRate > 0 ? "text-amber-400" : undefined} />
                  <DR k="avg_rt"      v={`${item.avgResponseTime}ms`} />
                </div>
                <div className="pt-2 border-t border-slate-800">
                  <DR k="note"   v="Hourly aggregate — not individual requests" vc="text-slate-700" />
                  <DR k="source" v="request_metrics" vc="text-slate-600" />
                </div>
              </>
            )
          })()}
        </div>
      </div>
    </div>
  )
}

function DR({ k, v, vc }: { k: string; v: string; vc?: string }) {
  return (
    <div className="grid grid-cols-[100px_1fr] gap-2">
      <span className="text-slate-700 uppercase tracking-wide truncate">{k}</span>
      <span className={cn("text-slate-400 break-all", vc)}>{v}</span>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ActivityMonitorPage() {
  // ── Log buffer — only audit events ────────────────────────────────────────
  const [logLines,      setLogLines]      = useState<LogLine[]>([])
  const [metricBuckets, setMetricBuckets] = useState<MetricBucket[]>([])
  const [summary,       setSummary]       = useState<Summary | null>(null)
  const [lastAuditId,   setLastAuditId]   = useState<number | null>(null)
  const [lastRefresh,   setLastRefresh]   = useState<Date | null>(null)

  // ── UI ─────────────────────────────────────────────────────────────────────
  const [initialLoading, setInitialLoading] = useState(true)
  const [polling,        setPolling]        = useState(false)
  const [fetchError,     setFetchError]     = useState<string | null>(null)
  const [autoRefresh,    setAutoRefresh]    = useState(true)
  const [isAtBottom,     setIsAtBottom]     = useState(true)
  const [pendingCount,   setPendingCount]   = useState(0)
  const [metricsOpen,    setMetricsOpen]    = useState(false)

  // ── Filters ────────────────────────────────────────────────────────────────
  const [range,       setRange]       = useState<Range>("1h")
  const [typeFilter,  setTypeFilter]  = useState<TypeFilter>("all")
  const [search,      setSearch]      = useState("")
  const [draftSearch, setDraftSearch] = useState("")

  // ── Detail ─────────────────────────────────────────────────────────────────
  const [selectedItem, setSelectedItem] = useState<AuditActivity | MetricBucket | null>(null)

  // ── Scroll refs ────────────────────────────────────────────────────────────
  const scrollRef     = useRef<HTMLDivElement>(null)
  const sentinelRef   = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)

  useLayoutEffect(() => { isAtBottomRef.current = isAtBottom }, [isAtBottom])

  // ── IntersectionObserver ───────────────────────────────────────────────────
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const io = new IntersectionObserver(
      ([entry]) => {
        const val = entry.isIntersecting
        setIsAtBottom(val)
        if (val) setPendingCount(0)
      },
      { root: scrollRef.current, threshold: 0.1 },
    )
    io.observe(sentinel)
    return () => io.disconnect()
  }, [])

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    sentinelRef.current?.scrollIntoView({ behavior, block: "end" })
  }, [])

  // ── Full load ──────────────────────────────────────────────────────────────
  const doFullLoad = useCallback(
    async (opts: { range?: Range; type?: TypeFilter; search?: string } = {}) => {
      setInitialLoading(true)
      setFetchError(null)
      setPendingCount(0)

      const r = opts.range  ?? range
      const t = opts.type   ?? typeFilter
      const s = opts.search ?? search

      try {
        // Always fetch audit events (for the stream) unless filter is metrics/errors only
        const fetchAudit   = t !== "metrics" && t !== "errors"
        const fetchMetrics = t !== "audit"

        const streamParams = new URLSearchParams({
          range: r,
          type:  fetchAudit ? "audit" : "metrics",
          page:  "1",
          limit: "50",
        })
        if (s) streamParams.set("search", s)

        const metricsParams = new URLSearchParams({
          range: r,
          type:  fetchMetrics && !fetchAudit ? t : "metrics",
          page:  "1",
          limit: "100",
        })
        if (s) metricsParams.set("search", s)

        // Fire both in parallel
        const [streamRes, metricsRes] = await Promise.all([
          fetch(`/api/admin/activity-monitor?${streamParams}`, { cache: "no-store" }),
          fetchMetrics
            ? fetch(`/api/admin/activity-monitor?${metricsParams}`, { cache: "no-store" })
            : Promise.resolve(null),
        ])

        if (!streamRes.ok) {
          const body = await streamRes.json().catch(() => ({}))
          throw new Error(body?.error || `HTTP ${streamRes.status}`)
        }

        const streamJson  = (await streamRes.json()) as ApiResponse
        const metricsJson = (metricsRes?.ok ? await metricsRes.json() : null) as ApiResponse | null

        // Audit rows: API returns newest-first → reverse to chronological
        const auditRows: LogLine[] = [...(streamJson.auditActivities ?? [])].reverse()

        setLogLines(auditRows)
        setSummary(streamJson.summary)
        setMetricBuckets(metricsJson?.metricBuckets ?? streamJson.metricBuckets ?? [])
        setLastRefresh(new Date())

        const maxId = auditRows.reduce((m, a) => Math.max(m, a.id), 0)
        setLastAuditId(maxId > 0 ? maxId : null)
      } catch (e) {
        setFetchError(e instanceof Error ? e.message : "Gagal memuat data")
      } finally {
        setInitialLoading(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  // ── Incremental poll ───────────────────────────────────────────────────────
  const doPoll = useCallback(
    async (opts: {
      lastId:     number | null
      range:      Range
      typeFilter: TypeFilter
      search:     string
    }) => {
      // Only poll for new audit rows if the current filter shows them
      const wantsAudit = opts.typeFilter === "all" || opts.typeFilter === "audit"
      if (!wantsAudit && opts.lastId !== null) return

      try {
        setPolling(true)

        // Fetch only new audit events since lastId
        const params = new URLSearchParams({ type: "audit", limit: "50" })
        if (opts.lastId !== null) {
          params.set("since_id", String(opts.lastId))
        } else {
          params.set("range", opts.range)
        }
        if (opts.search) params.set("search", opts.search)

        const res = await fetch(`/api/admin/activity-monitor?${params}`, { cache: "no-store" })
        if (!res.ok) return

        const json = (await res.json()) as ApiResponse
        const newRows: LogLine[] = json.auditActivities // already ascending (since_id path)

        setLastRefresh(new Date())

        if (newRows.length === 0) return

        const maxNewId = newRows.reduce((m, a) => Math.max(m, a.id), 0)
        setLastAuditId(maxNewId)

        setLogLines((prev) => {
          const merged = [...prev, ...newRows]
          return merged.length > LOG_CAP ? merged.slice(merged.length - LOG_CAP) : merged
        })

        if (!isAtBottomRef.current) {
          setPendingCount((c) => c + newRows.length)
        }
      } catch { /* silent — poll failures must never disrupt the UI */ }
      finally   { setPolling(false) }
    },
    [],
  )

  // ── Mount: initial load ────────────────────────────────────────────────────
  useEffect(() => {
    const run = async () => {
      await doFullLoad({ range, type: typeFilter, search })
    }
    void run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doFullLoad])

  // ── Auto-scroll when new lines arrive and user is at bottom ────────────────
  useEffect(() => {
    if (isAtBottom && logLines.length > 0) scrollToBottom("smooth")
  }, [logLines.length, isAtBottom, scrollToBottom])

  // ── Scroll to bottom after initial load ───────────────────────────────────
  useEffect(() => {
    if (!initialLoading && logLines.length > 0) scrollToBottom("instant")
  }, [initialLoading, scrollToBottom]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Stable refs for interval closures ─────────────────────────────────────
  const rangeRef       = useRef(range)
  const typeFilterRef  = useRef(typeFilter)
  const searchRef      = useRef(search)
  const lastAuditIdRef = useRef(lastAuditId)

  useEffect(() => { rangeRef.current = range },            [range])
  useEffect(() => { typeFilterRef.current = typeFilter },  [typeFilter])
  useEffect(() => { searchRef.current = search },          [search])
  useEffect(() => { lastAuditIdRef.current = lastAuditId },[lastAuditId])

  // ── Poll interval ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!autoRefresh) return
    const iv = window.setInterval(() => {
      void doPoll({
        lastId:     lastAuditIdRef.current,
        range:      rangeRef.current,
        typeFilter: typeFilterRef.current,
        search:     searchRef.current,
      })
    }, POLL_MS)
    return () => window.clearInterval(iv)
  }, [autoRefresh, doPoll])

  // ── Filter handlers ────────────────────────────────────────────────────────
  const applyRange = (r: Range) => {
    setRange(r)
    void doFullLoad({ range: r, type: typeFilter, search })
  }
  const applyType = (t: TypeFilter) => {
    setTypeFilter(t)
    void doFullLoad({ range, type: t, search })
  }
  const handleSearch = () => {
    setSearch(draftSearch)
    void doFullLoad({ range, type: typeFilter, search: draftSearch })
  }
  const handleClearSearch = () => {
    setDraftSearch("")
    setSearch("")
    void doFullLoad({ range, type: typeFilter, search: "" })
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const showStream  = typeFilter === "all" || typeFilter === "audit"
  const showMetrics = typeFilter === "all" || typeFilter === "metrics" || typeFilter === "errors"

  const errorBuckets = metricBuckets.filter((b) => b.errorCount > 0)
  const displayMetricBuckets = typeFilter === "errors" ? errorBuckets : metricBuckets

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <AdminShell requireSuperadmin>
      {/* New-row fade-in animation */}
      <style>{`
        @keyframes termFadeIn {
          from { opacity: 0; background-color: rgba(16,185,129,0.07); }
          to   { opacity: 1; background-color: transparent; }
        }
      `}</style>

      <div className="h-full flex flex-col px-4 sm:px-6 py-4 gap-3 max-w-5xl mx-auto w-full">

        {/* ── Toolbar ── */}
        <div className="flex flex-wrap items-center gap-2">

          {/* Title + status pill */}
          <div className="flex items-center gap-2 mr-auto min-w-0">
            <Terminal className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="font-mono font-bold text-sm text-slate-800 dark:text-slate-100 tracking-tight">
              activity-monitor
            </span>
            <span className={cn(
              "inline-flex items-center gap-1 text-[10px] font-bold font-mono rounded px-2 py-0.5 border shrink-0",
              autoRefresh
                ? "bg-emerald-950/60 text-emerald-400 border-emerald-700/60"
                : "bg-slate-800 text-slate-500 border-slate-700",
            )}>
              <span className={cn(
                "h-1.5 w-1.5 rounded-full",
                autoRefresh ? "bg-emerald-400 animate-pulse" : "bg-slate-500",
              )} />
              {autoRefresh ? "LIVE" : "PAUSED"}
            </span>
            {polling && (
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-500 animate-pulse shrink-0">
                polling…
              </span>
            )}
          </div>

          {/* Range */}
          <div className="flex items-center gap-1 font-mono text-[11px]">
            <span className="text-slate-500 mr-1 hidden sm:inline">range:</span>
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => applyRange(r.value)}
                className={cn(
                  "px-2 py-1 rounded border font-bold transition-all",
                  range === r.value
                    ? "bg-slate-800 dark:bg-slate-200 text-emerald-400 dark:text-emerald-700 border-slate-600 dark:border-slate-300"
                    : "bg-transparent text-slate-500 border-slate-700 dark:border-slate-600 hover:border-slate-500 hover:text-slate-300",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Type filter */}
          <div className="flex items-center gap-1 font-mono text-[11px]">
            <span className="text-slate-500 mr-1 hidden sm:inline">filter:</span>
            {TYPE_FILTERS.map((t) => (
              <button
                key={t.value}
                onClick={() => applyType(t.value)}
                className={cn(
                  "px-2 py-1 rounded border font-bold transition-all",
                  typeFilter === t.value
                    ? "bg-violet-900/60 text-violet-300 border-violet-600"
                    : "bg-transparent text-slate-500 border-slate-700 dark:border-slate-600 hover:border-slate-500 hover:text-slate-300",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Buttons */}
          <div className="flex gap-1.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void doFullLoad({ range, type: typeFilter, search })}
              disabled={initialLoading}
              className="h-7 gap-1.5 font-mono text-xs px-2.5 border-slate-700 dark:border-slate-600"
            >
              <RefreshCw className={cn("w-3 h-3", initialLoading && "animate-spin")} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh((v) => !v)}
              className={cn(
                "h-7 font-mono text-xs px-2.5 border-slate-700 dark:border-slate-600",
                autoRefresh && "border-emerald-700/70 text-emerald-600 dark:text-emerald-400",
              )}
            >
              Auto {autoRefresh ? "ON" : "OFF"}
            </Button>
          </div>
        </div>

        {/* ── Search ── */}
        <div className="flex gap-2">
          <div className="relative flex-1 font-mono">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs select-none">
              &gt;
            </span>
            <Input
              placeholder="grep: user, action, endpoint…"
              value={draftSearch}
              onChange={(e) => setDraftSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSearch() }}
              className="pl-7 h-8 font-mono text-xs bg-transparent border-slate-700 dark:border-slate-600 placeholder:text-slate-600 focus-visible:ring-emerald-500/40"
            />
          </div>
          <Button size="sm" onClick={handleSearch} className="h-8 px-3 font-mono text-xs">
            <Search className="w-3 h-3 mr-1" />
            grep
          </Button>
          {(draftSearch || search) && (
            <Button size="sm" variant="ghost" onClick={handleClearSearch} className="h-8 px-2">
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        {/* ── Summary bar ── */}
        {summary && (
          <div className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-[11px] border-b border-slate-200 dark:border-slate-800 pb-2">
            <span>
              <span className="text-slate-500">events </span>
              <span className="text-sky-400 font-bold">{summary.auditEvents}</span>
            </span>
            <span>
              <span className="text-slate-500">api_req </span>
              <span className="text-slate-300 font-bold">{summary.totalRequests.toLocaleString("id-ID")}</span>
            </span>
            <span>
              <span className="text-slate-500">api_err </span>
              <span className={cn("font-bold", summary.totalErrors > 0 ? "text-rose-400" : "text-slate-500")}>
                {summary.totalErrors}
              </span>
            </span>
            <span>
              <span className="text-slate-500">avg_rt </span>
              <span className={cn("font-bold", summary.avgResponseTime > 800 ? "text-amber-400" : "text-emerald-400")}>
                {summary.avgResponseTime}ms
              </span>
            </span>
            {lastRefresh && (
              <span className="ml-auto">
                <span className="text-slate-600">polled </span>
                <span className="text-slate-500">{fmtTime(lastRefresh.toISOString())}</span>
              </span>
            )}
            {search && (
              <span>
                <span className="text-slate-600">grep </span>
                <span className="text-violet-400">&quot;{search}&quot;</span>
              </span>
            )}
          </div>
        )}

        {/* ── Error banner ── */}
        {fetchError && (
          <div className="font-mono text-xs bg-rose-950/40 border border-rose-700/60 text-rose-400 px-4 py-2 rounded">
            ✗ {fetchError}
          </div>
        )}

        {/* ── Main console panel ── */}
        <div className="flex-1 min-h-0 rounded-lg border border-slate-200 dark:border-slate-700/80 bg-[#0d1117] overflow-hidden flex flex-col shadow-sm relative">

          {/* Title bar */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-700/80 bg-[#161b22] shrink-0">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
            <span className="font-mono text-[11px] text-slate-500 ml-2 select-none">
              activity-monitor — {range} window
              {logLines.length > 0 && !initialLoading && (
                <span className="text-slate-600 ml-2">({logLines.length} events)</span>
              )}
            </span>
            {initialLoading && (
              <span className="ml-auto font-mono text-[10px] text-emerald-500/70 animate-pulse">
                loading…
              </span>
            )}
          </div>

          {/* Column header — inside the console, sticky */}
          {!initialLoading && logLines.length > 0 && showStream && (
            <div className="flex items-center px-4 py-1 font-mono text-[10px] text-slate-700 uppercase tracking-widest border-b border-slate-800 bg-[#0d1117] shrink-0 select-none">
              <span className="w-[68px]">time</span>
              <span className="w-[80px]">level</span>
              <span className="w-[108px]">category</span>
              <span>message</span>
            </div>
          )}

          {/* Scrollable log body */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto py-1">

            {/* Loading skeleton */}
            {initialLoading && (
              <div className="px-4 py-3 space-y-2">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-4 rounded bg-slate-800/70 animate-pulse"
                    style={{ width: `${50 + (i * 13) % 40}%` }}
                  />
                ))}
              </div>
            )}

            {/* Live audit stream */}
            {!initialLoading && showStream && (
              <>
                {logLines.length === 0 ? (
                  <div className="px-4 py-6 font-mono text-xs text-slate-700">
                    — no activity in the {range} window
                  </div>
                ) : (
                  logLines.map((line, idx) => (
                    <LogRow
                      key={line.id}
                      activity={line}
                      // Mark the most-recently-appended rows with a fade-in.
                      // We track "newness" by index: anything in the last batch
                      // is considered new. We don't store a separate set because
                      // it would cause extra renders; the animation plays once on mount.
                      isNew={idx >= logLines.length - 50 && !initialLoading}
                      onClick={() => setSelectedItem(line)}
                    />
                  ))
                )}
              </>
            )}

            {/* Metrics section (collapsible, below stream, not mixed in) */}
            {!initialLoading && showMetrics && displayMetricBuckets.length > 0 && (
              <div className="mt-2">
                <button
                  onClick={() => setMetricsOpen((v) => !v)}
                  className="w-full flex items-center gap-2 px-4 py-1.5 font-mono text-[10px] text-slate-600 hover:text-slate-400 uppercase tracking-widest transition-colors select-none"
                >
                  {metricsOpen
                    ? <ChevronDown className="w-3 h-3 shrink-0" />
                    : <ChevronRight className="w-3 h-3 shrink-0" />
                  }
                  <span>
                    api metrics — hourly aggregates ({displayMetricBuckets.length} buckets)
                    {typeFilter !== "errors" && (
                      <span className="ml-2 normal-case">
                        · not individual events · click to {metricsOpen ? "hide" : "expand"}
                      </span>
                    )}
                  </span>
                </button>

                {metricsOpen && displayMetricBuckets.map((bucket, i) => (
                  <MetricSummaryRow
                    key={`${bucket.endpoint}-${bucket.method}-${bucket.bucketDate}-${bucket.bucketHour}-${i}`}
                    bucket={bucket}
                    onClick={() => setSelectedItem(bucket)}
                  />
                ))}
              </div>
            )}

            {/* Cursor */}
            {!initialLoading && (
              <div className="flex items-center gap-1.5 px-4 py-3 font-mono text-xs text-emerald-600/60 select-none">
                <span>&gt;_</span>
                <span className={cn(
                  "w-[7px] h-[13px] bg-emerald-500/50 rounded-sm",
                  autoRefresh && "animate-pulse",
                )} />
              </div>
            )}

            {/* IntersectionObserver sentinel */}
            <div ref={sentinelRef} className="h-px" aria-hidden />
          </div>

          {/* "New logs" floating badge */}
          {pendingCount > 0 && !isAtBottom && (
            <button
              onClick={() => { scrollToBottom("smooth"); setPendingCount(0) }}
              className={cn(
                "absolute bottom-4 left-1/2 -translate-x-1/2",
                "flex items-center gap-2 px-4 py-2 rounded-full",
                "bg-emerald-900/90 border border-emerald-600/70 text-emerald-300",
                "font-mono text-xs font-bold shadow-xl hover:bg-emerald-800 transition-colors",
              )}
            >
              <ChevronDown className="w-3.5 h-3.5 animate-bounce" />
              {pendingCount} new event{pendingCount !== 1 ? "s" : ""}
              <ChevronDown className="w-3.5 h-3.5 animate-bounce" />
            </button>
          )}
        </div>

        {/* Footer */}
        <p className="font-mono text-[10px] text-slate-600 text-center pb-1 shrink-0">
          poll every {POLL_MS / 1000}s · incremental since_id · source: audit_logs (live) + request_metrics (aggregated) · read-only · superadmin only
        </p>
      </div>

      <DetailPanel item={selectedItem} onClose={() => setSelectedItem(null)} />
    </AdminShell>
  )
}
