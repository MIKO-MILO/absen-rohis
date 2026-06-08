"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { AdminShell } from "../_components/AdminShell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  LayoutGrid,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function ClassesManagementPage() {
  const [classes, setClasses] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Add Class Modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [newClassName, setNewClassName] = useState("")
  const [isAdding, setIsAdding] = useState(false)

  // Delete Confirm Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [classToDelete, setClassToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const isMounted = useRef(true)

  const fetchClasses = useCallback(async () => {
    try {
      const res = await fetch("/api/classes")
      const data = await res.json()

      if (!isMounted.current) return

      if (data.classes) {
        setClasses(data.classes)
        setError(null)
      } else if (data.error) {
        setError(data.error)
      }
    } catch (err) {
      console.error(err)
      if (isMounted.current) {
        setError("Gagal memuat data kelas")
      }
    } finally {
      if (isMounted.current) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    isMounted.current = true

    const timer = setTimeout(() => {
      if (isMounted.current) {
        fetchClasses()
      }
    }, 0)

    return () => {
      isMounted.current = false
      clearTimeout(timer)
    }
  }, [fetchClasses])

  const handleAddClass = async () => {
    if (!newClassName.trim()) return

    setIsAdding(true)
    setError(null)
    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama: newClassName.trim() }),
      })
      const data = await res.json()

      if (res.ok) {
        setSuccess(`Kelas ${newClassName} berhasil ditambahkan`)
        setNewClassName("")
        setShowAddModal(false)
        setLoading(true) // Trigger loading state before re-fetch
        fetchClasses()
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(data.error || "Gagal menambahkan kelas")
      }
    } catch (err) {
      console.error(err)
      setError("Terjadi kesalahan sistem")
    } finally {
      setIsAdding(false)
    }
  }

  const handleDeleteClass = async () => {
    if (!classToDelete) return

    setIsDeleting(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/classes?nama=${encodeURIComponent(classToDelete)}`,
        {
          method: "DELETE",
        }
      )
      const data = await res.json()

      if (res.ok) {
        setSuccess(`Kelas ${classToDelete} berhasil dihapus`)
        setShowDeleteModal(false)
        setClassToDelete(null)
        setLoading(true) // Trigger loading state before re-fetch
        fetchClasses()
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(data.error || "Gagal menghapus kelas")
      }
    } catch (err) {
      console.error(err)
      setError("Terjadi kesalahan sistem")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AdminShell requireSuperadmin={true}>
      <div className="flex flex-col gap-6 px-4 py-6 md:px-8">
        {/* Header Section */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              Manajemen Kelas
            </h1>
            <p className="text-sm text-muted-foreground">
              Kelola daftar kelas yang tersedia untuk absensi siswa
            </p>
          </div>
          <Button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-xl bg-teal-600 font-bold text-white hover:bg-teal-700"
          >
            <Plus className="h-4 w-4" /> Tambah Kelas
          </Button>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600 dark:border-rose-900/30 dark:bg-rose-900/20 dark:text-rose-400">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="font-medium">{error}</p>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-3 rounded-2xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-600 dark:border-teal-900/30 dark:bg-teal-900/20 dark:text-teal-400">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <p className="font-medium">{success}</p>
          </div>
        )}

        {/* Classes Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-3xl border border-border bg-muted/30"
              />
            ))
          ) : classes.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center rounded-3xl border border-dashed border-border py-20 text-center">
              <div className="mb-4 rounded-full bg-muted p-4">
                <LayoutGrid className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                Belum ada data kelas
              </p>
              <Button
                variant="link"
                onClick={() => setShowAddModal(true)}
                className="mt-1 text-teal-600"
              >
                Klik untuk menambah kelas pertama
              </Button>
            </div>
          ) : (
            classes.map((kelas) => (
              <div
                key={kelas}
                className="group relative flex items-center justify-between overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-sm transition-all hover:border-teal-500/30 hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400">
                    <LayoutGrid className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground">{kelas}</p>
                    <p className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                      Siswa aktif
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setClassToDelete(kelas)
                    setShowDeleteModal(true)
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground opacity-0 transition-all group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Class Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-[400px] overflow-hidden rounded-3xl border-none p-0 shadow-2xl">
          <div className="bg-teal-600 px-6 py-8 text-center text-white">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                <Plus className="h-8 w-8 text-white" />
              </div>
            </div>
            <DialogHeader>
              <DialogTitle className="text-center text-2xl font-black text-white">
                Tambah Kelas
              </DialogTitle>
              <DialogDescription className="text-center text-sm text-teal-50/80">
                Daftarkan kelas baru ke dalam sistem absensi.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="space-y-6 bg-card p-6">
            <div className="space-y-2">
              <label className="ml-1 text-[10px] font-black tracking-widest text-muted-foreground uppercase">
                Nama Kelas
              </label>
              <Input
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                placeholder="Contoh: XII PPLG 1"
                className="mt-2 h-14 rounded-2xl border-border bg-muted/30 px-5 text-sm font-medium focus-visible:border-teal-500 focus-visible:ring-teal-500/30"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleAddClass()}
              />
            </div>

            <div className="flex flex-col gap-3">
              <Button
                onClick={handleAddClass}
                disabled={isAdding || !newClassName.trim()}
                className="h-14 w-full rounded-2xl bg-teal-600 font-bold text-white shadow-lg shadow-teal-500/20 transition-all hover:bg-teal-700 hover:shadow-teal-500/30 active:scale-[0.98]"
              >
                {isAdding ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />{" "}
                    Menambahkan...
                  </>
                ) : (
                  "Simpan Kelas Baru"
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowAddModal(false)}
                className="h-12 w-full rounded-2xl font-bold text-muted-foreground hover:bg-muted hover:text-foreground border-border transition-all" 
              >
                Batalkan
              </Button>
            </div>
          </div>
          <div className="h-1.5 w-full bg-teal-600/10" />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-[400px] overflow-hidden rounded-3xl border-none p-6 shadow-2xl">
          <div className="flex flex-col items-center justify-center text-center">
            {/* Icon Warning */}
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
              <AlertTriangle className="h-8 w-8" />
            </div>

            <DialogHeader className="space-y-2">
              <DialogTitle className="text-xl font-bold text-foreground">
                Hapus Data Kelas?
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
                Apakah Anda yakin ingin menghapus data kelas{" "}
                <span className="font-bold text-foreground uppercase">
                  {classToDelete}
                </span>
                ? Tindakan ini tidak dapat dibatalkan.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-8 flex w-full gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
                className="h-12 flex-1 rounded-xl border-border font-bold text-muted-foreground transition-all hover:bg-muted"
              >
                Batal
              </Button>
              <Button
                onClick={handleDeleteClass}
                disabled={isDeleting}
                className="h-12 flex-1 rounded-xl bg-red-600 font-bold text-white transition-all hover:bg-red-700 active:scale-[0.98]"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> ...
                  </>
                ) : (
                  "Hapus"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminShell>
  )
}
