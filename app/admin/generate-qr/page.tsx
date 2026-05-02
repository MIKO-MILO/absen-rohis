"use client"

import { useState, useEffect, useRef } from "react"
import { AdminShell } from "../_components/AdminShell"
import {
  QrCode,
  Clock,
  RefreshCw,
  Download,
  Copy,
  Check,
  Wifi,
  Timer,
} from "lucide-react"
import QRCode from "qrcode"

// ─── Types ────────────────────────────────────────────────────────────────────
interface QRSession {
  id: string
  tanggal: string
  expiredAt: number
  token: string
}

const DZUHUR = {
  color: "#0d9488",
  bg: "rgba(13,148,136,0.08)",
  time: "12:00 - 13:00",
}
const DURASI_OPTIONS = [1, 2, 5, 7]

function generateToken() {
  return Math.random().toString(36).substring(2, 10).toUpperCase()
}

function pad(n: number) {
  return String(n).padStart(2, "0")
}

// ─── QR Canvas ───────────────────────────────────────────────────────────────
function QRCanvas({ value, size = 220 }: { value: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (canvasRef.current && value) {
      QRCode.toCanvas(canvasRef.current, value, {
        width: size,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      })
    }
  }, [value, size])

  return (
    <div className="rounded-xl bg-white p-2">
      <canvas ref={canvasRef} style={{ borderRadius: 8 }} />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function GenerateQRPage() {
  const [durasi, setDurasi] = useState(10)
  const [session, setSession] = useState<QRSession | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [copied, setCopied] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const todayStr = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  const pct = session ? (secondsLeft / (durasi * 60)) * 100 : 0
  const isExpired = session !== null && secondsLeft <= 0
  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60

  // countdown
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (!session) return

    intervalRef.current = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.floor((session.expiredAt - Date.now()) / 1000)
      )
      setSecondsLeft(remaining)
      if (remaining <= 0 && intervalRef.current)
        clearInterval(intervalRef.current)
    }, 500)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [session])

  const handleGenerate = async () => {
    setIsGenerating(true)
    await new Promise((r) => setTimeout(r, 600))
    const token = generateToken()
    setSession({
      id: `ROHIS-DZUHUR-${token}`,
      tanggal: new Date().toISOString().split("T")[0],
      expiredAt: Date.now() + durasi * 60 * 1000,
      token,
    })
    setSecondsLeft(durasi * 60)
    setIsGenerating(false)
  }

  const handleRefresh = () => {
    if (!session) return
    const token = generateToken()
    setSession({
      ...session,
      token,
      id: `ROHIS-DZUHUR-${token}`,
      expiredAt: Date.now() + durasi * 60 * 1000,
    })
    setSecondsLeft(durasi * 60)
  }

  const handleCopy = () => {
    if (!session) return
    navigator.clipboard.writeText(session.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const canvas = document.querySelector("canvas")
    if (!canvas || !session) return
    const link = document.createElement("a")
    link.download = `QR-Dzuhur-${session.tanggal}.png`
    link.href = canvas.toDataURL()
    link.click()
  }

  return (
    <AdminShell>
      <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-5 md:px-6">
        {/* ── Banner ── */}
        <div className="relative flex items-center justify-between overflow-hidden rounded-2xl bg-linear-to-br to from-primary/80 p-5">
          <div
            aria-hidden
            className="absolute -top-7.5 -right-7.5 h-35 w-35 rounded-full bg-white/10"
          />
          <div
            aria-hidden
            className="absolute -bottom-5 left-[40%] h-22.5 w-22.5 rounded-full bg-white/5"
          />
          <div className="relative z-10">
            <p className="text-xs text-primary-foreground/70">
              Generate QR Code
            </p>
            <h2 className="mt-0.5 text-xl font-black text-primary-foreground">
              Sholat Dzuhur
            </h2>
            <p className="mt-1 text-xs text-primary-foreground/60">
              {todayStr}
            </p>
          </div>
          <div className="relative z-10 flex flex-col items-end gap-1">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/15">
              <QrCode className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-[10px] font-semibold text-primary-foreground/60">
              {DZUHUR.time}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
          {/* ── Left: Config ── */}
          <div className="flex flex-col gap-4 lg:col-span-2">
            {/* Info card */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-bold text-foreground">
                Sesi Absensi
              </h3>
              <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <QrCode className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-black text-primary">
                    Sholat Dzuhur
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    12:00 - 13:00
                  </p>
                </div>
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                QR code ini digunakan untuk absensi sholat Dzuhur berjamaah.
                Siswa scan QR untuk mencatat kehadiran.
              </p>
            </div>

            {/* Durasi */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-bold text-foreground">
                Durasi QR Aktif
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {DURASI_OPTIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDurasi(d)}
                    className={`rounded-xl border py-2.5 text-xs font-bold transition-all ${
                      durasi === d
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted text-muted-foreground"
                    }`}
                  >
                    {d}m
                  </button>
                ))}
              </div>
              <p className="mt-2.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                <Timer className="h-3 w-3" />
                QR otomatis kedaluwarsa setelah {durasi} menit
              </p>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-black text-white shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-60"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> Generating...
                </>
              ) : (
                <>
                  <QrCode className="h-4 w-4" />{" "}
                  {session ? "Regenerate QR" : "Generate QR Code"}
                </>
              )}
            </button>
          </div>

          {/* ── Right: QR Display ── */}
          <div className="lg:col-span-3">
            <div className="flex min-h-[400px] flex-col items-center justify-center gap-5 rounded-2xl border border-border bg-card p-6 shadow-sm">
              {!session ? (
                <div className="flex flex-col items-center gap-4 py-8">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted">
                    <QrCode className="h-10 w-10 text-muted-foreground/40" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-muted-foreground">
                      Belum ada QR Code
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground/60">
                      Atur durasi lalu klik Generate
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Status */}
                  <div className="flex w-full items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      Sholat Dzuhur
                    </span>
                    {isExpired ? (
                      <span className="rounded-full border border-destructive/20 bg-destructive/10 px-3 py-1 text-xs font-bold text-destructive">
                        Kedaluwarsa
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                        <Wifi className="h-3 w-3" /> Aktif
                      </span>
                    )}
                  </div>

                  {/* QR */}
                  <div
                    className={`relative rounded-2xl p-4 transition-all duration-300 ${
                      isExpired
                        ? "border-border opacity-40 grayscale filter"
                        : "border-primary/20 shadow-xl shadow-primary/10"
                    }`}
                  >
                    <QRCanvas value={session.id} size={200} />
                    {isExpired && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-background/80 backdrop-blur-sm">
                        <div className="text-center">
                          <p className="text-sm font-black text-destructive">
                            Kedaluwarsa
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Klik Regenerate QR
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Countdown */}
                  {!isExpired && (
                    <div className="w-full">
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" /> Sisa waktu
                        </span>
                        <span
                          className={`text-sm font-black ${secondsLeft < 60 ? "text-destructive" : "text-primary"}`}
                        >
                          {pad(mins)}:{pad(secs)}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ${
                            secondsLeft < 60 ? "bg-destructive" : "bg-primary"
                          }`}
                          style={{
                            width: `${pct}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Token */}
                  <div className="flex w-full items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2.5">
                    <code className="flex-1 truncate font-mono text-xs text-muted-foreground">
                      {session.id}
                    </code>
                    <button onClick={handleCopy} className="shrink-0">
                      {copied ? (
                        <Check className="h-4 w-4 text-primary" />
                      ) : (
                        <Copy className="h-4 w-4 text-muted-foreground transition-colors hover:text-foreground" />
                      )}
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="grid w-full grid-cols-2 gap-2">
                    <button
                      onClick={handleRefresh}
                      className="flex items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Refresh QR
                    </button>
                    <button
                      onClick={handleDownload}
                      className="flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-semibold text-white transition-all active:scale-95"
                    >
                      <Download className="h-3.5 w-3.5" /> Download
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Riwayat ── */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="border-b border-border/50 px-5 pt-4 pb-3">
            <h3 className="text-sm font-bold text-foreground">
              Riwayat QR Hari Ini
            </h3>
            <p className="text-xs text-muted-foreground">
              Session Dzuhur yang pernah di-generate
            </p>
          </div>
          <div className="divide-y divide-border/50">
            <div className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/60">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <QrCode className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">
                  Sholat Dzuhur
                </p>
                <p className="text-xs text-muted-foreground">
                  12:03 · <code className="font-mono">KX7PM4NQ</code>
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-black text-primary">29</p>
                <p className="text-[10px] text-muted-foreground">hadir</p>
              </div>
              <span className="rounded-lg bg-muted px-2 py-1 text-[10px] font-semibold text-muted-foreground">
                Selesai
              </span>
            </div>

            {session && (
              <div className="flex items-center gap-3 bg-primary/5 px-5 py-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <QrCode className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    Sholat Dzuhur
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Baru saja ·{" "}
                    <code className="font-mono">{session.token}</code>
                  </p>
                </div>
                <span
                  className={`rounded-lg border px-2 py-1 text-[10px] font-bold ${
                    isExpired
                      ? "border-border bg-muted text-muted-foreground"
                      : "border-primary/20 bg-primary/10 text-primary"
                  }`}
                >
                  {isExpired ? "Selesai" : "Aktif"}
                </span>
              </div>
            )}

            {!session && (
              <div className="px-5 py-4 text-center text-xs text-muted-foreground/60">
                Belum ada sesi aktif hari ini
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  )
}
