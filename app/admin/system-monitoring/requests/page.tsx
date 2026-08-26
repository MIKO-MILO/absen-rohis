"use client"

import { useEffect, useMemo, useState, useCallback, useTransition, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AdminShell } from "@/app/admin/_components/AdminShell"
import { MonitoringSubNav } from "../_components/MonitoringSubNav"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type Range = "today" | "24h" | "7d" | "30d" | "custom"
type SortKey =
  | "total_requests"
  | "success_count"
  | "error_count"
  | "error_rate"
  | "avg_response_time"
  | "endpoint"
type SortDir = "asc" | "desc"

interface Row {
  endpoint: string
  method: string
  totalRequests: number
  successCount: number
  errorCount: number
  errorRate: number
  averageResponseTime: number
}

interface Response {
  data: Row[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
  filters: {
    range: Range
    method: string | null
    search: string | null
    sort: SortKey
    dir: SortDir
    from: string
    to: string
  }
}

const RANGES: { value: Range; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "24h", label: "Last 24 Hours" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "custom", label: "Custom…" },
]

const METHODS: Array<{ value: string; label: string }> = [
  { value: "", label: "All Methods" },
  { value: "GET", label: "GET" },
  { value: "POST", label: "POST" },
  { value: "PUT", label: "PUT" },
  { value: "PATCH", label: "PATCH" },
  { value: "DELETE", label: "DELETE" },
]

const LIMITS = [10, 20, 50, 100]

function fmtId(v: number): string {
  return v.toLocaleString("id-ID")
}

function toISOInputDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function SystemMonitoringRequestsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const initialRange = (searchParams.get("range") as Range | null) ?? "today"
  const initialMethod = searchParams.get("method") ?? ""
  const initialSearch = searchParams.get("search") ?? ""
  const initialPage = parseInt(searchParams.get("page") || "1", 10) || 1
  const initialLimit = parseInt(searchParams.get("limit") || "20", 10) || 20
  const initialSort = (searchParams.get("sort") as SortKey) || "total_requests"
  const initialDir = (searchParams.get("dir") as SortDir) || "desc"
  const initialFrom = searchParams.get("from") ?? toISOInputDate(new Date())
  const initialTo = searchParams.get("to") ?? toISOInputDate(new Date())

  const [range, setRange] = useState<Range>(initialRange)
  const [method, setMethod] = useState<string>(initialMethod)
  const [search, setSearch] = useState<string>(initialSearch)
  const [debouncedSearch, setDebouncedSearch] = useState<string>(initialSearch)
  const [page, setPage] = useState<number>(initialPage)
  const [limit, setLimit] = useState<number>(initialLimit)
  const [sort, setSort] = useState<SortKey>(initialSort)
  const [dir, setDir] = useState<SortDir>(initialDir)
  const [from, setFrom] = useState<string>(initialFrom)
  const [to, setTo] = useState<string>(initialTo)

  const [resp, setResp] = useState<Response | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  // debounce search
  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => window.clearTimeout(id)
  }, [search])

  const buildQueryStr = useCallback(
    (overrides: Partial<{ range: Range; method: string; search: string; page: number; limit: number; sort: SortKey; dir: SortDir; from: string; to: string }> = {}) => {
      const r = overrides.range ?? range
      const m = overrides.method ?? method
      const s = overrides.search ?? debouncedSearch
      const p = overrides.page ?? page
      const li = overrides.limit ?? limit
      const so = overrides.sort ?? sort
      const di = overrides.dir ?? dir
      const fr = overrides.from ?? from
      const t = overrides.to ?? to
      const sp = new URLSearchParams()
      sp.set("range", r)
      if (m) sp.set("method", m)
      if (s) sp.set("search", s)
      sp.set("page", String(p))
      sp.set("limit", String(li))
      sp.set("sort", so)
      sp.set("dir", di)
      if (r === "custom") {
        sp.set("from", fr)
        sp.set("to", t)
      }
      return sp.toString()
    },
    [range, method, debouncedSearch, page, limit, sort, dir, from, to],
  )

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const qs = buildQueryStr()
      const res = await fetch(`/api/admin/system-monitoring/requests?${qs}`, { cache: "no-store" })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || `HTTP ${res.status}`)
      }
      const json = (await res.json()) as Response
      setResp(json)
    } catch (e) {
      console.error("[Request Monitor] fetch error:", e)
      setError(e instanceof Error ? e.message : "Gagal memuat data")
    } finally {
      setLoading(false)
    }
  }, [buildQueryStr])

  useEffect(() => {
    (async () => {
      await fetchData()
    })()
  }, [fetchData])

  // Sync URL whenever filter state changes
  useEffect(() => {
    const qs = buildQueryStr()
    startTransition(() => {
      // shallow-like update via replace for copyable URL
      router.replace(`/admin/system-monitoring/requests?${qs}`, { scroll: false })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, method, debouncedSearch, page, limit, sort, dir, from, to])

  const rows = useMemo(() => resp?.data ?? [], [resp]);
  const pagination = resp?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 1 }

  const totals = useMemo(() => {
    let req = 0
    let suc = 0
    let err = 0
    let rtSum = 0
    let rtCnt = 0
    for (const r of rows) {
      req += r.totalRequests
      suc += r.successCount
      err += r.errorCount
      rtSum += r.averageResponseTime * r.totalRequests
      rtCnt += r.totalRequests
    }
    return {
      req,
      suc,
      err,
      errRate: req > 0 ? (err / req) * 100 : 0,
      avgRt: rtCnt > 0 ? Math.round(rtSum / rtCnt) : 0,
    }
  }, [rows])

  const onSort = (key: SortKey) => {
    if (sort === key) {
      setDir(dir === "asc" ? "desc" : "asc")
    } else {
      setSort(key)
      setDir("desc")
    }
    setPage(1)
  }

  const sortIcon = (key: SortKey) =>
    sort !== key ? "⇅" : dir === "asc" ? "▲" : "▼"

  const safePage = Math.min(page, pagination.totalPages)

  return (
    <AdminShell requireSuperadmin>
      <div className="flex flex-col gap-6 py-5 px-4 md:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              Request Monitor
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Statistik request API agregasi per endpoint.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchData()}
            disabled={loading}
            className="gap-2"
          >
            <span aria-hidden className={cn("inline-block", loading && "animate-spin")}>
              ↻
            </span>
            Refresh
          </Button>
        </div>

        <MonitoringSubNav />

        {/* ── Summary stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Filtered Requests</p>
            <p className="text-2xl font-bold tabular-nums">{loading ? "…" : fmtId(totals.req)}</p>
          </div>
          <div className="bg-white dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Success</p>
            <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {loading ? "…" : fmtId(totals.suc)}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Errors</p>
            <p className="text-2xl font-bold tabular-nums text-rose-600 dark:text-rose-400">
              {loading ? "…" : fmtId(totals.err)}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Avg RT (filtered)</p>
            <p className="text-2xl font-bold tabular-nums">{loading ? "…" : `${totals.avgRt} ms`}</p>
          </div>
        </div>

        {/* ── Filter bar ── */}
        <Card className="border-slate-200 dark:border-slate-700">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-3">
                <label className="block text-xs font-medium mb-1 text-slate-600 dark:text-slate-300">
                  Range
                </label>
                <select
                  value={range}
                  onChange={(e) => {
                    setRange(e.target.value as Range)
                    setPage(1)
                  }}
                  className="w-full h-9 px-3 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                >
                  {RANGES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              {range === "custom" && (
                <>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium mb-1 text-slate-600 dark:text-slate-300">
                      From
                    </label>
                    <Input
                      type="date"
                      value={from}
                      onChange={(e) => {
                        setFrom(e.target.value)
                        setPage(1)
                      }}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium mb-1 text-slate-600 dark:text-slate-300">
                      To
                    </label>
                    <Input
                      type="date"
                      value={to}
                      onChange={(e) => {
                        setTo(e.target.value)
                        setPage(1)
                      }}
                    />
                  </div>
                </>
              )}
              <div className="md:col-span-2">
                <label className="block text-xs font-medium mb-1 text-slate-600 dark:text-slate-300">
                  Method
                </label>
                <select
                  value={method}
                  onChange={(e) => {
                    setMethod(e.target.value)
                    setPage(1)
                  }}
                  className="w-full h-9 px-3 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                >
                  {METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-medium mb-1 text-slate-600 dark:text-slate-300">
                  Search endpoint
                </label>
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="/api/auth/session, /api/absensi, …"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-700/60 text-rose-700 dark:text-rose-200 p-3 rounded-md text-sm">
            ⚠ {error}
          </div>
        )}

        {/* ── Table ── */}
        <Card className="border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Endpoint Statistics</CardTitle>
            <CardDescription>
              Total {loading ? "…" : `${fmtId(pagination.total)} endpoint × method combination${pagination.total === 1 ? "" : "s"}.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wide border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left px-5 py-3 font-semibold cursor-pointer select-none" onClick={() => onSort("endpoint")}>
                      Endpoint <span className="ml-1 opacity-60">{sortIcon("endpoint")}</span>
                    </th>
                    <th className="px-3 py-3 w-20 font-semibold">Method</th>
                    <th className="text-right px-3 py-3 font-semibold cursor-pointer select-none" onClick={() => onSort("total_requests")}>
                      Requests <span className="ml-1 opacity-60">{sortIcon("total_requests")}</span>
                    </th>
                    <th className="text-right px-3 py-3 font-semibold cursor-pointer select-none" onClick={() => onSort("success_count")}>
                      Success <span className="ml-1 opacity-60">{sortIcon("success_count")}</span>
                    </th>
                    <th className="text-right px-3 py-3 font-semibold cursor-pointer select-none" onClick={() => onSort("error_count")}>
                      Errors <span className="ml-1 opacity-60">{sortIcon("error_count")}</span>
                    </th>
                    <th className="text-right px-3 py-3 font-semibold cursor-pointer select-none" onClick={() => onSort("error_rate")}>
                      Error % <span className="ml-1 opacity-60">{sortIcon("error_rate")}</span>
                    </th>
                    <th className="text-right px-5 py-3 font-semibold cursor-pointer select-none" onClick={() => onSort("avg_response_time")}>
                      Avg RT <span className="ml-1 opacity-60">{sortIcon("avg_response_time")}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-16 text-center text-slate-400">
                        Loading…
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-16 text-center text-slate-400">
                        Tidak ada data untuk filter ini.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r, i) => (
                      <tr
                        key={`${r.endpoint}${r.method}${i}`}
                        className="border-b border-slate-100 dark:border-slate-700/70 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      >
                        <td className="px-5 py-3 font-mono text-xs text-slate-700 dark:text-slate-200 truncate max-w-90">
                          {r.endpoint}
                        </td>
                        <td className="px-3 py-3">
                          <Badge
                            variant="outline"
                            className={cn(
                              "font-mono text-[10px] uppercase border",
                              r.method === "GET"
                                ? "text-sky-700 border-sky-200 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-700"
                                : r.method === "POST"
                                  ? "text-emerald-700 border-emerald-200 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700"
                                  : r.method === "PUT" || r.method === "PATCH"
                                    ? "text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700"
                                    : r.method === "DELETE"
                                      ? "text-rose-700 border-rose-200 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-700"
                                      : "text-slate-700 border-slate-200 bg-white dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600",
                            )}
                          >
                            {r.method}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums font-semibold">{fmtId(r.totalRequests)}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-emerald-600 dark:text-emerald-400">{fmtId(r.successCount)}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-rose-600 dark:text-rose-400 font-semibold">{fmtId(r.errorCount)}</td>
                        <td className="px-3 py-3 text-right tabular-nums">
                          <span
                            className={cn(
                              "font-semibold",
                              r.errorRate >= 15
                                ? "text-rose-600 dark:text-rose-400"
                                : r.errorRate >= 5
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-slate-500 dark:text-slate-400",
                            )}
                          >
                            {r.errorRate.toFixed(2)}%
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-slate-600 dark:text-slate-300">
                          <span
                            className={cn(
                              r.averageResponseTime > 800
                                ? "text-rose-600 dark:text-rose-400 font-semibold"
                                : r.averageResponseTime > 300
                                  ? "text-amber-600 dark:text-amber-400 font-medium"
                                  : "",
                            )}
                          >
                            {r.averageResponseTime} ms
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* ── Pagination ── */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-5 py-3 border-t border-slate-200 dark:border-slate-700 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 dark:text-slate-400">Show</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(parseInt(e.target.value, 10) || 20)
                    setPage(1)
                  }}
                  className="h-8 px-2 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                >
                  {LIMITS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
                <span className="text-slate-500 dark:text-slate-400">
                  · Page {safePage} / {pagination.totalPages} of {fmtId(pagination.total)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage <= 1 || loading}
                  onClick={() => setPage(1)}
                >
                  « First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage <= 1 || loading}
                  onClick={() => setPage(safePage - 1)}
                >
                  ‹ Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage >= pagination.totalPages || loading}
                  onClick={() => setPage(safePage + 1)}
                >
                  Next ›
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage >= pagination.totalPages || loading}
                  onClick={() => setPage(pagination.totalPages)}
                >
                  Last »
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  )
}

export default function SystemMonitoringRequestsPage() {
  return (
    <Suspense fallback={
      <AdminShell requireSuperadmin>
        <div className="flex flex-col gap-6 py-5 px-4 md:px-6">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </AdminShell>
    }>
      <SystemMonitoringRequestsContent />
    </Suspense>
  )
}
