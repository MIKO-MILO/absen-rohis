"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { clearAllLocalStorageSessions } from "@/lib/auth-client"

const POLL_INTERVAL_MS = 10_000

export function useSiswaSessionGuard() {
  const router = useRouter()

  const logoutInProgress = useRef(false)
  const modalShown = useRef(false)

  const [showModal, setShowModal] = useState(false)

  const handleLogout = useCallback(async () => {
    if (logoutInProgress.current) return

    logoutInProgress.current = true
    setShowModal(false)

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      })
    } catch {
      // tetap lanjut logout meski request gagal
    }

    clearAllLocalStorageSessions()
    router.push("/")
  }, [router])

  const checkSession = useCallback(async () => {
    // Kalau modal sudah muncul, jangan cek lagi
    if (modalShown.current || logoutInProgress.current) {
      return
    }

    try {
      const res = await fetch("/api/auth/verify-siswa-session", {
        cache: "no-store",
      })

      // Server error → jangan logout
      if (!res.ok) {
        return
      }

      const data = (await res.json()) as {
        valid: boolean
        reason?: string
      }

      if (!data.valid) {
        modalShown.current = true
        setShowModal(true)
      }
    } catch {
      // Offline / timeout → jangan logout
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      checkSession()
    }, POLL_INTERVAL_MS)

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkSession()
      }
    }

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    )

    return () => {
      clearInterval(interval)
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      )
    }
  }, [checkSession])

  return {
    showModal,
    handleLogout,
  }
}