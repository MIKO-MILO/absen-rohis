/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/ban-ts-comment */
"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  FlashlightIcon as Torch,
  SwitchCamera,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react"
import { BrowserQRCodeReader } from "@zxing/library"

// ─── Types ───────────────────────────────────────────────────────────────────
type ScanState = "idle" | "scanning" | "pilih" | "success" | "error"
type AbsenPilihan = "hadir" | "berhalangan" | null

const PILIHAN_CONFIG = {
  hadir: {
    label: "Hadir",
    desc: "Saya mengikuti sholat Dzuhur",
    icon: CheckCircle2,
    active: "border-primary bg-primary/20",
    inactive: "border-border/10 bg-muted/5",
    iconColor: "text-primary",
    badgeColor: "bg-primary",
    successText: "Hadir sholat Dzuhur berhasil dicatat ✅",
    successColor: "text-primary",
    ringColor: "rgba(13,148,136,0.4)",
    ringBg: "rgba(13,148,136,0.15)",
    iconSuccess: CheckCircle2,
    iconSuccessColor: "text-teal-400",
    btnClass: "bg-teal-600 hover:bg-teal-500 shadow-teal-900/40",
  },
  berhalangan: {
    label: "Berhalangan",
    desc: "Haid",
    icon: XCircle,
    active: "border-red-400 bg-red-500/20",
    inactive: "border-border/10 bg-muted/5",
    iconColor: "text-red-400",
    badgeColor: "bg-red-500",
    successText: "Keterangan berhalangan berhasil dicatat 🌸",
    successColor: "text-red-300",
    ringColor: "rgba(244,114,182,0.4)",
    ringBg: "rgba(244,114,182,0.15)",
    iconSuccess: XCircle,
    iconSuccessColor: "text-red-400",
    btnClass: "bg-red-500 hover:bg-red-400 shadow-red-900/40",
  },
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function ScanQRPage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const codeReaderRef = useRef<BrowserQRCodeReader | null>(null)
  const searchParams = useSearchParams()
  const [token, setToken] = useState<string | null>(searchParams.get("token"))

  const [scanState, setScanState] = useState<ScanState>("idle")
  const [errorMsg, setErrorMsg] = useState("")
  const [facingMode, setFacingMode] = useState<"environment" | "user">(
    "environment"
  )
  const [torch, setTorch] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  const [pilihan, setPilihan] = useState<AbsenPilihan>(null)
  const [confirmed, setConfirmed] = useState<AbsenPilihan>(null)
  const [absenNama, setAbsenNama] = useState<string>("")

  const stopScanning = useCallback(() => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setCameraReady(false)
  }, [])

  // ── Setelah scan berhasil → tampilkan modal pilihan ─────────────────────────
  const handleScanSuccess = useCallback(() => {
    stopScanning()
    setPilihan(null)
    setScanState("pilih")
  }, [stopScanning])

  // ── Camera & Scan ──
  const startScanning = useCallback(
    async (mode: "environment" | "user") => {
      setScanState("scanning")
      setCameraReady(false)
      setErrorMsg("")

      if (!codeReaderRef.current) {
        codeReaderRef.current = new BrowserQRCodeReader()
      }

      try {
        const devices = await codeReaderRef.current.listVideoInputDevices()
        const selectedDevice =
          devices.find((d: MediaDeviceInfo) =>
            mode === "environment"
              ? d.label.toLowerCase().includes("back") ||
                d.label.toLowerCase().includes("rear")
              : d.label.toLowerCase().includes("front")
          ) || devices[0]

        if (!selectedDevice) throw new Error("Kamera tidak ditemukan")

        await codeReaderRef.current.decodeFromVideoDevice(
          selectedDevice.deviceId,
          videoRef.current!,
          (result) => {
            if (result) {
              const text = result.getText()
              console.log("Scanned text:", text)

              // 1. Cek apakah ini URL (misal scan dari kamera HP biasa lalu buka di app)
              if (text.includes("token=")) {
                const url = new URL(text)
                const t = url.searchParams.get("token")
                if (t && t.startsWith("ROHIS-DZUHUR-")) {
                  setToken(t)
                  handleScanSuccess()
                }
              }
              // 2. Cek apakah ini raw token dengan prefix
              else if (text.startsWith("ROHIS-DZUHUR-")) {
                setToken(text)
                handleScanSuccess()
              }
            }
          }
        )
        setCameraReady(true)
      } catch (err: unknown) {
        console.error(err)
        setScanState("error")
        const msg =
          err instanceof Error
            ? err.message
            : "Gagal mengakses kamera. Pastikan izin sudah diberikan."
        setErrorMsg(msg)
      }
    },
    [handleScanSuccess]
  )

  useEffect(() => {
    if (token) {
      handleScanSuccess()
    } else {
      startScanning(facingMode)
    }
    return () => stopScanning()
  }, [facingMode, startScanning, stopScanning, token, handleScanSuccess])

  // ── Konfirmasi pilihan ───────────────────────────────────────────────────────
  const handleKonfirmasi = async () => {
    if (!pilihan || !token) return

    try {
      const sessionStr = localStorage.getItem("siswa_session")
      if (!sessionStr)
        throw new Error("Sesi tidak ditemukan. Silakan login kembali.")
      const session = JSON.parse(sessionStr)

      const res = await fetch("/api/qr/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          status: pilihan, // hadir / berhalangan
          user_id: session.id,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Gagal absen")
      }

      setAbsenNama(data.nama || "Siswa")
      setConfirmed(pilihan)
      setScanState("success")

      // Otomatis pindah ke home setelah 3 detik
      setTimeout(() => {
        router.push("/user/home")
      }, 3000)
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Terjadi kesalahan saat absen"
      setErrorMsg(msg)
      setScanState("error")
    }
  }

  const handleBack = () => {
    stopScanning()
    router.back()
  }

  const handleRetry = () => {
    setErrorMsg("")
    setToken(null)
    startScanning(facingMode)
  }

  const toggleTorch = useCallback(async () => {
    // Torch handling with zxing is limited, but we can try via stream
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0]
      try {
        // @ts-ignore
        await track.applyConstraints({ advanced: [{ torch: !torch }] })
        setTorch((p) => !p)
      } catch {}
    }
  }, [torch])

  const switchCamera = useCallback(() => {
    const next = facingMode === "environment" ? "user" : "environment"
    setFacingMode(next)
  }, [facingMode])

  const cfg = confirmed ? PILIHAN_CONFIG[confirmed] : null
  const SuccessIcon = cfg?.iconSuccess ?? CheckCircle2

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-black">
      {/* Camera feed */}
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        playsInline
        muted
      />

      {/* Top bar — sembunyikan saat pilih/success */}
      {(scanState === "scanning" || scanState === "error") && (
        <div className="absolute top-0 right-0 left-0 z-20 flex items-center justify-between px-4 pt-12 pb-4">
          <button
            onClick={handleBack}
            className="flex items-center rounded-full border border-white/10 bg-black/40 px-2 py-2 text-sm font-medium text-white backdrop-blur-sm transition-transform active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex gap-2">
            {facingMode === "environment" && (
              <button
                onClick={toggleTorch}
                className={`flex h-10 w-10 items-center justify-center rounded-full border transition-all active:scale-95 ${
                  torch
                    ? "border-yellow-300 bg-yellow-400 text-black"
                    : "border-white/10 bg-black/40 text-white backdrop-blur-sm"
                }`}
              >
                <Torch className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={switchCamera}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white backdrop-blur-sm transition-transform active:scale-95"
            >
              <SwitchCamera className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Center content */}
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-6 px-6">
        {/* ── SCANNING ── */}
        {scanState === "scanning" && (
          <>
            <div className="text-center">
              <h1 className="text-xl font-bold text-white">Scan QR Code</h1>
              <p className="mt-1 text-sm text-white/60">
                Arahkan kamera ke QR Code absensi
              </p>
            </div>

            {/* Viewfinder */}
            <div className="relative h-64 w-64">
              {[
                "top-0 left-0",
                "top-0 right-0 rotate-90",
                "bottom-0 right-0 rotate-180",
                "bottom-0 left-0 -rotate-90",
              ].map((pos, i) => (
                <span
                  key={i}
                  className={`absolute ${pos} h-10 w-10 border-[3px] border-teal-500`}
                  style={{
                    borderRight: "none",
                    borderBottom: "none",
                    borderRadius: "2px",
                  }}
                />
              ))}
              {cameraReady && (
                <div
                  className="absolute right-1 left-1 h-0.5 rounded-full bg-teal-400/80"
                  style={{
                    boxShadow: "0 0 8px 2px rgba(20,184,166,0.4)",
                    animation: "scanline 2s ease-in-out infinite",
                  }}
                />
              )}
              {!cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-10 w-10 animate-spin text-teal-500" />
                </div>
              )}
            </div>

            <p className="text-center text-xs text-white/40">
              QR Code akan terdeteksi otomatis
            </p>

            {/* Dev: simulate */}
            <Button
              onClick={() => {
                setToken("ROHIS-DZUHUR-SIMULASI-TOKEN")
                handleScanSuccess()
              }}
              disabled={!cameraReady}
              className="h-12 rounded-2xl bg-teal-600/80 px-8 text-sm font-semibold text-white backdrop-blur-sm hover:bg-teal-600"
            >
              Simulasi Berhasil Scan
            </Button>
          </>
        )}

        {/* ── PILIH STATUS ── */}
        {scanState === "pilih" && (
          <div className="flex w-full flex-col gap-5">
            {/* Header */}
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full border-2 border-teal-500/50 bg-teal-500/20">
                <CheckCircle2 className="h-7 w-7 text-teal-400" />
              </div>
              <h2 className="text-xl font-black text-white">
                QR Berhasil Discan!
              </h2>
              <p className="mt-1 text-sm text-white/60">
                Pilih status kehadiranmu
              </p>
            </div>

            {/* Pilihan */}
            <div className="flex flex-col gap-3">
              {(["hadir", "berhalangan"] as const).map((key) => {
                const c = PILIHAN_CONFIG[key]
                const Icon = c.icon
                const isSelected = pilihan === key
                return (
                  <button
                    key={key}
                    onClick={() => setPilihan(key)}
                    className={`flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all active:scale-[0.98] ${
                      isSelected ? c.active : c.inactive
                    }`}
                  >
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                        isSelected ? "bg-white/15" : "bg-white/5"
                      }`}
                    >
                      <Icon className={`h-6 w-6 ${c.iconColor}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white">{c.label}</p>
                      <p className="mt-0.5 text-xs text-white/50">{c.desc}</p>
                    </div>
                    {/* Radio indicator */}
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                        isSelected
                          ? `border-current ${c.iconColor}`
                          : "border-white/20"
                      }`}
                    >
                      {isSelected && (
                        <div
                          className={`h-2.5 w-2.5 rounded-full ${c.badgeColor}`}
                        />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Waktu */}
            <p className="text-center text-xs text-white/30">
              {new Date().toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              WIB
            </p>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleBack}
                className="h-12 flex-1 rounded-2xl border border-white/15 bg-white/5 text-sm font-semibold text-white/70 transition-all active:scale-[0.98]"
              >
                Batal
              </button>
              <button
                onClick={handleKonfirmasi}
                disabled={!pilihan}
                className={`h-12 flex-2 grow-2 rounded-2xl text-sm font-bold text-white shadow-lg transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30 ${
                  pilihan ? PILIHAN_CONFIG[pilihan].btnClass : "bg-white/20"
                }`}
              >
                Konfirmasi
              </button>
            </div>
          </div>
        )}

        {/* ── SUCCESS ── */}
        {scanState === "success" && cfg && (
          <div className="flex flex-col items-center gap-5 text-center">
            <div
              className="flex h-24 w-24 items-center justify-center rounded-full"
              style={{
                background: cfg.ringBg,
                border: `2px solid ${cfg.ringColor}`,
              }}
            >
              <SuccessIcon className={`h-14 w-14 ${cfg.iconSuccessColor}`} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">Berhasil!</h2>
              <p className={`mt-1 text-base font-bold text-teal-300`}>
                {absenNama}
              </p>
              <p className={`mt-0.5 text-sm ${cfg.successColor}`}>
                {cfg.successText}
              </p>
              <p className="mt-4 text-[10px] text-white/30 italic">
                Mengalihkan ke beranda dalam 3 detik...
              </p>
            </div>
            <Button
              onClick={() => router.push("/user/home")}
              className={`h-12 rounded-2xl px-10 font-bold text-white shadow-lg ${cfg.btnClass}`}
            >
              Kembali Sekarang
            </Button>
          </div>
        )}

        {/* ── ERROR ── */}
        {scanState === "error" && (
          <div className="flex flex-col items-center gap-5 text-center">
            <div
              className="flex h-24 w-24 items-center justify-center rounded-full"
              style={{
                background: "rgba(248,113,113,0.15)",
                border: "2px solid rgba(248,113,113,0.3)",
              }}
            >
              <XCircle className="h-14 w-14 text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                Kamera Tidak Tersedia
              </h2>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-red-300">
                {errorMsg}
              </p>
            </div>
            <div className="flex w-full flex-col gap-3">
              <Button
                onClick={handleRetry}
                className="h-12 rounded-2xl bg-primary font-bold text-primary-foreground hover:opacity-90"
              >
                Coba Lagi
              </Button>
              <Button
                variant="outline"
                onClick={handleBack}
                className="h-12 rounded-2xl border-white/20 bg-transparent text-white/70 hover:bg-white/10"
              >
                Kembali
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Scanline animation */}
      <style jsx global>{`
        @keyframes scanline {
          0% {
            top: 8px;
            opacity: 1;
          }
          50% {
            top: calc(100% - 8px);
            opacity: 1;
          }
          100% {
            top: 8px;
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
