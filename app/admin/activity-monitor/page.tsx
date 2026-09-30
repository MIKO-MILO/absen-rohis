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
import { RefreshCw, Search, X, Terminal, ChevronDown } from "lucide-react"

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

interface Summary {
  auditEvents: number
}

interface ApiResponse {
  summary: Summary
  auditActivities: AuditActivity[]
  pagination: { page: number; limit: number; auditTotal: number }
  generatedAt: string
}

type LogLine = AuditActivity

const POLL_MS = 3_000
const LOG_CAP = 500

type Range = "1h" | "6h" | "24h"

const RANGES: { value: Range; label: string }[] = [
  { value: "1h", label: "1h" },
  { value: "6h", label: "6h" },
  { value: "24h", label: "24h" },
]

const ACTION_META: Record<
  string,
  {
    category: string
    level: "INFO" | "SUCCESS" | "WARNING" | "ERROR"
  }
> = {
  login: { category: "AUTH", level: "SUCCESS" },
  logout: { category: "AUTH", level: "INFO" },
  generate_qr: { category: "QR", level: "INFO" },
  scan_qr: { category: "ATTENDANCE", level: "SUCCESS" },
  approve_absensi: { category: "ATTENDANCE", level: "SUCCESS" },
  update_config: { category: "CONFIG", level: "WARNING" },
  create_admin: { category: "ADMIN", level: "INFO" },
  update_admin: { category: "ADMIN", level: "WARNING" },
  delete_admin: { category: "ADMIN", level: "ERROR" },
  create_panitia: { category: "PANITIA", level: "INFO" },
  update_panitia: { category: "PANITIA", level: "WARNING" },
  delete_panitia: { category: "PANITIA", level: "ERROR" },
  create_siswa: { category: "SISWA", level: "INFO" },
  update_siswa: { category: "SISWA", level: "WARNING" },
  delete_siswa: { category: "SISWA", level: "ERROR" },
  start_impersonation: { category: "SECURITY", level: "WARNING" },
  stop_impersonation: { category: "SECURITY", level: "INFO" },
}

const ACTION_MSG: Record<string, string> = {
  login: "berhasil login",
  logout: "logout",
  generate_qr: "generate QR code",
  scan_qr: "melakukan absensi (scan QR)",
  approve_absensi: "approve absensi",
  update_config: "mengubah konfigurasi sistem",
  create_admin: "menambah admin baru",
  update_admin: "mengubah data admin",
  delete_admin: "menghapus admin",
  create_panitia: "menambah panitia baru",
  update_panitia: "mengubah data panitia",
  delete_panitia: "menghapus panitia",
  create_siswa: "menambah siswa baru",
  update_siswa: "mengubah data siswa",
  delete_siswa: "menghapus siswa",
  start_impersonation: "memulai impersonation",
  stop_impersonation: "mengakhiri impersonation",
}

const LEVEL_CLS: Record<string, { badge: string; msg: string; row: string }> = {
  INFO: {
    badge: "text-sky-400",
    msg: "text-slate-300",
    row: "",
  },
  SUCCESS: {
    badge: "text-emerald-400",
    msg: "text-emerald-200",
    row: "",
  },
  WARNING: {
    badge: "text-amber-400",
    msg: "text-amber-200",
    row: "",
  },
  ERROR: {
    badge: "text-rose-400",
    msg: "text-rose-200",
    row: "bg-rose-950/20",
  },
}

function getAuditMeta(action: string) {
  return ACTION_META[action] ?? { category: "SYSTEM", level: "INFO" as const }
}

function buildMessage(activity: AuditActivity): string {
  const base = ACTION_MSG[activity.action] ?? activity.action.replace(/_/g, " ")
  return activity.description ?? `${activity.actorName} ${base}`
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
  } catch {
    return "??:??:??"
  }
}

function fmtDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("id-ID", { hour12: false })
  } catch {
    return "—"
  }
}

function LogRow({
  activity,
  isNew,
  onClick,
}: {
  activity: AuditActivity
  isNew: boolean
  onClick: () => void
}) {
  const meta = getAuditMeta(activity.action)
  const cls = LEVEL_CLS[meta.level]
  const msg = buildMessage(activity)

  const levelTag = `[${meta.level.padEnd(7)}]`
  const categoryTag = `[${meta.category.padEnd(10)}]`

  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex w-full items-baseline px-4 py-0.75 text-left",
        "font-mono text-[12.5px] leading-[1.55] hover:bg-white/[0.035]",
        "rounded-xs transition-colors",
        cls.row,
        isNew && "animate-[termFadeIn_0.35s_ease_forwards]"
      )}
    >
      <span className="w-17 shrink-0 text-slate-600 tabular-nums select-none">
        {fmtTime(activity.timestamp)}
      </span>

      <span className={cn("w-20 shrink-0 font-bold", cls.badge)}>
        {levelTag}
      </span>

      <span className="w-27 shrink-0 text-slate-500">{categoryTag}</span>

      <span className={cn("min-w-0 flex-1 truncate", cls.msg)}>{msg}</span>

      <span className="shrink-0 pl-3 text-slate-800 transition-colors select-none group-hover:text-slate-500">
        ›
      </span>
    </button>
  )
}

function DetailPanel({
  item,
  onClose,
}: {
  item: AuditActivity | null
  onClose: () => void
}) {
  if (!item) return null

  const meta = getAuditMeta(item.action)
  const cls = LEVEL_CLS[meta.level]

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-xs"
        onClick={onClose}
      />
      <div className="relative z-10 flex h-full w-full max-w-sm flex-col border-l border-slate-700/80 bg-[#0e1117] font-mono shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-700/80 bg-[#161b22] px-5 py-3">
          <span className="text-[11px] font-bold tracking-widest text-slate-400 uppercase">
            {/* event detail */}
          </span>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-500 transition-colors hover:bg-slate-700/50 hover:text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-2.5 overflow-y-auto px-5 py-4 text-xs">
          <DR k="timestamp" v={fmtDateTime(item.timestamp)} />
          <DR k="level" v={meta.level} vc={cls.badge} />
          <DR k="category" v={`[${meta.category}]`} vc="text-slate-300" />
          <DR k="actor" v={item.actorName} vc="text-slate-100 font-semibold" />
          <DR k="role" v={item.actorRole.toUpperCase()} />
          <DR k="action" v={item.action} vc={cls.msg} />
          {item.targetType && <DR k="target_type" v={item.targetType} />}
          {item.targetId != null && (
            <DR k="target_id" v={String(item.targetId)} />
          )}
          {item.description && <DR k="description" v={item.description} />}
          <div className="border-t border-slate-800 pt-2">
            <DR k="source" v="audit_logs" vc="text-slate-600" />
          </div>
        </div>
      </div>
    </div>
  )
}

function DR({ k, v, vc }: { k: string; v: string; vc?: string }) {
  return (
    <div className="grid grid-cols-[100px_1fr] gap-2">
      <span className="truncate tracking-wide text-slate-700 uppercase">
        {k}
      </span>
      <span className={cn("break-all text-slate-400", vc)}>{v}</span>
    </div>
  )
}

export default function ActivityMonitorPage() {
  const [logLines, setLogLines] = useState<LogLine[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [lastAuditId, setLastAuditId] = useState<number | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const [initialLoading, setInitialLoading] = useState(true)
  const [polling, setPolling] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)

  const [range, setRange] = useState<Range>("1h")
  const [search, setSearch] = useState("")
  const [draftSearch, setDraftSearch] = useState("")

  const [selectedItem, setSelectedItem] = useState<AuditActivity | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)

  useLayoutEffect(() => {
    isAtBottomRef.current = isAtBottom
  }, [isAtBottom])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const io = new IntersectionObserver(
      ([entry]) => {
        const val = entry.isIntersecting
        setIsAtBottom(val)
        if (val) setPendingCount(0)
      },
      { root: scrollRef.current, threshold: 0.1 }
    )
    io.observe(sentinel)
    return () => io.disconnect()
  }, [])

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    sentinelRef.current?.scrollIntoView({ behavior, block: "end" })
  }, [])

  const doFullLoad = useCallback(
    async (opts: { range?: Range; search?: string } = {}) => {
      setInitialLoading(true)
      setFetchError(null)
      setPendingCount(0)

      const r = opts.range ?? range
      const s = opts.search ?? search

      try {
        const params = new URLSearchParams({
          range: r,
          type: "audit",
          page: "1",
          limit: "50",
          _t: Date.now().toString(),
        })
        if (s) params.set("search", s)

        const res = await fetch(`/api/admin/activity-monitor?${params}`, {
          credentials: "include",
          cache: "no-store",
        })

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            window.location.href = "/admin"
            return
          }
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.error || `HTTP ${res.status}`)
        }

        const json = (await res.json()) as ApiResponse
        const auditRows: LogLine[] = [...(json.auditActivities ?? [])].reverse()

        setLogLines(auditRows)
        setSummary(json.summary)
        setLastRefresh(new Date())

        const maxId = auditRows.reduce((m, a) => Math.max(m, a.id), 0)
        setLastAuditId(maxId > 0 ? maxId : null)
      } catch (e) {
        setFetchError(e instanceof Error ? e.message : "Gagal memuat data")
      } finally {
        setInitialLoading(false)
      }
    },

    [range, search]
  )

  const doPoll = useCallback(
    async (opts: { lastId: number | null; range: Range; search: string }) => {
      try {
        setPolling(true)

        const params = new URLSearchParams({
          type: "audit",
          limit: "50",
          _t: Date.now().toString(),
        })
        if (opts.lastId !== null) {
          params.set("since_id", String(opts.lastId))
        } else {
          params.set("range", opts.range)
        }
        if (opts.search) params.set("search", opts.search)

        const res = await fetch(`/api/admin/activity-monitor?${params}`, {
          credentials: "include",
          cache: "no-store",
        })
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            window.location.href = "/admin"
          }
          return
        }

        const json = (await res.json()) as ApiResponse

        let newRows: LogLine[] = json.auditActivities
        if (opts.lastId === null) {
          // If fallback to range, API returns descending, so we must reverse
          newRows = [...newRows].reverse()
        }

        setLastRefresh(new Date())

        if (newRows.length === 0) return

        const maxNewId = newRows.reduce((m, a) => Math.max(m, a.id), 0)
        setLastAuditId(maxNewId)

        setSummary((prev) => {
          if (!prev) return { auditEvents: newRows.length }
          return { auditEvents: prev.auditEvents + newRows.length }
        })

        setLogLines((prev) => {
          const merged = [...prev, ...newRows]
          return merged.length > LOG_CAP
            ? merged.slice(merged.length - LOG_CAP)
            : merged
        })

        if (!isAtBottomRef.current) {
          setPendingCount((c) => c + newRows.length)
        }
      } catch {
        /* silent */
      } finally {
        setPolling(false)
      }
    },
    []
  )

  useEffect(() => {
    const run = async () => {
      await doFullLoad({ range, search })
    }
    void run()
  }, [doFullLoad, range, search])

  useEffect(() => {
    if (isAtBottom && logLines.length > 0) scrollToBottom("smooth")
  }, [logLines.length, isAtBottom, scrollToBottom])

  useEffect(() => {
    if (!initialLoading && logLines.length > 0) scrollToBottom("instant")
  }, [initialLoading, scrollToBottom]) // eslint-disable-line react-hooks/exhaustive-deps

  const rangeRef = useRef(range)
  const searchRef = useRef(search)
  const lastAuditIdRef = useRef(lastAuditId)

  useEffect(() => {
    rangeRef.current = range
  }, [range])
  useEffect(() => {
    searchRef.current = search
  }, [search])
  useEffect(() => {
    lastAuditIdRef.current = lastAuditId
  }, [lastAuditId])

  useEffect(() => {
    if (!autoRefresh) return
    const iv = window.setInterval(() => {
      void doPoll({
        lastId: lastAuditIdRef.current,
        range: rangeRef.current,
        search: searchRef.current,
      })
    }, POLL_MS)
    return () => window.clearInterval(iv)
  }, [autoRefresh, doPoll])

  const applyRange = (r: Range) => {
    setRange(r)
    void doFullLoad({ range: r, search })
  }
  const handleSearch = () => {
    setSearch(draftSearch)
    void doFullLoad({ range, search: draftSearch })
  }
  const handleClearSearch = () => {
    setDraftSearch("")
    setSearch("")
    void doFullLoad({ range, search: "" })
  }

  return (
    <AdminShell requireSuperadmin>
      <style>{`
        @keyframes termFadeIn {
          from { opacity: 0; background-color: rgba(16,185,129,0.07); }
          to   { opacity: 1; background-color: transparent; }
        }
      `}</style>

      <div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-3 px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-auto flex min-w-0 items-center gap-2">
            <Terminal className="h-4 w-4 shrink-0 text-emerald-500" />
            <span className="font-mono text-sm font-bold tracking-tight text-slate-800 dark:text-slate-100">
              activity-monitor
            </span>
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded border px-2 py-0.5 font-mono text-[10px] font-bold",
                autoRefresh
                  ? "border-emerald-700/60 bg-emerald-950/60 text-emerald-400"
                  : "border-slate-700 bg-slate-800 text-slate-500"
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  autoRefresh ? "animate-pulse bg-emerald-400" : "bg-slate-500"
                )}
              />
              {autoRefresh ? "LIVE" : "PAUSED"}
            </span>
            {polling && (
              <span className="shrink-0 animate-pulse font-mono text-[10px] text-emerald-600 dark:text-emerald-500">
                polling…
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 font-mono text-[11px]">
            <span className="mr-1 hidden text-slate-500 sm:inline">range:</span>
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => applyRange(r.value)}
                className={cn(
                  "rounded border px-2 py-1 font-bold transition-all",
                  range === r.value
                    ? "border-slate-600 bg-slate-800 text-emerald-400 dark:border-slate-300 dark:bg-slate-200 dark:text-emerald-700"
                    : "border-slate-700 bg-transparent text-slate-500 hover:border-slate-500 hover:text-slate-300 dark:border-slate-600"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>

          <div className="flex shrink-0 gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void doFullLoad({ range, search })}
              disabled={initialLoading}
              className="h-7 gap-1.5 border-slate-700 px-2.5 font-mono text-xs dark:border-slate-600"
            >
              <RefreshCw
                className={cn("h-3 w-3", initialLoading && "animate-spin")}
              />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh((v) => !v)}
              className={cn(
                "h-7 border-slate-700 px-2.5 font-mono text-xs dark:border-slate-600",
                autoRefresh &&
                  "border-emerald-700/70 text-emerald-600 dark:text-emerald-400"
              )}
            >
              Auto {autoRefresh ? "ON" : "OFF"}
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1 font-mono">
            <span className="absolute top-1/2 left-3 -translate-y-1/2 text-xs text-slate-500 select-none">
              &gt;
            </span>
            <Input
              placeholder="grep: user, action, description…"
              value={draftSearch}
              onChange={(e) => setDraftSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch()
              }}
              className="h-8 border-slate-700 bg-transparent pl-7 font-mono text-xs placeholder:text-slate-600 focus-visible:ring-emerald-500/40 dark:border-slate-600"
            />
          </div>
          <Button
            size="sm"
            onClick={handleSearch}
            className="h-8 px-3 font-mono text-xs"
          >
            <Search className="mr-1 h-3 w-3" />
            grep
          </Button>
          {(draftSearch || search) && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClearSearch}
              className="h-8 px-2"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {summary && (
          <div className="flex flex-wrap gap-x-5 gap-y-1 border-b border-slate-200 pb-2 font-mono text-[11px] dark:border-slate-800">
            <span>
              <span className="text-slate-500">events </span>
              <span className="font-bold text-sky-400">
                {summary.auditEvents}
              </span>
            </span>
            {lastRefresh && (
              <span className="ml-auto">
                <span className="text-slate-600">polled </span>
                <span className="text-slate-500">
                  {fmtTime(lastRefresh.toISOString())}
                </span>
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

        {fetchError && (
          <div className="rounded border border-rose-700/60 bg-rose-950/40 px-4 py-2 font-mono text-xs text-rose-400">
            ✗ {fetchError}
          </div>
        )}

        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-200 bg-[#0d1117] shadow-sm dark:border-slate-700/80">
          <div className="flex shrink-0 items-center gap-2 border-b border-slate-700/80 bg-[#161b22] px-4 py-2">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
            <span className="ml-2 font-mono text-[11px] text-slate-500 select-none">
              activity-monitor — {range} window
              {logLines.length > 0 && !initialLoading && (
                <span className="ml-2 text-slate-600">
                  ({logLines.length} events)
                </span>
              )}
            </span>
            {initialLoading && (
              <span className="ml-auto animate-pulse font-mono text-[10px] text-emerald-500/70">
                loading…
              </span>
            )}
          </div>

          {!initialLoading && logLines.length > 0 && (
            <div className="flex shrink-0 items-center border-b border-slate-800 bg-[#0d1117] px-4 py-1 font-mono text-[10px] tracking-widest text-slate-700 uppercase select-none">
              <span className="w-17">time</span>
              <span className="w-20">level</span>
              <span className="w-27">category</span>
              <span>message</span>
            </div>
          )}

          <div ref={scrollRef} className="flex-1 overflow-y-auto py-1">
            {initialLoading && (
              <div className="space-y-2 px-4 py-3">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-4 animate-pulse rounded bg-slate-800/70"
                    style={{ width: `${50 + ((i * 13) % 40)}%` }}
                  />
                ))}
              </div>
            )}

            {!initialLoading && (
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
                      isNew={idx >= logLines.length - 50 && !initialLoading}
                      onClick={() => setSelectedItem(line)}
                    />
                  ))
                )}
              </>
            )}

            {!initialLoading && (
              <div className="flex items-center gap-1.5 px-4 py-3 font-mono text-xs text-emerald-600/60 select-none">
                <span>&gt;_</span>
                <span
                  className={cn(
                    "h-3.25 w-1.75 rounded-sm bg-emerald-500/50",
                    autoRefresh && "animate-pulse"
                  )}
                />
              </div>
            )}

            <div ref={sentinelRef} className="h-px" aria-hidden />
          </div>

          {pendingCount > 0 && !isAtBottom && (
            <button
              onClick={() => {
                scrollToBottom("smooth")
                setPendingCount(0)
              }}
              className={cn(
                "absolute bottom-4 left-1/2 -translate-x-1/2",
                "flex items-center gap-2 rounded-full px-4 py-2",
                "border border-emerald-600/70 bg-emerald-900/90 text-emerald-300",
                "font-mono text-xs font-bold shadow-xl transition-colors hover:bg-emerald-800"
              )}
            >
              <ChevronDown className="h-3.5 w-3.5 animate-bounce" />
              {pendingCount} new event{pendingCount !== 1 ? "s" : ""}
              <ChevronDown className="h-3.5 w-3.5 animate-bounce" />
            </button>
          )}
        </div>

        <p className="shrink-0 pb-1 text-center font-mono text-[10px] text-slate-600">
          poll every {POLL_MS / 1000}s · incremental since_id · source:
          audit_logs · read-only · superadmin only
        </p>
      </div>

      <DetailPanel item={selectedItem} onClose={() => setSelectedItem(null)} />
    </AdminShell>
  )
}
