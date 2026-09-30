"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { clearAllLocalStorageSessions } from "@/lib/auth-client"

const POLL_INTERVAL_MS = 10_000 // cek setiap 10 detik

/**
 * usePanitiaSessionGuard
 *
 * Mengembalikan { showModal, handleLogout } untuk ditampilkan di halaman.
 * Saat data panitia berubah di DB, showModal = true dan muncul countdown.
 * Setelah countdown atau user klik logout → clear session → redirect ke "/".
 */
export function usePanitiaSessionGuard() {
  const router = useRouter()
  const logoutInProgress = useRef(false)
  const [showModal, setShowModal] = useState(false)

  const handleLogout = useCallback(async () => {
    if (logoutInProgress.current) return
    logoutInProgress.current = true
    setShowModal(false)

    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } catch {
      // tetap lanjut logout meski request gagal
    }

    clearAllLocalStorageSessions()
    router.push("/")
  }, [router])

  const checkSession = useCallback(async () => {
    // Kalau modal sudah muncul, tidak perlu cek lagi
    if (showModal || logoutInProgress.current) return

    try {
      const res = await fetch("/api/auth/verify-panitia-session", {
        cache: "no-store",
      })

      if (!res.ok) return // server error → skip, jangan logout

      const data = (await res.json()) as { valid: boolean; reason?: string }

      if (!data.valid) {
        setShowModal(true)
      }
    } catch {
      // Gagal fetch (offline, timeout) → skip, jangan logout
    }
  }, [showModal])

  useEffect(() => {
    // Cek pertama setelah effect selesai
    const frameId = window.requestAnimationFrame(() => {
      void checkSession()
    })

    // Polling berkala
    const interval = setInterval(() => {
      void checkSession()
    }, POLL_INTERVAL_MS)

    // Cek juga saat tab kembali aktif
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void checkSession()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      window.cancelAnimationFrame(frameId)
      clearInterval(interval)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [checkSession])

  return { showModal, handleLogout }
}
