"use client"

import { useEffect, useState } from "react"
import { Lock, ShieldCheck, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { isAdmin } from "@/lib/auth-client"

export default function MaintenancePage() {
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)
  const [canAccess, setCanAccess] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/session")
        if (res.ok) {
          const data = await res.json()
          if (data.user && isAdmin(data.user.role)) {
            setCanAccess(true)
          }
        }
      } catch (err) {
        console.error("Error checking session:", err)
      } finally {
        setIsChecking(false)
      }
    }
    checkSession()
  }, [])

  if (isChecking) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Memeriksa akses...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background px-4">
      <div
        className="relative mb-8 flex h-32 w-32 items-center justify-center overflow-hidden rounded-3xl"
        style={{
          background: "linear-gradient(135deg, #0d9488 0%, #0891b2 100%)",
        }}
      >
        <div
          aria-hidden
          className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-white/10"
        />
        <div
          aria-hidden
          className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-white/5"
        />
        <Lock className="relative z-10 h-14 w-14 text-white" />
      </div>

      <div className="mb-10 max-w-md space-y-3 text-center">
        <h1 className="text-3xl font-black text-foreground">Dalam Perawatan</h1>
        <p className="leading-relaxed text-muted-foreground">
          Maaf, sistem absensi Rohis sedang dalam perawatan dan peningkatan.
          Kami akan segera kembali online!
        </p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        {canAccess && (
          <div className="space-y-3 rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">
                  Akses Admin Aktif
                </p>
                <p className="text-xs text-muted-foreground">
                  Anda dapat mengakses sistem sebagai admin/superadmin
                </p>
              </div>
            </div>
            <Button
              onClick={() => router.push("/admin/dashboard")}
              className="w-full rounded-xl bg-primary font-bold text-primary-foreground"
            >
              <Users className="mr-2 h-4 w-4" />
              Buka Dashboard Admin
            </Button>
          </div>
        )}
      </div>

      <p className="mt-12 text-xs text-muted-foreground/60">
        © ASCO PRODUCTION · Sistem Absensi Sholat
      </p>
    </div>
  )
}
