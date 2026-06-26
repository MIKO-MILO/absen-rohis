"use client"

import { useState, useEffect, useCallback } from "react"
import { AdminShell } from "../_components/AdminShell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Clock,
  X,
  Download,
  ChevronUp,
  ChevronDown,
  Eye,
  RefreshCw,
} from "lucide-react"

interface AuditLog {
  id: number
  actor_id: number
  actor_name: string
  actor_role: "superadmin" | "admin" | "panitia" | "siswa"
  action: string
  target_type?: string | null
  target_id?: number | null
  description?: string | null
  created_at: string
}

interface FetchLogsParams {
  page: number
  search: string
  role: string
  dateFrom: string
  dateTo: string
}

interface SortIconProps {
  col: keyof AuditLog
  sortBy: keyof AuditLog
  sortOrder: "asc" | "desc"
}

const SortIcon = ({ col, sortBy, sortOrder }: SortIconProps) =>
  sortBy === col ? (
    sortOrder === "asc" ? (
      <ChevronUp className="h-3 w-3" />
    ) : (
      <ChevronDown className="h-3 w-3" />
    )
  ) : null

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(15)

  // Filters (applied state)
  const [search, setSearch] = useState("")
  const [role, setRole] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  // Draft filters (while typing)
  const [draftSearch, setDraftSearch] = useState("")
  const [draftRole, setDraftRole] = useState("")
  const [draftDateFrom, setDraftDateFrom] = useState("")
  const [draftDateTo, setDraftDateTo] = useState("")

  // Detail drawer
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // Sorting
  const [sortBy, setSortBy] = useState<keyof AuditLog>("created_at")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  const fetchLogs = useCallback(
    async (params: FetchLogsParams) => {
      setLoading(true)
      try {
        const query = new URLSearchParams({
          page: String(params.page),
          limit: String(limit),
          ...(params.search && { search: params.search }),
          ...(params.role && { role: params.role }),
          ...(params.dateFrom && { dateFrom: params.dateFrom }),
          ...(params.dateTo && { dateTo: params.dateTo }),
        })
        const res = await fetch(`/api/admin/audit-logs?${query}`)
        if (!res.ok) throw new Error("Gagal mengambil audit log")
        const json = await res.json()
        setLogs(json.data || [])
        setTotal(json.total || 0)
      } catch (err) {
        console.error(err)
        setLogs([])
        setTotal(0)
      } finally {
        setLoading(false)
      }
    },
    [limit]
  )

  useEffect(() => {
    const loadLogs = async () => {
      await fetchLogs({ page, search, role, dateFrom, dateTo })
    }
    loadLogs()
  }, [fetchLogs, page, search, role, dateFrom, dateTo])

  const applyFilters = () => {
    setSearch(draftSearch)
    setRole(draftRole)
    setDateFrom(draftDateFrom)
    setDateTo(draftDateTo)
    setPage(1)
  }

  const resetFilters = () => {
    setDraftSearch("")
    setDraftRole("")
    setDraftDateFrom("")
    setDraftDateTo("")
    setSearch("")
    setRole("")
    setDateFrom("")
    setDateTo("")
    setPage(1)
  }

  const hasActiveFilters = search || role || dateFrom || dateTo

  const totalPages = Math.ceil(total / limit)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getRoleBadge = (r: string) => {
    const map: Record<string, string> = {
      superadmin: "border-red-200 bg-red-100 text-red-800",
      admin: "border-blue-200 bg-blue-100 text-blue-800",
      panitia: "border-green-200 bg-green-100 text-green-800",
      siswa: "border-orange-200 bg-orange-100 text-orange-800",
    }
    return (
      <Badge
        className={`${map[r] ?? "border-muted bg-muted/50 text-muted-foreground"} capitalize`}
      >
        {r}
      </Badge>
    )
  }

  const getActionBadge = (action: string) => {
    if (action.toLowerCase().includes("impersonat")) {
      return (
        <Badge className="border-purple-200 bg-purple-100 text-purple-800">
          {action}
        </Badge>
      )
    }
    if (action === "login" || action === "logout") {
      return (
        <Badge className="border-blue-200 bg-blue-100 text-blue-800 capitalize">
          {action}
        </Badge>
      )
    }
    if (action.startsWith("scan") || action.startsWith("approve")) {
      return (
        <Badge className="border-amber-200 bg-amber-100 text-amber-800 capitalize">
          {action}
        </Badge>
      )
    }
    if (action.startsWith("create") || action.startsWith("generate")) {
      return (
        <Badge className="border-emerald-200 bg-emerald-100 text-emerald-800 capitalize">
          {action}
        </Badge>
      )
    }
    if (action.startsWith("delete")) {
      return (
        <Badge className="border-red-200 bg-red-100 text-red-800 capitalize">
          {action}
        </Badge>
      )
    }
    if (action.startsWith("update")) {
      return (
        <Badge className="border-sky-200 bg-sky-100 text-sky-800 capitalize">
          {action}
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="capitalize">
        {action}
      </Badge>
    )
  }

  const toggleSort = (column: keyof AuditLog) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(column)
      setSortOrder("desc")
    }
  }

  const openDrawer = (log: AuditLog) => {
    setSelectedLog(log)
    setIsDrawerOpen(true)
  }

  const closeDrawer = () => {
    setIsDrawerOpen(false)
    setSelectedLog(null)
  }

  return (
    <AdminShell requireSuperadmin>
      <div className="space-y-4 p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Audit Log</h2>
            <p className="text-xs text-muted-foreground">
              Riwayat semua aktivitas di sistem
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() =>
                fetchLogs({ page, search, role, dateFrom, dateTo })
              }
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
            <Button size="sm" className="gap-1.5 text-xs">
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Filters — compact inline row */}
        <Card className="border-border/60">
          <CardContent className="p-3">
            <div className="flex flex-wrap items-end gap-2">
              {/* Search */}
              <div className="relative min-w-[180px] flex-1">
                <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Cari pengguna / aktivitas..."
                  value={draftSearch}
                  onChange={(e) => setDraftSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                  className="h-8 pl-8 text-xs"
                />
              </div>

              {/* Role */}
              <select
                value={draftRole}
                onChange={(e) => setDraftRole(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground shadow-sm focus:ring-2 focus:ring-ring focus:outline-none"
              >
                <option value="">Semua Role</option>
                <option value="superadmin">Superadmin</option>
                <option value="admin">Admin</option>
                <option value="panitia">Panitia</option>
                <option value="siswa">Siswa</option>
              </select>

              {/* Date From */}
              <Input
                type="date"
                value={draftDateFrom}
                onChange={(e) => setDraftDateFrom(e.target.value)}
                className="h-8 w-[130px] text-xs"
              />
              <span className="text-xs text-muted-foreground">–</span>
              {/* Date To */}
              <Input
                type="date"
                value={draftDateTo}
                onChange={(e) => setDraftDateTo(e.target.value)}
                className="h-8 w-[130px] text-xs"
              />

              <Button
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={applyFilters}
              >
                <Search className="h-3.5 w-3.5" />
                Filter
              </Button>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 text-xs text-muted-foreground"
                  onClick={resetFilters}
                >
                  <X className="h-3.5 w-3.5" />
                  Reset
                </Button>
              )}
            </div>
            {hasActiveFilters && (
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                {total} hasil ditemukan
              </p>
            )}
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-muted/30">
                  <tr>
                    <th
                      className="cursor-pointer px-4 py-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase hover:bg-muted/50"
                      onClick={() => toggleSort("created_at")}
                    >
                      <div className="flex items-center gap-1">
                        Waktu{" "}
                        <SortIcon
                          col="created_at"
                          sortBy={sortBy}
                          sortOrder={sortOrder}
                        />
                      </div>
                    </th>
                    <th
                      className="cursor-pointer px-4 py-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase hover:bg-muted/50"
                      onClick={() => toggleSort("actor_name")}
                    >
                      <div className="flex items-center gap-1">
                        Pengguna{" "}
                        <SortIcon
                          col="actor_name"
                          sortBy={sortBy}
                          sortOrder={sortOrder}
                        />
                      </div>
                    </th>
                    <th
                      className="cursor-pointer px-4 py-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase hover:bg-muted/50"
                      onClick={() => toggleSort("actor_role")}
                    >
                      <div className="flex items-center gap-1">
                        Role{" "}
                        <SortIcon
                          col="actor_role"
                          sortBy={sortBy}
                          sortOrder={sortOrder}
                        />
                      </div>
                    </th>
                    <th
                      className="cursor-pointer px-4 py-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase hover:bg-muted/50"
                      onClick={() => toggleSort("action")}
                    >
                      <div className="flex items-center gap-1">
                        Aktivitas{" "}
                        <SortIcon
                          col="action"
                          sortBy={sortBy}
                          sortOrder={sortOrder}
                        />
                      </div>
                    </th>
                    <th className="px-4 py-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      Deskripsi
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      Detail
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-4 py-3">
                          <div className="h-3.5 w-28 rounded bg-muted" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-muted" />
                            <div className="h-3.5 w-24 rounded bg-muted" />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-4 w-14 rounded bg-muted" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-4 w-20 rounded bg-muted" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-3.5 w-40 rounded bg-muted" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="ml-auto h-7 w-7 rounded bg-muted" />
                        </td>
                      </tr>
                    ))
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <Search className="h-10 w-10 text-muted-foreground opacity-20" />
                          <p className="text-sm font-medium text-foreground">
                            Tidak ada log
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {hasActiveFilters
                              ? "Coba sesuaikan filter pencarian"
                              : "Belum ada aktivitas yang tercatat"}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr
                        key={log.id}
                        className="cursor-pointer transition-colors hover:bg-muted/30"
                        onClick={() => openDrawer(log)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3 w-3 shrink-0 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {formatDate(log.created_at)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                              {(log.actor_name ?? "?")
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-foreground">
                              {log.actor_name ?? "—"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {getRoleBadge(log.actor_role)}
                        </td>
                        <td className="px-4 py-3">
                          {getActionBadge(log.action)}
                        </td>
                        <td className="px-4 py-3">
                          <p className="max-w-[220px] truncate text-xs text-muted-foreground">
                            {log.description || "—"}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              openDrawer(log)
                            }}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!loading && totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  {(page - 1) * limit + 1}–{Math.min(page * limit, total)} dari{" "}
                  {total} log
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="h-7 w-7 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {Array.from({ length: Math.min(totalPages, 5) }).map(
                    (_, i) => {
                      const p = i + 1
                      return (
                        <Button
                          key={p}
                          variant={page === p ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setPage(p)}
                          className="h-7 w-7 p-0 text-xs"
                        >
                          {p}
                        </Button>
                      )
                    }
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="h-7 w-7 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Drawer */}
      {isDrawerOpen && selectedLog && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeDrawer}
          />
          <div className="relative ml-auto w-full max-w-md overflow-y-auto border-l border-border bg-background shadow-2xl">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Detail Aktivitas
                </h2>
                <p className="text-xs text-muted-foreground capitalize">
                  {selectedLog.action}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={closeDrawer}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Drawer Body */}
            <div className="space-y-5 p-5">
              {/* Aktor */}
              <div className="space-y-2">
                <h3 className="border-l-2 border-primary pl-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Aktor
                </h3>
                <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {(selectedLog.actor_name ?? "?").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {selectedLog.actor_name ?? "—"}
                    </p>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      {getRoleBadge(selectedLog.actor_role)}
                      <span className="text-[10px] text-muted-foreground">
                        ID: {selectedLog.actor_id}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Aktivitas */}
              <div className="space-y-2">
                <h3 className="border-l-2 border-primary pl-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Aktivitas
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg bg-muted/30 p-3">
                    <p className="mb-0.5 text-[10px] font-medium text-muted-foreground">
                      Action
                    </p>
                    <p className="font-semibold text-foreground capitalize">
                      {selectedLog.action}
                    </p>
                  </div>
                  {selectedLog.target_type && (
                    <div className="rounded-lg bg-muted/30 p-3">
                      <p className="mb-0.5 text-[10px] font-medium text-muted-foreground">
                        Target
                      </p>
                      <p className="font-semibold text-foreground capitalize">
                        {selectedLog.target_type}
                        {selectedLog.target_id
                          ? ` #${selectedLog.target_id}`
                          : ""}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Deskripsi */}
              {selectedLog.description && (
                <div className="space-y-2">
                  <h3 className="border-l-2 border-primary pl-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Deskripsi
                  </h3>
                  <div className="rounded-xl bg-muted/40 p-3">
                    <p className="text-xs leading-relaxed whitespace-pre-line text-muted-foreground">
                      {selectedLog.description}
                    </p>
                  </div>
                </div>
              )}

              {/* Waktu */}
              <div className="space-y-2">
                <h3 className="border-l-2 border-primary pl-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Waktu
                </h3>
                <div className="rounded-xl bg-muted/30 p-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        {new Date(selectedLog.created_at).toLocaleDateString(
                          "id-ID",
                          {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          }
                        )}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(selectedLog.created_at).toLocaleTimeString(
                          "id-ID",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          }
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  )
}
