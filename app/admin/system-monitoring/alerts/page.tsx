"use client"

import { useEffect, useState, useCallback } from "react"
import { AdminShell } from "@/app/admin/_components/AdminShell"
import { MonitoringSubNav } from "../_components/MonitoringSubNav"
import { StatusBadge } from "../_components/StatusBadge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type SystemStatus = "HEALTHY" | "DEGRADED" | "CRITICAL"

interface ActiveAlert {
  id: string
  ruleName: string
  endpoint: string
  method: string
  metric: string
  thresholdValue: number
  currentValue: number
  severity: "WARNING" | "CRITICAL"
  triggeredAt: string
}

interface AlertRule {
  id: string
  name: string
  metric: string
  operator: string
  threshold: number
  severity: "WARNING" | "CRITICAL"
  minRequests: number
}

interface ApiResponse {
  activeAlerts: ActiveAlert[]
  rules: AlertRule[]
  systemStatus: SystemStatus
  range: string
  generatedAt: string
}

export default function AlertsPage() {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [range, setRange] = useState("24h")

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/admin/system-monitoring/alerts?range=${range}`, { cache: "no-store" })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || `HTTP ${res.status}`)
      }
      const json = await res.json()
      setData(json)
    } catch (e) {
      console.error("[Alerts Monitor] fetch error:", e)
      setError(e instanceof Error ? e.message : "Gagal memuat data")
    } finally {
      setLoading(false)
    }
  }, [range])

  useEffect(() => {
    void (async () => {
      await fetchData()
    })()
  }, [fetchData])

  const alerts = data?.activeAlerts ?? []
  const rules = data?.rules ?? []
  const status = data?.systemStatus ?? "HEALTHY"

  return (
    <AdminShell requireSuperadmin>
      <div className="flex flex-col gap-6 py-5 px-4 md:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              System Alerts
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Notifikasi real-time dan peringatan ketika performa atau tingkat kegagalan API melewati ambang batas.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={status} size="lg" />
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
        </div>

        <MonitoringSubNav />

        {/* ── Range Selector ── */}
        <div className="flex flex-wrap gap-2">
          {[
            { value: "today", label: "Today" },
            { value: "24h", label: "Last 24 Hours" },
            { value: "7d", label: "Last 7 Days" },
          ].map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-medium border transition-colors",
                range === r.value
                  ? "bg-linear-to-r from-[#4d9284] to-[#356b60] text-white border-transparent shadow-sm"
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-700/60 text-rose-700 dark:text-rose-200 p-3 rounded-md text-sm font-semibold font-mono">
            ⚠ {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Active Alerts List ── */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center justify-between">
                  <span>Active Alerts ({alerts.length})</span>
                  {alerts.length > 0 && (
                    <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                  )}
                </CardTitle>
                <CardDescription>
                  Daftar anomali performa atau error rate yang terdeteksi saat ini.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/65 text-slate-600 dark:text-slate-350 text-xs uppercase tracking-wide border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left px-5 py-3 font-semibold">Endpoint</th>
                        <th className="text-left px-3 py-3 w-32 font-semibold">Pemicu</th>
                        <th className="text-right px-3 py-3 w-28 font-semibold">Saat Ini</th>
                        <th className="text-right px-3 py-3 w-28 font-semibold">Batas</th>
                        <th className="text-center px-5 py-3 w-28 font-semibold">Tingkat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={5} className="px-5 py-12 text-center text-slate-400">
                            Loading…
                          </td>
                        </tr>
                      ) : alerts.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-5 py-12 text-center text-slate-400 font-semibold">
                            Tidak ada alert aktif. Semua sistem berjalan normal. 🎉
                          </td>
                        </tr>
                      ) : (
                        alerts.map((alert) => (
                          <tr
                            key={alert.id}
                            className="border-b border-slate-100 dark:border-slate-700/70 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                          >
                            <td className="px-5 py-4">
                              <div className="flex flex-col">
                                <span className="font-mono text-xs text-slate-700 dark:text-slate-200 font-bold truncate max-w-72">
                                  {alert.endpoint}
                                </span>
                                <span className="text-[10px] text-slate-500 mt-0.5">
                                  Method: <Badge variant="outline" className="font-mono text-[9px] py-0 px-1 border-slate-200">{alert.method}</Badge>
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                              {alert.ruleName}
                            </td>
                            <td className="px-3 py-4 text-right tabular-nums font-bold text-rose-600 dark:text-rose-450">
                              {alert.currentValue} {alert.metric === "error_rate" ? "%" : "ms"}
                            </td>
                            <td className="px-3 py-4 text-right tabular-nums text-slate-500">
                              {alert.thresholdValue} {alert.metric === "error_rate" ? "%" : "ms"}
                            </td>
                            <td className="px-5 py-4 text-center">
                              <Badge
                                className={cn(
                                  "text-[10px] font-bold px-2 py-0.5 border rounded-md shadow-xs",
                                  alert.severity === "CRITICAL"
                                    ? "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-400"
                                    : "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-400",
                                )}
                              >
                                {alert.severity}
                              </Badge>
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

          {/* ── Alert Rules Configuration Card ── */}
          <div className="space-y-4">
            <Card className="border-slate-200 dark:border-slate-700 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-bold">Alerting Rules</CardTitle>
                <CardDescription>
                  Ambang batas aturan yang memicu status DEGRADED atau CRITICAL.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="p-3.5 rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {rule.name}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[9px] font-bold tracking-wider",
                          rule.severity === "CRITICAL"
                            ? "border-rose-200 text-rose-600 bg-rose-50/30 dark:border-rose-800/40 dark:text-rose-400"
                            : "border-amber-200 text-amber-600 bg-amber-50/30 dark:border-amber-800/40 dark:text-amber-400",
                        )}
                      >
                        {rule.severity}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5 font-medium leading-relaxed">
                      Kondisi:{" "}
                      <span className="font-mono text-slate-700 dark:text-slate-350">
                        {rule.metric} &gt;= {rule.threshold}
                        {rule.metric === "error_rate" ? "%" : " ms"}
                      </span>
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Min. Request: {rule.minRequests} total requests
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminShell>
  )
}
