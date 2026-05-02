/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, LogIn, Loader2 } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"

export default function LoginPage() {
  const router = useRouter()
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async () => {
    setError("")

    if (!identifier || !password) {
      setError("Username/Email/NIS dan password wajib diisi.")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || "Login gagal")
      }

      // Simpan session sederhana (Opsional: gunakan localStorage atau cookie)
      localStorage.setItem(
        "user_session",
        JSON.stringify({
          id: result.user.id,
          role: result.role,
          nama: result.user.nama,
          kelas: result.user.kelas,
          divisi: result.user.divisi,
        })
      )

      router.push(result.redirect)
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-between overflow-hidden bg-background">
      {/* ── Top illustration area ── */}
      <div className="relative flex min-h-[38vh] w-full max-w-md flex-col items-center justify-end overflow-hidden rounded-b-[3rem] bg-linear-to-br from-primary to-primary/80 pb-10">
        {/* Decorative blobs */}
        <div
          aria-hidden
          className="absolute -top-12.5 -right-12.5 h-50 w-50 rounded-full bg-white/7"
        />
        <div
          aria-hidden
          className="absolute top-5 -left-15 h-40 w-40 rounded-full bg-white/5"
        />
        <div
          aria-hidden
          className="absolute -bottom-7.5 left-[30%] h-30 w-30 rounded-full bg-white/6"
        />

        {/* Mode Toggle at Login */}
        <div className="absolute top-12 right-6 z-20">
          <ModeToggle />
        </div>

        {/* Islamic geometric ornament (CSS-drawn) */}
        <div
          aria-hidden
          className="absolute top-6 left-1/2 -translate-x-1/2 opacity-12"
        >
          {[0, 45, 90, 135].map((deg) => (
            <div
              key={deg}
              className="absolute top-1/2 left-1/2 h-20 w-20 rounded-[4px] border-2 border-white"
              style={{
                transform: `translate(-50%, -50%) rotate(${deg}deg)`,
              }}
            />
          ))}
          <div className="h-20 w-20" />
        </div>

        {/* Brand */}
        <div className="relative z-10 flex flex-col items-center gap-2 px-6 text-center">
          {/* Masjid icon (SVG inline) */}
          <div className="mb-1 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 shadow-lg backdrop-blur-md">
            <svg
              viewBox="0 0 48 48"
              fill="none"
              className="h-9 w-9"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M24 4C24 4 20 10 20 14H28C28 10 24 4 24 4Z"
                fill="white"
                fillOpacity="0.9"
              />
              <path
                d="M16 14H32V16C32 16 30 17 30 20V38H18V20C18 17 16 16 16 16V14Z"
                fill="white"
                fillOpacity="0.85"
              />
              <rect
                x="8"
                y="22"
                width="8"
                height="16"
                rx="1"
                fill="white"
                fillOpacity="0.7"
              />
              <rect
                x="32"
                y="22"
                width="8"
                height="16"
                rx="1"
                fill="white"
                fillOpacity="0.7"
              />
              <rect
                x="6"
                y="38"
                width="36"
                height="3"
                rx="1.5"
                fill="white"
                fillOpacity="0.9"
              />
              <rect
                x="21"
                y="26"
                width="6"
                height="12"
                rx="3"
                className="fill-primary-foreground/30"
              />
            </svg>
          </div>
          <h1 className="text-2xl leading-none font-black tracking-tight text-white">
            Absen Rohis
          </h1>
          <p className="text-sm text-white/70">Sistem Absensi Sholat Dzuhur</p>
        </div>
      </div>

      {/* ── Form card ── */}
      <div className="flex w-full max-w-md flex-1 flex-col gap-6 px-5 py-8">
        <div>
          <h2 className="text-xl font-black text-foreground">Masuk Akun</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Gunakan Username/Email/NIS dan password kamu
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {/* Identifier (Email/NIS) */}
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="identifier"
              className="text-xs font-semibold tracking-wider text-muted-foreground uppercase"
            >
              Username / Email / NIS
            </Label>
            <Input
              id="identifier"
              type="text"
              placeholder="Masukkan Email atau NIS kamu"
              value={identifier}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setIdentifier(e.target.value)
              }
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                e.key === "Enter" && handleLogin()
              }
              className="h-12 rounded-2xl border-border bg-card px-4 text-sm text-foreground shadow-sm placeholder:text-muted-foreground/40 focus-visible:ring-primary"
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="password"
              className="text-xs font-semibold tracking-wider text-muted-foreground uppercase"
            >
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPass ? "text" : "password"}
                placeholder="Masukkan password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setPassword(e.target.value)
                }
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                  e.key === "Enter" && handleLogin()
                }
                className="h-12 rounded-2xl border-border bg-card px-4 pr-12 text-sm text-foreground shadow-sm placeholder:text-muted-foreground/40 focus-visible:ring-primary"
              />
              <button
                type="button"
                onClick={() => setShowPass((p) => !p)}
                className="absolute top-1/2 right-3.5 -translate-y-1/2 p-1 text-muted-foreground transition-colors hover:text-foreground"
                tabIndex={-1}
              >
                {showPass ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3">
              <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
              <p className="text-xs font-medium text-destructive">{error}</p>
            </div>
          )}

          {/* Submit */}
          <Button
            onClick={handleLogin}
            disabled={loading}
            className="mt-1 flex h-13 w-full items-center gap-2 rounded-2xl bg-primary text-base font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:opacity-90 active:scale-[0.98]"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                Masuk
              </>
            )}
          </Button>
        </div>

        {/* Hint for demo */}
        <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
          <p className="mb-1 text-xs font-semibold text-primary">Info Login</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            <span className="font-bold">Admin:</span> email admin &nbsp;·&nbsp;
            <span className="font-bold">Panitia:</span> email/NIS &nbsp;·&nbsp;
            <span className="font-bold">Siswa:</span> email siswa
          </p>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="w-full max-w-md px-5 pb-8 text-center">
        <p className="text-xs text-muted-foreground/60">
          © 2025 Rohis · Sistem Absensi Sholat
        </p>
      </div>
    </div>
  )
}
