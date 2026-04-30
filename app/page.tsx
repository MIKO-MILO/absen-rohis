"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, LogIn, Loader2 } from "lucide-react"

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
    <div className="flex min-h-screen flex-col items-center justify-between overflow-hidden bg-[#f5f7f6]">
      {/* ── Top illustration area ── */}
      <div
        className="relative flex w-full max-w-md flex-col items-center justify-end"
        style={{
          background: "linear-gradient(160deg, #0d9488 0%, #0e7490 100%)",
          borderRadius: "0 0 3rem 3rem",
          minHeight: "38vh",
          paddingBottom: "2.5rem",
          overflow: "hidden",
        }}
      >
        {/* Decorative blobs */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: "-50px",
            right: "-50px",
            width: "200px",
            height: "200px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.07)",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: "20px",
            left: "-60px",
            width: "160px",
            height: "160px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.05)",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            bottom: "-30px",
            left: "30%",
            width: "120px",
            height: "120px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.06)",
          }}
        />

        {/* Islamic geometric ornament (CSS-drawn) */}
        <div
          aria-hidden
          className="absolute top-6 left-1/2 -translate-x-1/2"
          style={{ opacity: 0.12 }}
        >
          {[0, 45, 90, 135].map((deg) => (
            <div
              key={deg}
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                width: "80px",
                height: "80px",
                border: "2px solid white",
                transform: `translate(-50%, -50%) rotate(${deg}deg)`,
                borderRadius: "4px",
              }}
            />
          ))}
          <div style={{ width: "80px", height: "80px" }} />
        </div>

        {/* Brand */}
        <div className="relative z-10 flex flex-col items-center gap-2 px-6 text-center">
          {/* Masjid icon (SVG inline) */}
          <div
            className="mb-1 flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg"
            style={{
              background: "rgba(255,255,255,0.15)",
              backdropFilter: "blur(8px)",
            }}
          >
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
                fill="rgba(13,148,136,0.6)"
              />
            </svg>
          </div>
          <h1 className="text-2xl leading-none font-black tracking-tight text-white">
            Absen Rohis
          </h1>
          <p className="text-sm text-teal-100">Sistem Absensi Sholat Dzuhur</p>
        </div>
      </div>

      {/* ── Form card ── */}
      <div className="flex w-full max-w-md flex-1 flex-col gap-6 px-5 py-8">
        <div>
          <h2 className="text-xl font-black text-slate-800">Masuk Akun</h2>
          <p className="mt-0.5 text-sm text-slate-400">
            Gunakan Username/Email/NIS dan password kamu
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {/* Identifier (Email/NIS) */}
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="identifier"
              className="text-xs font-semibold tracking-wider text-slate-600 uppercase"
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
              className="h-12 rounded-2xl border-slate-200 bg-white px-4 text-sm text-slate-800 shadow-sm placeholder:text-slate-300 focus-visible:border-teal-400 focus-visible:ring-teal-400"
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="password"
              className="text-xs font-semibold tracking-wider text-slate-600 uppercase"
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
                className="h-12 rounded-2xl border-slate-200 bg-white px-4 pr-12 text-sm text-slate-800 shadow-sm placeholder:text-slate-300 focus-visible:border-teal-400 focus-visible:ring-teal-400"
              />
              <button
                type="button"
                onClick={() => setShowPass((p) => !p)}
                className="absolute top-1/2 right-3.5 -translate-y-1/2 p-1 text-slate-400 transition-colors hover:text-slate-600"
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
            <div className="flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
              <div className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-400" />
              <p className="text-xs font-medium text-red-500">{error}</p>
            </div>
          )}

          {/* Submit */}
          <Button
            onClick={handleLogin}
            disabled={loading}
            className="mt-1 flex h-12 h-13 w-full items-center gap-2 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 text-base font-bold text-white shadow-lg shadow-teal-200/60 transition-all hover:from-teal-400 hover:to-cyan-400 active:scale-[0.98]"
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
        <div className="rounded-2xl border border-teal-100 bg-teal-50 px-4 py-3">
          <p className="mb-1 text-xs font-semibold text-teal-600">Info Login</p>
          <p className="text-xs leading-relaxed text-teal-500">
            <span className="font-bold">Admin:</span> email admin &nbsp;·&nbsp;
            <span className="font-bold">Panitia:</span> email/NIS &nbsp;·&nbsp;
            <span className="font-bold">Siswa:</span> email siswa
          </p>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="w-full max-w-md px-5 pb-8 text-center">
        <p className="text-xs text-slate-300">
          © 2025 Rohis · Sistem Absensi Sholat
        </p>
      </div>
    </div>
  )
}
