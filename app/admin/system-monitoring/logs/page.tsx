"use client"

import { useEffect, useState, useCallback } from "react"
import { AdminShell } from "@/app/admin/_components/AdminShell"
import { MonitoringSubNav } from "../_components/MonitoringSubNav"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface LogEntry {
  id: string
  timestamp: string
  type: "API_METRIC" | "ADMIN_ACTION"
  source: string
  action: string
  details: string
  severity: "INFO" | "WARNING" | "ERROR"
  raw: Record<string, unknown>
}

interface ApiResponse {
  data: LogEntry[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
  filters: {
    type: string
    severity: string
    search: string
  }
}

const LIMITS = [10, 20, 50, 100]

function fmtId(v: number): string {
  return v.toLocaleString("id-ID")
}

export default function SystemLogsPage() {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [type, setType] = useState("all")
  const [severity, setSeverity] = useState("all")
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)

  // Detail Modal
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  // Debounce search input
  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => window.clearTimeout(id)
  }, [search])

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const qs = new URLSearchParams({
        type,
        severity,
        search: debouncedSearch,
        page: String(page),
        limit: String(limit),
      })
      const res = await fetch(`/api/admin/system-monitoring/logs?${qs}`, { cache: "no-store" })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || `HTTP ${res.status}`)
      }
      const json = await res.json()
      setData(json)
    } catch (e) {
      console.error("[System Logs] fetch error:", e)
      setError(e instanceof Error ? e.message : "Gagal memuat log")
    } finally {
      setLoading(false)
    }
  }, [type, severity, debouncedSearch, page, limit])

  useEffect(() => {
    (async () => {
      await fetchData()
    })()
  }, [fetchData])

  const rows = data?.data ?? []
  const pagination = data?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 1 }
  const safePage = Math.min(page, pagination.totalPages)

  const handleRowClick = (entry: LogEntry) => {
    setSelectedLog(entry)
    setModalOpen(true)
  }

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso)
      return d.toLocaleString("id-ID", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    } catch {
      return iso
    }
  }

  return (
    <AdminShell requireSuperadmin>
      <div className="flex flex-col gap-6 py-5 px-4 md:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              System Logs
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Riwayat log sistem gabungan aktivitas API dan tindakan audit administrator.
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

        {/* ── Filter Bar ── */}
        <Card className="border-slate-200 dark:border-slate-700">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-3">
                <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-300">
                  Log Type
                </label>
                <select
                  value={type}
                  onChange={(e) => {
                    setType(e.target.value)
                    setPage(1)
                  }}
                  className="w-full h-9 px-3 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                >
                  <option value="all">All Types</option>
                  <option value="api">API Metrics</option>
                  <option value="admin">Admin Audit Logs</option>
                </select>
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-300">
                  Severity
                </label>
                <select
                  value={severity}
                  onChange={(e) => {
                    setSeverity(e.target.value)
                    setPage(1)
                  }}
                  className="w-full h-9 px-3 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                >
                  <option value="all">All Severities</option>
                  <option value="info">INFO</option>
                  <option value="warning">WARNING</option>
                  <option value="error">ERROR</option>
                </select>
              </div>
              <div className="md:col-span-6">
                <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-300">
                  Search Source / Action / Details
                </label>
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari kata kunci..."
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-700/60 text-rose-700 dark:text-rose-200 p-3 rounded-md text-sm font-semibold font-mono">
            ⚠ {error}
          </div>
        )}

        {/* ── Logs Table ── */}
        <Card className="border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Activity Logs</CardTitle>
            <CardDescription>
              Total {loading ? "…" : `${fmtId(pagination.total)} entri log ditemukan.`} Klik baris untuk detail JSON.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wide border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left px-5 py-3 w-40 font-semibold">Waktu</th>
                    <th className="text-left px-3 py-3 w-36 font-semibold">Tipe</th>
                    <th className="text-left px-3 py-3 w-28 font-semibold">Aksi</th>
                    <th className="text-left px-3 py-3 w-56 font-semibold">Sumber / Aktor</th>
                    <th className="text-left px-3 py-3 font-semibold">Detail Ringkasan</th>
                    <th className="text-center px-5 py-3 w-24 font-semibold">Tingkat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-750">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-16 text-center text-slate-400">
                        Loading…
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-16 text-center text-slate-400 font-semibold">
                        Tidak ada catatan log sistem yang cocok dengan kriteria.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => (
                      <tr
                        key={r.id}
                        onClick={() => handleRowClick(r)}
                        className="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      >
                        <td className="px-5 py-3.5 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                          {formatTimestamp(r.timestamp)}
                        </td>
                        <td className="px-3 py-3.5 whitespace-nowrap">
                          <span
                            className={cn(
                              "text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase border shadow-2xs",
                              r.type === "API_METRIC"
                                ? "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400"
                                : "bg-teal-50 border-teal-200 text-teal-700 dark:bg-teal-900/30 dark:border-teal-800 dark:text-teal-400",
                            )}
                          >
                            {r.type === "API_METRIC" ? "API Metrics" : "Admin Log"}
                          </span>
                        </td>
                        <td className="px-3 py-3.5 whitespace-nowrap">
                          <Badge variant="outline" className="font-mono text-[10px] py-0 px-1 border-slate-200">
                            {r.action}
                          </Badge>
                        </td>
                        <td className="px-3 py-3.5 font-bold text-slate-700 dark:text-slate-200 truncate max-w-56 font-mono text-xs">
                          {r.source}
                        </td>
                        <td className="px-3 py-3.5 text-slate-600 dark:text-slate-350 truncate max-w-96 text-xs font-medium">
                          {r.details}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <Badge
                            className={cn(
                              "text-[9px] font-bold px-1.5 py-0.2 border rounded-md",
                              r.severity === "ERROR"
                                ? "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-450"
                                : r.severity === "WARNING"
                                  ? "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-450"
                                  : "bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400",
                            )}
                          >
                            {r.severity}
                          </Badge>
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

        {/* ── Details Dialog Modal ── */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-2xl rounded-3xl p-6">
            {selectedLog && (
              <div className="space-y-4">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold flex items-center gap-2.5">
                    <span>Log Detail</span>
                    <Badge variant="outline" className="font-mono text-xs uppercase px-2 py-0.5 border-slate-300">
                      {selectedLog.type}
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 font-mono">
                    ID: {selectedLog.id} · Timestamp: {new Date(selectedLog.timestamp).toISOString()}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-3.5 border-t border-slate-100 dark:border-slate-750 pt-4">
                  <div className="grid grid-cols-3 text-sm gap-2">
                    <span className="font-semibold text-slate-500">Source / Actor</span>
                    <span className="col-span-2 font-mono font-bold text-slate-800 dark:text-slate-200">
                      {selectedLog.source}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 text-sm gap-2">
                    <span className="font-semibold text-slate-500">Action / Method</span>
                    <span className="col-span-2">
                      <Badge variant="secondary" className="font-mono text-xs uppercase px-1.5 py-0.2">
                        {selectedLog.action}
                      </Badge>
                    </span>
                  </div>
                  <div className="grid grid-cols-3 text-sm gap-2">
                    <span className="font-semibold text-slate-500">Severity</span>
                    <span className="col-span-2">
                      <Badge
                        className={cn(
                          "text-xs font-bold px-2 py-0.3 border rounded-md uppercase",
                          selectedLog.severity === "ERROR"
                            ? "bg-rose-50 border-rose-200 text-rose-700"
                            : selectedLog.severity === "WARNING"
                              ? "bg-amber-50 border-amber-200 text-amber-700"
                              : "bg-slate-50 border-slate-200 text-slate-700",
                        )}
                      >
                        {selectedLog.severity}
                      </Badge>
                    </span>
                  </div>
                  <div className="grid grid-cols-3 text-sm gap-2">
                    <span className="font-semibold text-slate-500">Summary</span>
                    <span className="col-span-2 font-medium text-slate-700 dark:text-slate-300">
                      {selectedLog.details}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2">
                  <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">Raw JSON Payload</span>
                  <pre className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 overflow-x-auto text-[11px] font-mono leading-relaxed text-slate-800 dark:text-slate-200 max-h-64 scrollbar-thin">
                    {JSON.stringify(selectedLog.raw, null, 2)}
                  </pre>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setModalOpen(false)}
                    className="rounded-2xl px-6"
                  >
                    Tutup
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminShell>
  )
}
