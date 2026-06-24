/* eslint-disable react-hooks/set-state-in-effect */
"use client"

import { useState, useMemo, useEffect } from "react"
import { AdminShell } from "../_components/AdminShell"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
  X,
  Plus,
  Pencil,
  AlertTriangle,
  LogIn,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { startImpersonationAsync, fetchSession } from "@/lib/auth-client"

// ─── Types ────────────────────────────────────────────────────────────────────
interface UserRecord {
  id: number
  nama: string
  divisi: string
  jenis_kelamin: string
  nis: number
  email: string
  password: string
  created_at: string
  avatar: string
}

interface PanitiaApiRecord {
  id: number
  nama: string
  divisi: string
  jenis_kelamin: string
  nis: number
  email: string
  password: string
  created_at: string
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DataSiswaPage() {
  const router = useRouter()

  const [data, setData] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [perPage, setPerPage] = useState(10)
  const [checkingSession, setCheckingSession] = useState(true)
  const [isSuperadmin, setIsSuperadmin] = useState(false)

  // Check session on mount
  useEffect(() => {
    const checkSession = async () => {
      console.log("Checking session...")
      const adminSession = localStorage.getItem("admin_session")
      const panitiaSession = localStorage.getItem("panitia_session")
      console.log("adminSession:", adminSession)
      console.log("panitiaSession:", panitiaSession)

      if (!adminSession && !panitiaSession) {
        console.log("No session found, redirecting to /admin")
        router.push("/admin")
        return
      }

      // Try to fetch from API session to check if user is superadmin
      try {
        const sessionData = await fetchSession()
        if (
          sessionData?.originalUser?.role === "superadmin" ||
          sessionData?.user?.role === "superadmin"
        ) {
          setIsSuperadmin(true)
        } else if (adminSession) {
          // Fallback to localStorage session
          try {
            const parsedAdminSession = JSON.parse(adminSession)
            if (parsedAdminSession.role === "superadmin") {
              setIsSuperadmin(true)
            }
          } catch {
            // Ignore if parse fails
          }
        }
      } catch {
        // Ignore API errors, fall back to localStorage check
        if (adminSession) {
          try {
            const parsedAdminSession = JSON.parse(adminSession)
            if (parsedAdminSession.role === "superadmin") {
              setIsSuperadmin(true)
            }
          } catch {
            // Ignore
          }
        }
      }

      console.log("Session found, setting checkingSession to false")
      setCheckingSession(false)
    }

    checkSession()
  }, [router])

  // ── Dynamic Row Calculation ────────────────────────────────────────────────
  useEffect(() => {
    const calculateRows = () => {
      const availableHeight = window.innerHeight - 430
      const rowHeight = 53
      const estimatedRows = Math.max(5, Math.floor(availableHeight / rowHeight))
      setPerPage(estimatedRows)
    }

    calculateRows()
    window.addEventListener("resize", calculateRows)
    return () => window.removeEventListener("resize", calculateRows)
  }, [])

  // ── Fetch ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    ;(async () => {
      try {
        const panitiaRes = await fetch("/api/panitia")
        const result = await panitiaRes.json()

        // Check if result is an array
        const mappedData = Array.isArray(result)
          ? result.map((u: PanitiaApiRecord) => ({
              id: u.id,
              nama: u.nama,
              divisi: u.divisi,
              jenis_kelamin: u.jenis_kelamin,
              nis: u.nis,
              email: u.email,
              password: u.password,
              created_at: u.created_at,
              avatar: String(Math.floor(Math.random() * 70)),
            }))
          : []

        setData(mappedData)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // ── Filter ──────────────────────────────────────────────────────────────────
  const filtered = useMemo(
    () =>
      data.filter((s) => {
        const matchSearch =
          !search ||
          s.nama.toLowerCase().includes(search.toLowerCase()) ||
          String(s.nis).includes(search) ||
          s.email.toLowerCase().includes(search.toLowerCase())
        return matchSearch
      }),
    [data, search]
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const paginated = filtered.slice((page - 1) * perPage, page * perPage)
  const paginatedIds = paginated.map((s) => s.id)

  const allPageSelected =
    paginatedIds.length > 0 && paginatedIds.every((id) => selected.has(id))
  const somePageSelected = paginatedIds.some((id) => selected.has(id))

  const resetFilters = () => {
    setSearch("")
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

  const clearSelected = () => setSelected(new Set())

  // ── Delete single ───────────────────────────────────────────────────────────
  const openDeleteModal = (id: number) => {
    setDeletingId(id)
    setShowDeleteModal(true)
  }

  const handleImpersonate = async (id: number) => {
    const result = await startImpersonationAsync(id, "panitia")
    if (result.success && result.redirect) {
      router.push(result.redirect)
      router.refresh()
    } else {
      alert(result.error || "Gagal memulai impersonasi")
    }
  }

  const handleDelete = async () => {
    if (!deletingId) return
    try {
      const res = await fetch(`/api/panitia/${deletingId}`, {
        method: "DELETE",
      })
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
          fetch(`/api/panitia/${id}`, { method: "DELETE" })
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
    setMounted(true)
  }, [])

  const todayStr = mounted
    ? new Date().toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : ""

  if (checkingSession) {
    return (
      <AdminShell>
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Memeriksa sesi...</p>
          </div>
        </div>
      </AdminShell>
    )
  }

  if (loading)
    return (
      <AdminShell>
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">
              Memuat data panitia...
            </p>
          </div>
        </div>
      </AdminShell>
    )

  return (
    <AdminShell>
      <div className="flex flex-col gap-5 px-4 py-5 md:px-6">
        {/* Banner */}
        <div
          className="relative flex items-center justify-between overflow-hidden rounded-2xl p-5"
          style={{
            background: "linear-gradient(135deg,#0d9488 0%,#0891b2 100%)",
          }}
        >
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: -30,
              right: -30,
              width: 140,
              height: 140,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.07)",
            }}
          />
          <div
            aria-hidden
            style={{
              position: "absolute",
              bottom: -20,
              left: "40%",
              width: 90,
              height: 90,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.05)",
            }}
          />
          <div className="relative z-10">
            <p className="text-xs text-teal-100">Data Panitia</p>
            <h2 className="mt-0.5 text-xl font-black text-white">
              Manajemen Panitia Rohis
            </h2>
            <p className="mt-1 text-xs text-teal-200">{todayStr}</p>
          </div>
          <div className="relative z-10 flex flex-col items-center rounded-2xl border border-white/15 bg-white/10 px-5 py-3 backdrop-blur-sm">
            <span className="text-2xl leading-none font-black text-white">
              {data.length}
            </span>
            <span className="mt-0.5 text-[10px] text-white/80">
              Total Panitia
            </span>
          </div>
        </div>

        {/* Table card */}
        <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 border-b border-border/50 px-5 pt-4 pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-foreground">
                  Daftar Panitia
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {filtered.length} dari {data.length} panitia
                  {search && (
                    <button
                      onClick={resetFilters}
                      className="ml-2 inline-flex items-center gap-0.5 font-semibold text-primary hover:underline"
                    >
                      <X className="h-3 w-3" /> Reset filter
                    </button>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Cari nama, NIS, email..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value)
                      setPage(1)
                    }}
                    className="h-9 w-52 rounded-xl border-border bg-muted/50 pl-8 text-xs focus-visible:ring-primary"
                  />
                </div>
                <button
                  onClick={() => router.push("/admin/tambahpanitia")}
                  className="flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground/80 transition-all hover:bg-muted"
                >
                  <Plus className="h-3.5 w-3.5" /> Tambah Panitia
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
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
                    { label: "Jenis Kelamin", width: "w-40" },
                    { label: "Email", width: "w-48" },
                    { label: "Password", width: "w-40" },
                    { label: "Action", width: "w-16" },
                  ].map((h) => (
                    <th
                      key={h.label}
                      className={`px-4 py-3 text-[11px] font-bold tracking-wider text-muted-foreground uppercase ${h.width}`}
                    >
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
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

                        {/* Jenis Kelamin */}
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block rounded-lg px-2 py-0.5 text-xs font-semibold ${
                              s.jenis_kelamin === "Perempuan"
                                ? "bg-pink-500/10 text-pink-600"
                                : "bg-blue-500/10 text-blue-600"
                            }`}
                          >
                            {s.jenis_kelamin === "Perempuan"
                              ? "♀ Perempuan"
                              : "♂ Laki-laki"}
                          </span>
                        </td>

                        {/* Email */}
                        <td className="px-4 py-3">
                          <p className="text-xs text-muted-foreground">
                            {s.email}
                          </p>
                        </td>

                        <td className="px-4 py-3">
                          <p className="text-xs text-muted-foreground">
                            {s.password}
                          </p>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
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
                                  router.push(`/admin/editpanitia?id=${s.id}`)
                                }
                                className="cursor-pointer gap-2 rounded-lg text-xs"
                              >
                                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                Edit Panitia
                              </DropdownMenuItem>
                              {isSuperadmin && (
                                <DropdownMenuItem
                                  onClick={() => handleImpersonate(s.id)}
                                  className="cursor-pointer gap-2 rounded-lg text-xs"
                                >
                                  <LogIn className="h-3.5 w-3.5 text-blue-600" />
                                  Login Sebagai
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => openDeleteModal(s.id)}
                                className="cursor-pointer gap-2 rounded-lg text-xs text-destructive focus:bg-destructive/10 focus:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Hapus Panitia
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
                Halaman {page} dari {totalPages}
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
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-all hover:bg-muted disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-all hover:bg-muted disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

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
                Hapus Data {deletingId ? "Panitia" : "Terpilih"}?
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {deletingId ? (
                  <>
                    Apakah Anda yakin ingin menghapus data panitia{" "}
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
                    data panitia secara permanen. Tindakan ini tidak dapat
                    dibatalkan.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-6 flex w-full gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 rounded-2xl border-border py-6 font-semibold"
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                className="flex-1 rounded-2xl bg-red-600 font-semibold hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
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
