"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  FlashlightIcon as Torch,
  SwitchCamera,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react"
import { BrowserQRCodeReader } from "@zxing/library"

// ─── Install: npm install @zxing/library ─────────────────────────────────────
// Untuk production gunakan: import { BrowserQRCodeReader } from "@zxing/library"

// ─── Types ───────────────────────────────────────────────────────────────────
type ScanState = "idle" | "scanning" | "success" | "error"

// ─── Component ────────────────────────────────────────────────────────────────
export default function ScanQRPage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [scanState, setScanState] = useState<ScanState>("idle")
  const [errorMsg, setErrorMsg] = useState<string>("")
  const [successMsg, setSuccessMsg] = useState<string>("")
  const [facingMode, setFacingMode] = useState<"environment" | "user">(
    "environment"
  )
  const [torch, setTorch] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)

  // ── Start camera ────────────────────────────────────────────────────────────
  const startCamera = useCallback(async (mode: "environment" | "user") => {
    // Stop existing stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
    }
    setCameraReady(false)
    setScanState("scanning")

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play()
          setCameraReady(true)
        }
      }
    } catch (err) {
      console.error(err)
      setScanState("error")
      setErrorMsg(
        "Tidak dapat mengakses kamera. Pastikan Haid kamera sudah diberikan."
      )
    }
  }, [])

  // ── Stop camera ─────────────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
    }
    setCameraReady(false)
  }, [])

  // ── Toggle torch ────────────────────────────────────────────────────────────
  const toggleTorch = useCallback(async () => {
    if (!streamRef.current) return
    const track = streamRef.current.getVideoTracks()[0]
    try {
      // @ts-ignore – torch is not in all TypeScript MediaTrackConstraints definitions
      await track.applyConstraints({ advanced: [{ torch: !torch }] })
      setTorch((p) => !p)
    } catch {
      // torch not supported on this device
    }
  }, [torch])

  // ── Switch camera ───────────────────────────────────────────────────────────
  const switchCamera = useCallback(() => {
    const next = facingMode === "environment" ? "user" : "environment"
    setFacingMode(next)
    startCamera(next)
    setTorch(false)
  }, [facingMode, startCamera])

  // ── Simulate QR detection (replace with @zxing/library in production) ──────
  const simulateScan = useCallback(() => {
    if (scanState !== "scanning") return
    // Simulate detection after 3s
    setTimeout(() => {
      setScanState("success")
      setSuccessMsg("Absensi Dzuhur berhasil dicatat! ✅")
      stopCamera()
    }, 3000)
  }, [scanState, stopCamera])

  useEffect(() => {
    startCamera(facingMode)
    return () => stopCamera()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (cameraReady && scanState === "scanning") {
      // In production: kick off @zxing BrowserQRCodeReader here
      // simulateScan(); // Uncomment to simulate auto-detect
    }
  }, [cameraReady, scanState, simulateScan])

  // ── Manual simulate button (dev only) ──────────────────────────────────────
  const handleManualSuccess = () => {
    setScanState("success")
    setSuccessMsg("Absensi Dzuhur berhasil dicatat! ✅")
    stopCamera()
  }

  // ── Back ────────────────────────────────────────────────────────────────────
  const handleBack = () => {
    stopCamera()
    router.back()
  }

  // ── Retry ───────────────────────────────────────────────────────────────────
  const handleRetry = () => {
    setErrorMsg("")
    setScanState("idle")
    startCamera(facingMode)
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-black">
      {/* ── Camera feed ── */}
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        playsInline
        muted
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* ── Dark overlay ── */}
      <div className="absolute inset-0 bg-black/50" />

      {/* ── Top bar ── */}
      <div className="absolute top-0 right-0 left-0 z-20 flex items-center justify-between px-4 pt-12 pb-4">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition-transform active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </button>
        <div className="flex gap-2">
          {/* Torch button */}
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
          {/* Switch camera */}
          <button
            onClick={switchCamera}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white backdrop-blur-sm transition-transform active:scale-95"
          >
            <SwitchCamera className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Center content ── */}
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-6 px-8">
        {/* ── SCANNING state ── */}
        {scanState === "scanning" && (
          <>
            {/* Title */}
            <div className="text-center">
              <h1 className="text-xl font-bold text-white">Scan QR Code</h1>
              <p className="mt-1 text-sm text-white/60">
                Arahkan kamera ke QR Code absensi
              </p>
            </div>

            {/* QR Viewfinder */}
            <div className="relative h-64 w-64">
              {/* Corner borders */}
              {[
                "top-0 left-0",
                "top-0 right-0 rotate-90",
                "bottom-0 right-0 rotate-180",
                "bottom-0 left-0 -rotate-90",
              ].map((pos, i) => (
                <span
                  key={i}
                  className={`absolute ${pos} h-10 w-10 border-[3px] border-teal-400`}
                  style={{
                    borderRight: "none",
                    borderBottom: "none",
                    borderRadius: "2px",
                  }}
                />
              ))}

              {/* Scan line animation */}
              {cameraReady && (
                <div
                  className="absolute right-1 left-1 h-0.5 rounded-full bg-teal-400/80"
                  style={{
                    boxShadow: "0 0 8px 2px rgba(45,212,191,0.6)",
                    animation: "scanline 2s ease-in-out infinite",
                  }}
                />
              )}

              {/* Loading spinner if camera not ready */}
              {!cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-10 w-10 animate-spin text-teal-400" />
                </div>
              )}
            </div>

            {/* Hint */}
            <p className="text-center text-xs text-white/40">
              QR Code akan terdeteksi otomatis
            </p>

            {/* Dev: manual simulate button */}
            <Button
              onClick={handleManualSuccess}
              disabled={!cameraReady}
              className="h-12 rounded-2xl bg-teal-600/80 px-8 text-sm font-semibold text-white backdrop-blur-sm hover:bg-teal-500"
            >
              Simulasi Berhasil Scan
            </Button>
          </>
        )}

        {/* ── SUCCESS state ── */}
        {scanState === "success" && (
          <div className="flex flex-col items-center gap-5 text-center">
            <div
              className="flex h-24 w-24 items-center justify-center rounded-full"
              style={{
                background: "rgba(52,211,153,0.15)",
                border: "2px solid rgba(52,211,153,0.4)",
              }}
            >
              <CheckCircle2 className="h-14 w-14 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">Berhasil!</h2>
              <p className="mt-1 text-sm text-emerald-300">{successMsg}</p>
              <p className="mt-2 text-xs text-white/40">
                {new Date().toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                WIB
              </p>
            </div>
            <Button
              onClick={() => {
                stopCamera()
                router.push("/")
              }}
              className="h-12 rounded-2xl bg-emerald-500 px-10 font-bold text-white shadow-lg shadow-emerald-900/40 hover:bg-emerald-400"
            >
              Kembali ke Beranda
            </Button>
          </div>
        )}

        {/* ── ERROR state ── */}
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
                className="h-12 rounded-2xl bg-teal-600 font-bold text-white hover:bg-teal-500"
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

      {/* ── Scanline CSS animation ── */}
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
