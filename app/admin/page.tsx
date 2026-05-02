"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, LogIn, Loader2, ShieldCheck } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"

export default function AdminLoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async () => {
    setError("")

    if (!username || !password) {
      setError("Username dan password wajib diisi.")
      return
    }

    setLoading(true)
    // Simulasi request — ganti dengan API call nyata
    await new Promise((r) => setTimeout(r, 1500))
    setLoading(false)

    if (username === "admin" && password === "admin123") {
      router.push("/admin/dashboard")
    } else {
      setError("Username atau password salah.")
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      {/* Mode Toggle */}
      <div className="fixed top-6 right-6">
        <ModeToggle />
      </div>

      {/* Background decoration */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, var(--color-primary-transparent) 0%, transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed right-0 bottom-0 left-0 h-64"
        style={{
          background:
            "radial-gradient(ellipse 60% 60% at 50% 120%, var(--color-primary-transparent-subtle) 0%, transparent 70%)",
        }}
      />

      {/* Card */}
      <div className="max-sm relative w-full">
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-xl">
          {/* Top accent bar */}
          <div className="h-1.5 w-full bg-linear-to-r from-primary to-primary/60" />

          <div className="flex flex-col gap-7 px-7 pt-8 pb-8">
            {/* Brand */}
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-primary to shadow-lg shadow-primary/10">
                <svg viewBox="0 0 48 48" fill="none" className="h-9 w-9">
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
              <div className="text-center">
                <h1 className="text-lg leading-tight font-black text-foreground">
                  Absen Rohis
                </h1>
                <div className="mt-1 flex items-center justify-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  <p className="text-xs font-semibold text-primary">
                    Admin Panel
                  </p>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] font-medium tracking-widest text-muted-foreground uppercase">
                Login
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="username"
                  className="px-1 text-[10px] font-bold tracking-widest text-muted-foreground uppercase"
                >
                  Username
                </Label>
                <Input
                  id="username"
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-12 rounded-2xl border-border bg-muted/30 px-4 text-sm focus-visible:ring-primary"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="password"
                  className="px-1 text-[10px] font-bold tracking-widest text-muted-foreground uppercase"
                >
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPass ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    className="h-12 rounded-2xl border-border bg-muted/30 px-4 pr-12 text-sm focus-visible:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute top-1/2 right-4 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex animate-in items-center gap-2 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-2.5 duration-200 zoom-in-95 fade-in">
                  <div className="h-1 w-1 rounded-full bg-destructive" />
                  <p className="text-[11px] font-medium text-destructive">
                    {error}
                  </p>
                </div>
              )}

              <Button
                onClick={handleLogin}
                disabled={loading}
                className="mt-2 h-12 rounded-2xl bg-primary font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:opacity-90 active:scale-[0.98]"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Verifikasi...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <LogIn size={18} />
                    <span>Masuk Dashboard</span>
                  </div>
                )}
              </Button>
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-[10px] font-medium tracking-[0.2em] text-muted-foreground uppercase">
          © 2025 Rohis Dev Team
        </p>
      </div>
    </div>
  )
}
