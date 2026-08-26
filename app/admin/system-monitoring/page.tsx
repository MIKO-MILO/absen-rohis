"use client"

import { useEffect, useMemo, useState, useCallback, useRef } from "react"
import Link from "next/link"
import { AdminShell } from "@/app/admin/_components/AdminShell"
import { MonitoringSubNav } from "./_components/MonitoringSubNav"
import { MonitoringStatCard } from "./_components/MonitoringStatCard"
import { RequestLineChart } from "./_components/RequestLineChart"
import { StatusBadge } from "./_components/StatusBadge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type Range = "today" | "24h" | "7d" | "30d"

interface TopEP {
  endpoint: string
  method: string
  totalRequests: number
  successCount: number
  errorCount: number
  errorRate: number
  averageResponseTime: number
}

interface TrendBucket {
  bucketLabel: string
  totalRequests: number
  successCount: number
  errorCount: number
  totalResponseTime: number
}

interface Overview {
  range: Range
  stats: {
    totalRequests: number
    successCount: number
    errorCount: number
    successRate: number
    errorRate: number
    averageResponseTime: number
  }
  comparison: {
    todayRequests: number
    yesterdayRequests: number
    changePct: number
  }
  topEndpoints: TopEP[]
  mostErrorEndpoints: TopEP[]
  requestTrend: TrendBucket[]
  systemStatus: "HEALTHY" | "DEGRADED" | "CRITICAL"
  generatedAt: string
}

interface CleanupResult {
  request_metrics_deleted?: number
  rate_limit_buckets_deleted?: number
  executed_at: string
}

const RANGES: { value: Range; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "24h", label: "Last 24 Hours" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
]

const REFRESH_MS = 45_000 // 45s, sesuai requirement "30-60 detik"

function fmtId(v: number): string {
  return v.toLocaleString("id-ID")
}

export default function SystemMonitoringOverviewPage() {
  const [range, setRange] = useState<Range>("today")
  const [data, setData] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const isFetchingRef = useRef(false)

  // ─── Cleanup states (Superadmin Only) ──────────────────────────────────
  const [retentionDays, setRetentionDays] = useState<number>(90)
  const [cleanupLoading, setCleanupLoading] = useState(false)
  const [cleanupResult, setCleanupResult] = useState<CleanupResult | null>(null)
  const [cleanupError, setCleanupError] = useState<string | null>(null)

  const handleCleanup = async () => {
    if (
      !window.confirm(
        `Apakah Anda yakin ingin menghapus data monitoring yang lebih tua dari ${retentionDays} hari?`
      )
    ) {
      return
    }
    try {
      setCleanupLoading(true)
      setCleanupError(null)
      setCleanupResult(null)
      const res = await fetch("/api/admin/system-monitoring/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ retentionDays }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || `HTTP ${res.status}`)
      }
      const json = await res.json()
      setCleanupResult(json.deleted)
    } catch (e) {
      console.error(e)
      setCleanupError(
        e instanceof Error ? e.message : "Gagal menjalankan cleanup"
      )
    } finally {
      setCleanupLoading(false)
    }
  }

  const fetchData = useCallback(
    async (options?: { force?: boolean }) => {
      if (isFetchingRef.current && !options?.force) return
      isFetchingRef.current = true
      try {
        setLoading(true)
        setError(null)
        const url = `/api/admin/system-monitoring/overview?range=${range}`
        const res = await fetch(url, { cache: "no-store" })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.error || `HTTP ${res.status}`)
        }
        const json = (await res.json()) as Overview
        setData(json)
        setLastRefresh(new Date())
      } catch (e) {
        console.error("[Monitoring Overview] Fetch error:", e)
        setError(e instanceof Error ? e.message : "Gagal memuat data")
      } finally {
        setLoading(false)
        isFetchingRef.current = false
      }
    },
    [range]
  )

  useEffect(() => {
    queueMicrotask(() => {
      void fetchData()
    })
    const iv = window.setInterval(() => {
      void fetchData()
    }, REFRESH_MS)
    return () => window.clearInterval(iv)
  }, [fetchData])

  const topEp = data?.topEndpoints ?? []
  const errorEps = data?.mostErrorEndpoints ?? []
  const stats = data?.stats
  const comparison = data?.comparison

  const changePositive = useMemo(
    () => (comparison ? comparison.changePct >= 0 : true),
    [comparison]
  )

  return (
    <AdminShell requireSuperadmin>
      <div className="flex flex-col gap-6 px-4 py-5 md:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white">
              System Monitoring
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Ringkasan performa, request API, dan kesehatan sistem secara
              real-time.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {data?.systemStatus && (
              <StatusBadge status={data.systemStatus} size="lg" />
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => void fetchData({ force: true })}
              disabled={loading}
              className="gap-2"
            >
              <span
                aria-hidden
                className={cn("inline-block", loading && "animate-spin")}
              >
                ↻
              </span>
              Refresh
            </Button>
            {lastRefresh && (
              <span className="text-xs text-slate-400">
                Updated {lastRefresh.toLocaleTimeString("id-ID")}
              </span>
            )}
          </div>
        </div>

        <MonitoringSubNav />

        {/* ── Range selector ── */}
        <div className="flex flex-wrap gap-2">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={cn(
                "rounded-md border px-4 py-1.5 text-sm font-medium transition-colors",
                range === r.value
                  ? "border-transparent bg-linear-to-r from-[#4d9284] to-[#356b60] text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-700/60 dark:bg-rose-900/20 dark:text-rose-200">
            ⚠ {error}
          </div>
        )}

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MonitoringStatCard
            label="Total Requests"
            value={loading ? "…" : fmtId(stats?.totalRequests ?? 0)}
            sublabel={`${range === "today" ? "Hari ini" : RANGES.find((r) => r.value === range)?.label}`}
            trend={
              comparison && range === "today"
                ? {
                    label: `${changePositive ? "+" : ""}${comparison.changePct.toFixed(1)}% vs yesterday`,
                    positive: changePositive,
                  }
                : undefined
            }
            accent="info"
            icon="📡"
          />
          <MonitoringStatCard
            label="Success Rate"
            value={loading ? "…" : `${(stats?.successRate ?? 100).toFixed(1)}%`}
            sublabel={`${fmtId(stats?.successCount ?? 0)} success`}
            accent="success"
            icon="✔"
          />
          <MonitoringStatCard
            label="Error Rate"
            value={loading ? "…" : `${(stats?.errorRate ?? 0).toFixed(1)}%`}
            sublabel={`${fmtId(stats?.errorCount ?? 0)} failed requests`}
            accent={(stats?.errorCount ?? 0) > 0 ? "error" : "default"}
            icon="⚠"
          />
          <MonitoringStatCard
            label="Avg Response Time"
            value={loading ? "…" : `${stats?.averageResponseTime ?? 0} ms`}
            sublabel="Aggregated per endpoint"
            accent={
              (stats?.averageResponseTime ?? 0) > 500 ? "warning" : "default"
            }
            icon="⏱"
          />
        </div>

        {/* ── Request Trend Chart ── */}
        <Card className="border-slate-200 dark:border-slate-700">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">
                Request Activity
              </CardTitle>
              <CardDescription>
                Total request per{" "}
                {RANGES.find((r) => r.value === range)?.label.toLowerCase()}.
              </CardDescription>
            </div>
            {data && (
              <Link
                href="/admin/system-monitoring/requests"
                className="text-sm font-medium text-teal-600 hover:underline dark:text-teal-400"
              >
                View all endpoints →
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {loading && !data ? (
              <div className="flex h-60 items-center justify-center text-slate-400">
                Loading…
              </div>
            ) : (
              <RequestLineChart data={data?.requestTrend ?? []} />
            )}
          </CardContent>
        </Card>

        {/* ── Top endpoints + Most errors ── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                Top Endpoints
              </CardTitle>
              <CardDescription>
                10 endpoint dengan request terbanyak.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      <th className="px-5 py-3 font-medium">Endpoint</th>
                      <th className="w-16 px-3 py-3 font-medium">Method</th>
                      <th className="w-28 px-3 py-3 text-right font-medium">
                        Requests
                      </th>
                      <th className="w-24 px-3 py-3 text-right font-medium">
                        Error %
                      </th>
                      <th className="w-24 px-5 py-3 text-right font-medium">
                        Avg RT
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading || topEp.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-5 py-10 text-center text-slate-400"
                        >
                          {loading ? "Loading…" : "Belum ada data."}
                        </td>
                      </tr>
                    ) : (
                      topEp.map((e) => (
                        <tr
                          key={`${e.endpoint}${e.method}`}
                          className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-700/70 dark:hover:bg-slate-800/40"
                        >
                          <td className="max-w-70 truncate px-5 py-3 font-mono text-xs text-slate-700 dark:text-slate-200">
                            <Link
                              href={`/admin/system-monitoring/requests?search=${encodeURIComponent(e.endpoint)}`}
                              className="hover:text-teal-600 hover:underline dark:hover:text-teal-400"
                            >
                              {e.endpoint}
                            </Link>
                          </td>
                          <td className="px-3 py-3">
                            <Badge
                              variant="outline"
                              className={cn(
                                "border font-mono text-[10px] uppercase",
                                e.method === "GET"
                                  ? "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-700 dark:bg-sky-900/30 dark:text-sky-300"
                                  : e.method === "POST"
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                                    : e.method === "DELETE"
                                      ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                                      : "border-slate-200 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
                              )}
                            >
                              {e.method}
                            </Badge>
                          </td>
                          <td className="px-3 py-3 text-right font-semibold tabular-nums">
                            {fmtId(e.totalRequests)}
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums">
                            <span
                              className={cn(
                                "font-semibold",
                                e.errorRate >= 15
                                  ? "text-rose-600 dark:text-rose-400"
                                  : e.errorRate >= 5
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "text-emerald-600 dark:text-emerald-400"
                              )}
                            >
                              {e.errorRate.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right text-slate-600 tabular-nums dark:text-slate-300">
                            {e.averageResponseTime} ms
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                Most Error Endpoints
              </CardTitle>
              <CardDescription>
                Endpoint dengan jumlah error terbanyak.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      <th className="px-5 py-3 font-medium">Endpoint</th>
                      <th className="w-16 px-3 py-3 font-medium">Method</th>
                      <th className="w-20 px-3 py-3 text-right font-medium">
                        Errors
                      </th>
                      <th className="w-28 px-5 py-3 text-right font-medium">
                        % of Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading || errorEps.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-5 py-10 text-center text-slate-400"
                        >
                          {loading ? "Loading…" : "Tidak ada error. 🎉"}
                        </td>
                      </tr>
                    ) : (
                      errorEps.map((e) => (
                        <tr
                          key={`${e.endpoint}${e.method}`}
                          className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-700/70 dark:hover:bg-slate-800/40"
                        >
                          <td className="max-w-70 truncate px-5 py-3 font-mono text-xs text-slate-700 dark:text-slate-200">
                            {e.endpoint}
                          </td>
                          <td className="px-3 py-3">
                            <span className="font-mono text-[10px] text-slate-500 uppercase dark:text-slate-400">
                              {e.method}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right font-semibold text-rose-600 tabular-nums dark:text-rose-400">
                            {fmtId(e.errorCount)}
                          </td>
                          <td className="px-5 py-3 text-right tabular-nums">
                            {e.errorRate.toFixed(1)}%
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Cleanup Settings (Superadmin Only) ── */}
        <Card className="border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <span>🧹</span> Data Retention & Cleanup Settings
            </CardTitle>
            <CardDescription>
              Bersihkan data metrik historis dan sisa rate limiter yang sudah
              kadaluarsa secara manual.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="w-48">
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Retention Period (Days)
                </label>
                <select
                  value={retentionDays}
                  onChange={(e) => setRetentionDays(Number(e.target.value))}
                  className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value={30}>30 Hari (Direkomendasikan)</option>
                  <option value={60}>60 Hari</option>
                  <option value={90}>90 Hari (Default)</option>
                  <option value={180}>180 Hari</option>
                  <option value={365}>365 Hari</option>
                </select>
              </div>
              <Button
                onClick={handleCleanup}
                disabled={cleanupLoading}
                className="bg-rose-600 font-medium text-white shadow-xs hover:bg-rose-700 dark:bg-rose-700 dark:hover:bg-rose-800"
              >
                {cleanupLoading ? "Cleaning up..." : "Run Cleanup"}
              </Button>
            </div>

            {cleanupError && (
              <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-700/60 dark:bg-rose-900/20 dark:text-rose-200">
                ⚠ {cleanupError}
              </div>
            )}

            {cleanupResult && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                <p className="font-bold">Cleanup berhasil dijalankan!</p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-xs">
                  <li>
                    Metrics dihapus:{" "}
                    <span className="font-mono font-bold">
                      {fmtId(cleanupResult.request_metrics_deleted ?? 0)}
                    </span>{" "}
                    rows
                  </li>
                  <li>
                    Rate limit buckets dihapus:{" "}
                    <span className="font-mono font-bold">
                      {cleanupResult.rate_limit_buckets_deleted !== undefined
                        ? fmtId(cleanupResult.rate_limit_buckets_deleted)
                        : "—"}
                    </span>{" "}
                    rows
                  </li>
                  <li>
                    Waktu eksekusi:{" "}
                    <span className="font-mono">
                      {new Date(cleanupResult.executed_at).toLocaleString(
                        "id-ID"
                      )}
                    </span>
                  </li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="pt-2 text-center text-xs text-slate-400">
          Auto refresh setiap {Math.round(REFRESH_MS / 1000)} detik. Data
          metrics dihitung secara agregat per jam.
        </p>
      </div>
    </AdminShell>
  )
}
