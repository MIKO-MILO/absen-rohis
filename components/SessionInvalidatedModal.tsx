"use client"

import { useEffect, useState } from "react"
import { LogOut, ShieldAlert } from "lucide-react"

interface SessionInvalidatedModalProps {
  open: boolean
  onLogout: () => void
  countdownSeconds?: number
}

/**
 * Modal peringatan saat session user/panitia tidak valid karena
 * data diubah oleh admin. Menampilkan countdown sebelum auto-logout.
 */
export function SessionInvalidatedModal({
  open,
  onLogout,
  countdownSeconds = 10,
}: SessionInvalidatedModalProps) {
  const [timeLeft, setTimeLeft] = useState(countdownSeconds)

  // Reset countdown setiap kali modal dibuka
  useEffect(() => {
    if (!open) return

    const frameId = window.requestAnimationFrame(() => {
      setTimeLeft(countdownSeconds)
    })

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [open, countdownSeconds])

  // Countdown timer
  useEffect(() => {
    if (!open) return

    if (timeLeft <= 0) {
      onLogout()
      return
    }

    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000)
    return () => clearTimeout(timer)
  }, [open, timeLeft, onLogout])

  if (!open) return null

  const progress = (timeLeft / countdownSeconds) * 100

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-zinc-900">
        <div className="p-6">
          {/* Icon */}
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <ShieldAlert className="h-8 w-8 text-primary" />
            </div>
          </div>

          {/* Title */}
          <h2 className="mb-2 text-center text-xl font-black text-foreground">
            Sesi Diperbarui
          </h2>

          {/* Description */}
          <p className="mb-5 text-center text-sm leading-relaxed text-muted-foreground">
            Sesi telah habis silahkan login kembali.
          </p>

          {/* Progress bar countdown */}
          <div className="mb-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-1000 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mb-5 text-center text-xs text-muted-foreground">
            Logout otomatis dalam{" "}
            <span className="font-bold text-primary">{timeLeft}</span> detik
          </p>

          {/* Button */}
          <button
            onClick={onLogout}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-bold text-primary-foreground transition-all hover:opacity-90 active:scale-95"
          >
            <LogOut className="h-4 w-4" />
            Logout Sekarang
          </button>
        </div>
      </div>
    </div>
  )
}
