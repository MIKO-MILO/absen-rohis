"use client"

import { useState, useMemo, useEffect } from "react"
import { AdminShell } from "../_components/AdminShell"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Users,
  Search,
  MoreHorizontal,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Plus,
  Pencil,
  AlertTriangle,
  Filter,
  CalendarDays,
  UserCircle,
  ShieldCheck,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { FilterModal } from "@/components/FilterModal"

// ─── Types ────────────────────────────────────────────────────────────────────
interface AdminRecord {
  id: number
  nama: string
  username: string
  role: string
  password?: string
  created_at: string
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DataAdminPage() {
  const router = useRouter()

  const [checkingSession, setCheckingSession] = useState(true)
  const [data, setData] = useState<AdminRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterRole, setFilterRole] = useState("")
  const [selectedSort, setSelectedSort] = useState("nama-asc")
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [perPage, setPerPage] = useState(10)
  const clearSelected = () => setSelected(new Set())

  // Check session on mount
  useEffect(() => {
    const checkSession = () => {
      const adminSession = localStorage.getItem("admin_session")
      if (!adminSession) {
        router.push("/admin")
        return
      }
      setCheckingSession(false)
    }

    checkSession()
  }, [router])

  // ── Fetch ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true
    ;(async () => {
      try {
        const res = await fetch("/api/admin")
        const result = await res.json()

        if (!isMounted) return

        if (isMounted) {
          setData(result)
        }
      } catch (err) {
        console.error(err)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    })()

    return () => {
      isMounted = false
    }
  }, [])

  // ── Filter ──────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const filteredData = data.filter((s) => {
      const matchSearch =
        !search ||
        s.nama.toLowerCase().includes(search.toLowerCase()) ||
        s.username.toLowerCase().includes(search.toLowerCase())
      const matchRole = !filterRole || s.role === filterRole
      return matchSearch && matchRole
    })
    return filteredData.sort((a, b) => {
      const [sortBy, sortOrder] = selectedSort.split("-") as [
        "nama" | "role",
        "asc" | "desc",
      ]
      if (sortBy === "nama") {
        return sortOrder === "asc"
          ? a.nama.localeCompare(b.nama, "id-ID")
          : b.nama.localeCompare(a.nama, "id-ID")
      } else {
        // Sort by role
        return sortOrder === "asc"
          ? a.role.localeCompare(b.role, "id-ID")
          : b.role.localeCompare(a.role, "id-ID")
      }
    })
  }, [data, search, filterRole, selectedSort])

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const paginated = filtered.slice((safePage - 1) * perPage, safePage * perPage)
  const paginatedIds = paginated.map((s) => s.id)

  const allPageSelected =
    paginatedIds.length > 0 && paginatedIds.every((id) => selected.has(id))
  const somePageSelected = paginatedIds.some((id) => selected.has(id))

  const activeFilterCount = [search !== "", filterRole !== ""].filter(
    Boolean
  ).length
  const resetFilters = () => {
    setSearch("")
    setFilterRole("")
    setSelectedSort("nama-asc")
    setPage(1)
  }

  // ── Checkbox ────────────────────────────────────────────────────────────────
  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allPageSelected) {
        paginatedIds.forEach((id) => next.delete(id))
      } else {
        paginatedIds.forEach((id) => next.add(id))
      }
      return next
    })
  }

  const toggleOne = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })

  // ── Delete single ───────────────────────────────────────────────────────────
  const openDeleteModal = (id: number) => {
    setDeletingId(id)
    setShowDeleteModal(true)
  }

  const handleDelete = async () => {
    if (!deletingId) return
    try {
      const res = await fetch(`/api/admin/${deletingId}`, { method: "DELETE" })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || "Gagal hapus data")
      setData((prev) => prev.filter((s) => s.id !== deletingId))
      setSelected((prev) => {
        const next = new Set(prev)
        next.delete(deletingId)
        return next
      })
    } catch (err: unknown) {
      alert((err as Error).message || "Terjadi kesalahan saat menghapus data")
    } finally {
      setShowDeleteModal(false)
      setDeletingId(null)
    }
  }

  // ── Delete bulk ─────────────────────────────────────────────────────────────
  const handleBulkDelete = async () => {
    try {
      await Promise.all(
        Array.from(selected).map((id) =>
          fetch(`/api/admin/${id}`, { method: "DELETE" })
        )
      )
      setData((prev) => prev.filter((s) => !selected.has(s.id)))
      clearSelected()
    } catch (err: unknown) {
      alert((err as Error).message || "Terjadi kesalahan saat menghapus data")
    } finally {
      setShowDeleteModal(false)
    }
  }

  const confirmDelete = () => {
    if (deletingId) {
      handleDelete()
    } else {
      handleBulkDelete()
    }
  }

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const todayStr = mounted
    ? new Date().toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : ""

  if (checkingSession)
    return (
      <AdminShell requireSuperadmin>
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Memeriksa sesi...</p>
          </div>
        </div>
      </AdminShell>
    )

  if (loading)
    return (
      <AdminShell requireSuperadmin>
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">
              Memuat data admin...
            </p>
          </div>
        </div>
      </AdminShell>
    )

  return (
    <AdminShell requireSuperadmin>
      <div className="flex flex-col gap-5 py-5 md:px-6">
        {/* Banner */}
        <div
          className="relative flex items-center justify-between overflow-hidden rounded-3xl p-6 shadow-lg md:p-8"
          style={{
            background: "linear-gradient(135deg,#0d9488 0%,#0891b2 100%)",
          }}
        >
          {/* Decorative Circles */}
          <div
            aria-hidden
            className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10"
          />
          <div
            aria-hidden
            className="absolute -bottom-8 left-1/3 h-24 w-24 rounded-full bg-white/5"
          />

          <div className="relative z-10 max-w-[65%]">
            <p className="text-[10px] font-bold tracking-widest text-teal-100/80 uppercase">
              Data Admin
            </p>
            <h2 className="mt-1 text-xl font-black tracking-tight text-white md:text-3xl">
              Manajemen Admin Rohis
            </h2>
            <div className="mt-3 flex items-center gap-2 text-teal-100/90 md:mt-4">
              <CalendarDays className="h-3.5 w-3.5 md:h-4 md:w-4" />
              <p className="text-[10px] font-medium md:text-xs">{todayStr}</p>
            </div>
          </div>

          <div className="relative z-10 flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-full border-[5px] border-white/15 md:h-28 md:w-28">
            <span className="text-2xl leading-none font-black text-white md:text-4xl">
              {data.length}
            </span>
            <span className="mt-1 text-[7px] font-bold tracking-widest text-teal-100/80 uppercase md:text-[9px]">
              Total Admin
            </span>
          </div>
        </div>

        {/* Table card */}
        <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {/* Toolbar */}
          <div className="flex flex-col gap-4 border-b border-border/50 px-5 pt-5 pb-5">
            {/* Judul & Statistik */}
            <div>
              <h2 className="text-base font-bold text-foreground">
                Daftar Admin
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {filtered.length} dari {data.length} admin
                {activeFilterCount > 0 && (
                  <button
                    onClick={resetFilters}
                    className="ml-2 inline-flex items-center gap-0.5 font-semibold text-primary hover:underline"
                  >
                    <X className="h-3 w-3" /> Reset
                  </button>
                )}
              </p>
            </div>

            {/* Row 2: Search & Actions */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              {/* Search Bar */}
              <div className="group relative w-full md:flex-1">
                <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-hover:text-[#0d9488]" />
                <Input
                  placeholder="Cari nama, username..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  className="h-11 w-full rounded-xl border-border bg-muted/20 pl-10 text-sm transition-all duration-200 hover:shadow-sm focus-visible:ring-primary"
                />
              </div>

              {/* Tombol Aksi (Filter & Tambah) */}
              <div className="flex w-full items-center gap-3 md:w-auto">
                <button
                  onClick={() => setShowFilterModal(true)}
                  className="group relative flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-xs font-bold text-foreground transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-md md:w-32 md:flex-none"
                >
                  <Filter className="h-4 w-4 transition-colors duration-200 group-hover:text-[#0d9488]" />
                  Filter
                  {activeFilterCount > 0 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-black text-primary-foreground">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => router.push("/admin/tambahadmin")}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 text-xs font-bold text-white shadow-sm shadow-teal-500/20 transition-all hover:-translate-y-0.5 hover:bg-teal-700 hover:shadow-md md:w-44 md:flex-none"
                >
                  <Plus className="h-4 w-4" /> Tambah Admin
                </button>
              </div>
            </div>
          </div>

          {/* ─ Mobile Card List ─ */}
          <div className="flex flex-col divide-y divide-border/50 md:hidden">
            {paginated.length === 0 ? (
              <div className="py-16 text-center">
                <div className="flex flex-col items-center gap-2">
                  <Users className="h-8 w-8 text-muted/50" />
                  <p className="text-sm text-muted-foreground">
                    Tidak ada data ditemukan
                  </p>
                  <button
                    onClick={resetFilters}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Reset filter
                  </button>
                </div>
              </div>
            ) : (
              paginated.map((s) => {
                const isChecked = selected.has(s.id)
                return (
                  <div
                    key={s.id}
                    className={`p-4 transition-colors active:bg-muted/50 ${isChecked ? "bg-primary/5" : ""}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleOne(s.id)}
                            className="h-4 w-4 cursor-pointer rounded border-border accent-primary"
                          />
                          <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                            <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                              {s.nama.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <div>
                          <p className="line-clamp-1 text-sm font-bold text-foreground">
                            {s.nama}
                          </p>
                          <p className="text-[10px] font-medium text-muted-foreground">
                            {s.username}
                          </p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-44 rounded-xl"
                        >
                          <DropdownMenuLabel>Action</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(`/admin/editadmin?id=${s.id}`)
                            }
                            className="cursor-pointer gap-2 rounded-lg text-xs"
                          >
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                            Edit Admin
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => openDeleteModal(s.id)}
                            className="cursor-pointer gap-2 rounded-lg text-xs text-destructive focus:bg-destructive/10 focus:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Hapus Admin
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 text-[10px] font-semibold text-foreground">
                          <UserCircle className="h-3 w-3 text-primary" />
                          {s.username}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground">
                          <ShieldCheck className="h-3 w-3" />
                          {s.role}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Table (Desktop & Tablet) */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30">
                  {/* Checkbox all */}
                  <th className="w-12 py-3 pr-2 pl-5">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      ref={(el) => {
                        if (el)
                          el.indeterminate =
                            somePageSelected && !allPageSelected
                      }}
                      onChange={toggleAll}
                      className="h-4 w-4 cursor-pointer rounded border-border accent-primary"
                    />
                  </th>
                  {[
                    { label: "No", width: "w-16" },
                    { label: "Nama", width: "" },
                    { label: "Username", width: "w-48" },
                    { label: "Role", width: "w-32" },
                    { label: "Action", width: "w-16" },
                  ].map((h) => (
                    <th
                      key={h.label}
                      className={`px-4 py-3 text-left text-[11px] font-bold tracking-wider text-muted-foreground uppercase ${h.width}`}
                    >
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="h-8 w-8 text-muted/50" />
                        <p className="text-sm text-muted-foreground">
                          Tidak ada data ditemukan
                        </p>
                        <button
                          onClick={resetFilters}
                          className="text-xs font-semibold text-primary hover:underline"
                        >
                          Reset filter
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginated.map((s, i) => {
                    const isChecked = selected.has(s.id)
                    return (
                      <tr
                        key={s.id}
                        className={`transition-colors hover:bg-muted/40 ${
                          isChecked ? "bg-primary/5" : ""
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-3 pr-2 pl-5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleOne(s.id)}
                            className="h-4 w-4 cursor-pointer rounded border-border accent-primary"
                          />
                        </td>

                        {/* No */}
                        <td className="px-4 py-3 text-xs font-medium text-muted-foreground">
                          {(page - 1) * perPage + i + 1}
                        </td>

                        {/* Nama */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                                {s.nama.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <p className="text-sm leading-tight font-semibold text-foreground">
                              {s.nama}
                            </p>
                          </div>
                        </td>

                        {/* Username */}
                        <td className="px-4 py-3">
                          <p className="text-xs text-muted-foreground">
                            {s.username}
                          </p>
                        </td>

                        {/* Role */}
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase ${
                              s.role === "superadmin"
                                ? "bg-amber-500/10 text-amber-600"
                                : "bg-blue-500/10 text-blue-600"
                            }`}
                          >
                            {s.role}
                          </span>
                        </td>

                        {/* Action */}
                        <td className="px-4 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-40 rounded-xl"
                            >
                              <DropdownMenuLabel>Action</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(`/admin/editadmin?id=${s.id}`)
                                }
                                className="cursor-pointer gap-2 rounded-lg text-xs"
                              >
                                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                Edit Admin
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => openDeleteModal(s.id)}
                                className="cursor-pointer gap-2 rounded-lg text-xs text-destructive focus:bg-destructive/10 focus:text-destructive"
                              >
                                <Trash2 className="text-red h-3.5 w-3.5 hover:text-destructive" />
                                Hapus Admin
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-border/50 bg-muted/20 px-5 py-4">
            <div className="flex items-center gap-3">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">
                Halaman {safePage} dari {totalPages}
              </p>
              {selected.size > 0 && (
                <div className="flex items-center gap-2 border-l border-border/50 pl-3">
                  <p className="text-[10px] font-bold text-primary uppercase">
                    {selected.size} dipilih
                  </p>
                  <button
                    onClick={() => {
                      setDeletingId(null)
                      setShowDeleteModal(true)
                    }}
                    className="flex items-center gap-1 rounded-lg bg-destructive/10 px-2 py-1 text-[10px] font-bold text-destructive hover:bg-destructive/20"
                  >
                    <Trash2 className="h-3 w-3" /> Hapus
                  </button>
                  <button
                    onClick={clearSelected}
                    className="text-[10px] font-bold text-muted-foreground hover:text-foreground"
                  >
                    Batal
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(Number(e.target.value))
                    setPage(1)
                  }}
                  className="h-8 w-14 appearance-none rounded-lg border border-border bg-card pr-8 pl-2 text-[10px] font-bold"
                >
                  <option value={10}>10</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>

                <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              </div>
              <button
                disabled={safePage === 1}
                onClick={() => setPage(Math.max(1, safePage - 1))}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-all hover:bg-muted disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={safePage === totalPages}
                onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-all hover:bg-muted disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <FilterModal
        open={showFilterModal}
        onOpenChange={setShowFilterModal}
        title="Filter Data Admin"
        description="Pilih kriteria untuk menyaring data admin"
        roles={[
          { value: "superadmin", label: "Superadmin" },
          { value: "admin", label: "Admin" },
        ]}
        selectedRole={filterRole}
        onRoleChange={(val) => {
          setFilterRole(val)
          setPage(1)
        }}
        sortOptions={[
          { value: "nama-asc", label: "Nama (A-Z)" },
          { value: "nama-desc", label: "Nama (Z-A)" },
          { value: "role-asc", label: "Role (A-Z)" },
          { value: "role-desc", label: "Role (Z-A)" },
        ]}
        selectedSort={selectedSort}
        onSortChange={(val) => {
          setSelectedSort(val)
          setPage(1)
        }}
        onReset={resetFilters}
      />

      {/* Delete confirmation modal */}
      <Dialog
        open={showDeleteModal}
        onOpenChange={(open) => {
          setShowDeleteModal(open)
          if (!open) setDeletingId(null)
        }}
      >
        <DialogContent className="max-w-[320px] rounded-3xl p-6">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-xl font-bold">
                Hapus Data {deletingId ? "Admin" : "Terpilih"}?
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {deletingId ? (
                  <>
                    Apakah Anda yakin ingin menghapus data admin{" "}
                    <span className="font-bold text-foreground">
                      {data.find((s) => s.id === deletingId)?.nama}
                    </span>
                    ? Tindakan ini tidak dapat dibatalkan.
                  </>
                ) : (
                  <>
                    Anda akan menghapus{" "}
                    <span className="font-bold text-foreground">
                      {selected.size}
                    </span>{" "}
                    data admin secara permanen. Tindakan ini tidak dapat
                    dibatalkan.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-6 flex w-full gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
                className="rounded-2x flex-1 border-border py-6 font-semibold"
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                className="rounded-2x flex-1 bg-red-600 py-6 font-semibold text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
              >
                Hapus
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminShell>
  )
}
