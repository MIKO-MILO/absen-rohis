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
        color: { dark: "#0f172a", light: "#ffffff" },
      })
    }
  }, [value, size])

  return <canvas ref={canvasRef} style={{ borderRadius: 12 }} />
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
        <div
          className="relative flex items-center justify-between overflow-hidden rounded-2xl p-5"
          style={{
            background: "linear-gradient(135deg, #0d9488 0%, #0891b2 100%)",
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
            <p className="text-xs text-teal-100">Generate QR Code</p>
            <h2 className="mt-0.5 text-xl font-black text-white">
              Sholat Dzuhur
            </h2>
            <p className="mt-1 text-xs text-teal-200">{todayStr}</p>
          </div>
          <div className="relative z-10 flex flex-col items-end gap-1">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl"
              style={{
                background: "rgba(255,255,255,0.15)",
                border: "1px solid rgba(255,255,255,0.2)",
              }}
            >
              <QrCode className="h-6 w-6 text-white" />
            </div>
            <span className="text-[10px] font-semibold text-teal-200">
              {DZUHUR.time}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
          {/* ── Left: Config ── */}
          <div className="flex flex-col gap-4 lg:col-span-2">
            {/* Info card */}
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-bold text-slate-800">
                Sesi Absensi
              </h3>
              <div
                className="flex items-center gap-3 rounded-xl border p-3"
                style={{
                  background: DZUHUR.bg,
                  borderColor: `${DZUHUR.color}33`,
                }}
              >
                <div
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
                  style={{ background: "rgba(13,148,136,0.15)" }}
                >
                  <QrCode className="h-4 w-4" style={{ color: DZUHUR.color }} />
                </div>
                <div>
                  <p
                    className="text-sm font-black"
                    style={{ color: DZUHUR.color }}
                  >
                    Sholat Dzuhur
                  </p>
                  <p className="text-[11px] text-slate-400">{DZUHUR.time}</p>
                </div>
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
                QR code ini digunakan untuk absensi sholat Dzuhur berjamaah.
                Siswa scan QR untuk mencatat kehadiran.
              </p>
            </div>

            {/* Durasi */}
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-bold text-slate-800">
                Durasi QR Aktif
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {DURASI_OPTIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDurasi(d)}
                    className="rounded-xl border py-2.5 text-xs font-bold transition-all"
                    style={{
                      background: durasi === d ? DZUHUR.bg : "#fafafa",
                      borderColor: durasi === d ? DZUHUR.color : "#f1f5f9",
                      color: durasi === d ? DZUHUR.color : "#94a3b8",
                    }}
                  >
                    {d}m
                  </button>
                ))}
              </div>
              <p className="mt-2.5 flex items-center gap-1 text-[10px] text-slate-400">
                <Timer className="h-3 w-3" />
                QR otomatis kedaluwarsa setelah {durasi} menit
              </p>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-black text-white transition-all active:scale-95 disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, #0d9488, #0891b2)",
                boxShadow: isGenerating
                  ? "none"
                  : "0 4px 16px rgba(13,148,136,0.35)",
              }}
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
            <div className="flex min-h-[400px] flex-col items-center justify-center gap-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              {!session ? (
                <div className="flex flex-col items-center gap-4 py-8">
                  <div
                    className="flex h-20 w-20 items-center justify-center rounded-2xl"
                    style={{ background: DZUHUR.bg }}
                  >
                    <QrCode className="h-10 w-10 text-teal-300" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-slate-400">
                      Belum ada QR Code
                    </p>
                    <p className="mt-1 text-xs text-slate-300">
                      Atur durasi lalu klik Generate
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Status */}
                  <div className="flex w-full items-center justify-between">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
                      style={{ background: DZUHUR.bg, color: DZUHUR.color }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: DZUHUR.color }}
                      />
                      Sholat Dzuhur
                    </span>
                    {isExpired ? (
                      <span className="rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-bold text-red-500">
                        Kedaluwarsa
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-full border border-teal-100 bg-teal-50 px-3 py-1 text-xs font-bold text-teal-600">
                        <Wifi className="h-3 w-3" /> Aktif
                      </span>
                    )}
                  </div>

                  {/* QR */}
                  <div
                    className="relative rounded-2xl p-4"
                    style={{
                      border: `2px solid ${isExpired ? "#f1f5f9" : DZUHUR.color}33`,
                      boxShadow: isExpired ? "none" : `0 0 0 4px ${DZUHUR.bg}`,
                      filter: isExpired ? "grayscale(1) opacity(0.4)" : "none",
                      transition: "all 0.3s",
                    }}
                  >
                    <QRCanvas value={session.id} size={200} />
                    {isExpired && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/80 backdrop-blur-sm">
                        <div className="text-center">
                          <p className="text-sm font-black text-red-500">
                            Kedaluwarsa
                          </p>
                          <p className="mt-0.5 text-xs text-slate-400">
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
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <Clock className="h-3 w-3" /> Sisa waktu
                        </span>
                        <span
                          className="text-sm font-black"
                          style={{
                            color: secondsLeft < 60 ? "#ef4444" : DZUHUR.color,
                          }}
                        >
                          {pad(mins)}:{pad(secs)}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{
                            width: `${pct}%`,
                            background:
                              secondsLeft < 60
                                ? "linear-gradient(90deg,#f87171,#ef4444)"
                                : "linear-gradient(90deg,#2dd4bf,#0d9488)",
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Token */}
                  <div className="flex w-full items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                    <code className="flex-1 truncate font-mono text-xs text-slate-600">
                      {session.id}
                    </code>
                    <button onClick={handleCopy} className="flex-shrink-0">
                      {copied ? (
                        <Check className="h-4 w-4 text-teal-500" />
                      ) : (
                        <Copy className="h-4 w-4 text-slate-400 transition-colors hover:text-slate-600" />
                      )}
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="grid w-full grid-cols-2 gap-2">
                    <button
                      onClick={handleRefresh}
                      className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Refresh QR
                    </button>
                    <button
                      onClick={handleDownload}
                      className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold text-white transition-all active:scale-95"
                      style={{
                        background: "linear-gradient(135deg,#0d9488,#0891b2)",
                      }}
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
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-50 px-5 pt-4 pb-3">
            <h3 className="text-sm font-bold text-slate-800">
              Riwayat QR Hari Ini
            </h3>
            <p className="text-xs text-slate-400">
              Session Dzuhur yang pernah di-generate
            </p>
          </div>
          <div className="divide-y divide-slate-50">
            <div className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-slate-50/60">
              <div
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl"
                style={{ background: DZUHUR.bg }}
              >
                <QrCode className="h-4 w-4" style={{ color: DZUHUR.color }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800">
                  Sholat Dzuhur
                </p>
                <p className="text-xs text-slate-400">
                  12:03 · <code className="font-mono">KX7PM4NQ</code>
                </p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p
                  className="text-sm font-black"
                  style={{ color: DZUHUR.color }}
                >
                  29
                </p>
                <p className="text-[10px] text-slate-400">hadir</p>
              </div>
              <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-400">
                Selesai
              </span>
            </div>

            {session && (
              <div className="flex items-center gap-3 bg-teal-50/40 px-5 py-3">
                <div
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl"
                  style={{ background: DZUHUR.bg }}
                >
                  <QrCode className="h-4 w-4" style={{ color: DZUHUR.color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800">
                    Sholat Dzuhur
                  </p>
                  <p className="text-xs text-slate-400">
                    Baru saja ·{" "}
                    <code className="font-mono">{session.token}</code>
                  </p>
                </div>
                <span
                  className="rounded-lg border px-2 py-1 text-[10px] font-bold"
                  style={{
                    background: isExpired ? "#f1f5f9" : DZUHUR.bg,
                    color: isExpired ? "#94a3b8" : DZUHUR.color,
                    borderColor: isExpired ? "#e2e8f0" : `${DZUHUR.color}33`,
                  }}
                >
                  {isExpired ? "Selesai" : "Aktif"}
                </span>
              </div>
            )}

            {!session && (
              <div className="px-5 py-4 text-center text-xs text-slate-300">
                Belum ada sesi aktif hari ini
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  )
}
