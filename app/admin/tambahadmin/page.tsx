"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AdminShell } from "../_components/AdminShell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { UserPlus, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react"

interface AdminFormType {
  nama: string
  username: string
  password: string
  role: "admin" | "superadmin"
}

function Field({
  label,
  placeholder,
  type = "text",
  value,
  error,
  onChange,
}: {
  label: string
  placeholder: string
  type?: string
  value: string
  error?: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        {label}
      </Label>
      <Input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`h-11 rounded-xl border bg-muted/50 px-4 text-sm focus-visible:ring-primary ${
          error ? "border-destructive/50" : "border-border"
        }`}
      />
      {error && (
        <p className="flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="h-3 w-3" /> {error}
        </p>
      )}
    </div>
  )
}

export default function TambahAdminPage() {
  const router = useRouter()
  const [checkingSession, setCheckingSession] = useState(true)
  const [form, setForm] = useState<AdminFormType>({
    nama: "",
    username: "",
    password: "",
    role: "admin",
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Partial<AdminFormType>>({})
  const [success, setSuccess] = useState(false)

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

  const validate = () => {
    const e: Partial<AdminFormType> = {}
    if (!form.nama.trim()) e.nama = "Nama wajib diisi"
    if (!form.username.trim()) e.username = "Username wajib diisi"
    if (!form.password.trim()) e.password = "Password wajib diisi"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return

    setLoading(true)
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const result = await res.json()
        alert(result.error || "Gagal menambah admin")
        return
      }

      setSuccess(true)
    } catch (err) {
      console.error(err)
      alert("Terjadi kesalahan server")
    } finally {
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <AdminShell>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm font-medium text-muted-foreground">
              Memeriksa sesi...
            </p>
          </div>
        </div>
      </AdminShell>
    )
  }

  if (success) {
    return (
      <AdminShell>
        <div className="flex h-[60vh] items-center justify-center px-4">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-8 text-center shadow-xl shadow-muted-foreground/10">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-xl font-black text-foreground">
              Berhasil Ditambahkan!
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Admin <strong>{form.nama}</strong> telah berhasil didaftarkan ke
              sistem.
            </p>
            <Button
              onClick={() => router.push("/admin/admin")}
              className="mt-8 h-12 w-full rounded-2xl bg-primary text-sm font-bold text-primary-foreground hover:opacity-90"
            >
              Kembali ke Daftar Admin
            </Button>
          </div>
        </div>
      </AdminShell>
    )
  }

  return (
    <AdminShell>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali
          </button>
          <h1 className="text-lg font-bold text-foreground">
            Tambah Admin Baru
          </h1>
        </div>

        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-xl shadow-muted-foreground/5">
          <div className="h-1.5 bg-linear-to-r from-primary to-primary/60" />

          <div className="p-6 md:p-8">
            <div className="mb-8 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <UserPlus className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Informasi Akun
                </h2>
                <p className="text-xs text-muted-foreground">
                  Lengkapi data di bawah untuk membuat akun admin baru.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Field
                label="Nama Lengkap"
                placeholder="Masukkan nama lengkap"
                value={form.nama}
                error={errors.nama}
                onChange={(v) => setForm({ ...form, nama: v })}
              />
              <Field
                label="Username"
                placeholder="Masukkan username"
                value={form.username}
                error={errors.username}
                onChange={(v) => setForm({ ...form, username: v })}
              />

              {/* Role Selection */}
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Role Admin
                </Label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, role: "admin" })}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-xs font-bold transition-all ${
                      form.role === "admin"
                        ? "border-primary bg-primary/10 text-primary shadow-sm shadow-primary/10"
                        : "border-border bg-muted/30 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, role: "superadmin" })}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-xs font-bold transition-all ${
                      form.role === "superadmin"
                        ? "border-amber-500 bg-amber-500/10 text-amber-600 shadow-sm shadow-amber-500/10"
                        : "border-border bg-muted/30 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    Superadmin
                  </button>
                </div>
              </div>

              <div className="md:col-span-2">
                <Field
                  label="Password"
                  placeholder="Masukkan password"
                  type="password"
                  value={form.password}
                  error={errors.password}
                  onChange={(v) => setForm({ ...form, password: v })}
                />
              </div>
            </div>

            <div className="mt-10 flex items-center justify-end gap-3 border-t border-border pt-8">
              <Button
                variant="outline"
                onClick={() => router.back()}
                className="h-11 rounded-xl px-6 text-xs font-bold"
              >
                Batal
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="h-11 rounded-xl bg-primary px-8 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-90"
              >
                {loading ? "Menyimpan..." : "Simpan Admin"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  )
}
