"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import QRCode from "qrcode"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  ArrowLeft,
  RefreshCw,
  Clock,
  CheckCircle2,
  Users,
  Timer,
  ShieldCheck,
  PartyPopper,
} from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"

// ─── Install: npm install qrcode ─────────────────────────────────────────────
// import QRCode from "qrcode";

// ─── Types ───────────────────────────────────────────────────────────────────
type QRStatus = "active" | "expired" | "generating" | "success"

interface AbsenRecord {
  id: number
  nama: string
  kelas: string
  waktu: string
}

interface ScanSuccessData {
  nama: string
  kelas: string
  waktu: string
}

interface AbsensiResponse {
  id: number
  waktu: string
  tanggal: string
  created_at?: string
  users: {
    nama: string
    kelas: string
  } | null
}

// ─── Config ──────────────────────────────────────────────────────────────────
const QR_LIFETIME_SECONDS = 60 // QR expired setelah 60 detik

// ─── Dummy live absen ────────────────────────────────────────────────────────

// ─── Helper: format sisa waktu ───────────────────────────────────────────────
function formatCountdown(sec: number) {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0")
  const s = (sec % 60).toString().padStart(2, "0")
  return `${m}:${s}`
}

// ─── Komponen QR Canvas (menggunakan qrcode library) ────────────────────────
// Di production: ganti placeholder ini dengan QRCode.toCanvas(canvas, token)
function QRCanvas({ token, size = 220 }: { token: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current || !token) return

    const url = `${window.location.origin}/scan?token=${token}`

    QRCode.toCanvas(canvasRef.current, url, {
      width: size,
      margin: 2,
    })
  }, [token, size])

  return (
    <canvas
      ref={canvasRef}
      className="rounded-xl"
      style={{ width: size, height: size }}
    />
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function GenerateQRPage() {
  const router = useRouter()
  const [token, setToken] = useState<string>("")
  const [countdown, setCountdown] = useState(() => QR_LIFETIME_SECONDS)
  const [status, setStatus] = useState<QRStatus>("active")
  const [absenList, setAbsenList] = useState<AbsenRecord[]>([])
  const [scanSuccess, setScanSuccess] = useState<ScanSuccessData | null>(null)
  const lastAbsenIdRef = useRef<number | null>(null)
  const lastTokenRef = useRef<string>("")
  const progress = (countdown / QR_LIFETIME_SECONDS) * 100
  const isWarning = countdown <= 15
  const isExpired = status === "expired"
  const isSuccess = status === "success"
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  // ── Countdown timer ──────────────────────────────────────────────────────
  const startTimer = useCallback((initial = QR_LIFETIME_SECONDS) => {
    if (intervalRef.current) clearInterval(intervalRef.current)

    if (isMounted.current) {
      setCountdown(initial)
      setStatus("active")
    }

    intervalRef.current = setInterval(() => {
      if (isMounted.current) {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (intervalRef.current) clearInterval(intervalRef.current)
            setStatus("expired")
            return 0
          }
          return prev - 1
        })
      }
    }, 1000)
  }, [])

  // ── Generate QR baru ─────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    try {
      if (isMounted.current) setStatus("generating")

      const sessionStr = localStorage.getItem("panitia_session")
      if (!sessionStr) {
        throw new Error("Sesi tidak ditemukan. Silakan login kembali.")
      }
      const session = JSON.parse(sessionStr)

      const res = await fetch("/api/qr/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          panitia_id: session.id,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Request gagal")
      }

      const data = await res.json()
      if (isMounted.current) {
        setToken(data.token)
        lastTokenRef.current = data.token
        startTimer()
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Terjadi kesalahan server"
      console.error(msg)
      if (isMounted.current) setStatus("expired")
    }
  }, [startTimer])

  // ── Fetch Live Absen ─────────────────────────────────────────────────────
  const fetchLiveAbsen = useCallback(async () => {
    try {
      const sessionStr = localStorage.getItem("panitia_session")
      if (!sessionStr) return
      const session = JSON.parse(sessionStr)

      const res = await fetch(`/api/absensi?panitia_id=${session.id}`)
      if (!res.ok) return

      const data = await res.json()

      if (!isMounted.current) return

      const latest = (data as AbsensiResponse[])
        .sort(
          (a, b) =>
            new Date(b.created_at || b.tanggal + " " + b.waktu).getTime() -
            new Date(a.created_at || a.tanggal + " " + b.waktu).getTime()
        )
        .slice(0, 5)
        .map((item) => ({
          id: item.id,
          nama: item.users?.nama || "Siswa",
          kelas: item.users?.kelas || "-",
          waktu: item.waktu || "-",
        }))

      if (isMounted.current) {
        setAbsenList(latest)

        if (latest.length > 0) {
          const newestId = latest[0].id

          if (
            lastAbsenIdRef.current !== null &&
            newestId !== lastAbsenIdRef.current
          ) {
            setScanSuccess({
              nama: latest[0].nama,
              kelas: latest[0].kelas,
              waktu: latest[0].waktu,
            })
            setStatus("success")
            setCountdown(0)

            setTimeout(() => {
              if (isMounted.current) {
                setScanSuccess(null)
                handleGenerate()
              }
            }, 2500)

            setTimeout(() => {
              if (isMounted.current) {
                router.push("/rohis/home")
              }
            }, 3000)
          }
          lastAbsenIdRef.current = newestId
        }
      }
    } catch (err) {
      console.error("Live fetch error:", err)
    }
  }, [handleGenerate, router])

  useEffect(() => {
    const init = async () => {
      await handleGenerate()
    }
    init()
  }, [handleGenerate])

  useEffect(() => {
    const interval = setInterval(fetchLiveAbsen, 3000)
    return () => clearInterval(interval)
  }, [fetchLiveAbsen])

  // ── Progress bar width ───────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen flex-col items-center bg-background">
      {/* ── Header ── */}
      <div
        className="relative w-full max-w-md overflow-hidden rounded-b-[2rem] px-5 pt-10 pb-7 shadow-lg shadow-teal-900/10"
        style={{
          background: "linear-gradient(135deg, #0d9488 0%, #0891b2 100%)",
        }}
      >
        <div
          aria-hidden
          className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/7"
        />
        <div
          aria-hidden
          className="absolute -bottom-5 -left-7.5 h-25 w-25 rounded-full bg-white/5"
        />

        <div className="relative z-10 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="rounded-xl bg-white/15 p-2 transition-colors hover:bg-white/25"
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </button>
          <div className="flex-1">
            <p className="text-[10px] font-semibold tracking-widest text-teal-100 uppercase">
              Admin Panel
            </p>
            <h1 className="text-lg leading-tight font-black text-white">
              Generate QR Absen
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <ModeToggle />
            <div className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-teal-200" />
              <span className="text-xs font-semibold text-teal-100">Admin</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex w-full max-w-md flex-col gap-5 px-4 pt-5 pb-10">
        {/* ── QR Card ── */}
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-md">
          {/* Top info bar */}
          <div className="flex items-center justify-between border-b border-border/50 px-5 pt-4 pb-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Sholat Dzuhur
              </p>
              <p className="text-sm font-bold text-foreground">
                {new Date().toLocaleDateString("id-ID", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </p>
            </div>
            <Badge
              className={`rounded-full border-0 px-3 py-1 text-xs font-bold ${
                isSuccess
                  ? "bg-emerald-500/10 text-emerald-600"
                  : isExpired
                    ? "bg-destructive/10 text-destructive"
                    : isWarning
                      ? "bg-amber-500/10 text-amber-600"
                      : "bg-primary/10 text-primary"
              }`}
            >
              {isSuccess ? "Berhasil!" : isExpired ? "Expired" : "Aktif"}
            </Badge>
          </div>

          {/* QR area */}
          <div className="flex flex-col items-center gap-4 px-6 pt-5 pb-4">
            <div
              className="relative rounded-2xl border-2 bg-white p-4 transition-all duration-300"
              style={{
                borderColor: isSuccess
                  ? "#10b981"
                  : isExpired
                    ? "var(--color-destructive)"
                    : isWarning
                      ? "#fcd34d"
                      : "var(--color-primary)",
                filter: isExpired ? "grayscale(1) opacity(0.4)" : "none",
              }}
            >
              {status === "generating" ? (
                <div
                  className="flex items-center justify-center rounded-xl bg-muted"
                  style={{ width: 220, height: 220 }}
                >
                  <RefreshCw className="h-10 w-10 animate-spin text-primary" />
                </div>
              ) : (
                <QRCanvas token={token} size={220} />
              )}

              {/* Expired overlay */}
              {isExpired && (
                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-background/80 backdrop-blur-sm">
                  <Timer className="mb-2 h-10 w-10 text-destructive" />
                  <p className="text-sm font-bold text-destructive">
                    QR Kadaluarsa
                  </p>
                  <p className="text-xs text-destructive/80">
                    Generate QR baru
                  </p>
                </div>
              )}

              {/* Success overlay */}
              {isSuccess && scanSuccess && (
                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-emerald-500/95 backdrop-blur-sm">
                  <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
                    <CheckCircle2 className="h-10 w-10 text-white" />
                  </div>
                  <p className="text-lg font-bold text-white">
                    {scanSuccess.nama}
                  </p>
                  <p className="text-sm text-white/80">{scanSuccess.kelas}</p>
                  <p className="mt-1 text-xs text-white/60">
                    Absen pukul {scanSuccess.waktu}
                  </p>
                </div>
              )}
            </div>

            {/* Token label */}
            {!isSuccess && (
              <div className="flex w-full items-center justify-center gap-2 rounded-2xl bg-muted px-4 py-2">
                <p className="truncate font-mono text-xs text-muted-foreground">
                  {status === "generating" ? "Generating QR..." : token || "-"}
                </p>
              </div>
            )}

            {/* Countdown bar */}
            {!isSuccess && (
              <div className="flex w-full flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Clock
                      className={`h-3.5 w-3.5 ${isExpired ? "text-destructive" : isWarning ? "text-amber-500" : "text-primary"}`}
                    />
                    <span
                      className={`text-xs font-semibold ${isExpired ? "text-destructive" : isWarning ? "text-amber-600" : "text-foreground/80"}`}
                    >
                      {isExpired
                        ? "Expired"
                        : `Berlaku ${formatCountdown(countdown)}`}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {QR_LIFETIME_SECONDS}s total
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${progress}%`,
                      background: isExpired
                        ? "var(--color-destructive)"
                        : isWarning
                          ? "linear-gradient(90deg, #fbbf24, #f59e0b)"
                          : "var(--color-primary)",
                    }}
                  />
                </div>
              </div>
            )}

            {isSuccess && (
              <div className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500/10 px-4 py-2">
                <PartyPopper className="h-4 w-4 text-emerald-600" />
                <p className="text-sm font-semibold text-emerald-600">
                  QR Successfully Scanned!
                </p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 px-5 pb-5">
            <Button
              onClick={handleGenerate}
              className="flex h-11 flex-1 items-center gap-2 rounded-2xl bg-primary text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 hover:opacity-90"
            >
              <RefreshCw className="h-4 w-4" />
              {isExpired ? "Generate Baru" : "Perbarui QR"}
            </Button>
          </div>
        </div>

        {/* ── Live absen counter ── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-2xl leading-none font-black text-primary">
                {absenList.length}
              </p>
              <p className="mt-0.5 text-[10px] text-primary/80">Sudah Absen</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-background">
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm leading-none font-bold text-foreground">
                {new Date().toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                WIB
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Waktu sekarang
              </p>
            </div>
          </div>
        </div>

        {/* ── Live absen list ── */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">Absen Masuk</h2>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
              <span className="text-xs font-medium text-primary">Live</span>
            </div>
          </div>

          {absenList.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <Users className="mb-2 h-10 w-10 text-muted/30" />
              <p className="text-sm text-muted-foreground">
                Belum ada yang absen
              </p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                Tampil otomatis saat siswa scan QR
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {absenList.map((item) => (
                <Card
                  key={item.id}
                  className="rounded-2xl border border-border bg-card shadow-sm"
                >
                  <CardContent className="flex items-center gap-3 px-4 py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {item.nama}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.kelas}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {item.waktu}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
