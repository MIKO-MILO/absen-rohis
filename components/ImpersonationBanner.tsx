"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  getImpersonationDataAsync,
  getEffectiveUserAsync,
  getOriginalUserAsync,
  stopImpersonationAsync,
} from "@/lib/auth-client"

export function ImpersonationBanner() {
  const [isImpersonating, setIsImpersonating] = useState(false)
  const [targetUser, setTargetUser] = useState<{
    nama: string
    role: string
  } | null>(null)
  const [adminUser, setAdminUser] = useState<{ nama: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkImpersonation() {
      try {
        const impersonation = await getImpersonationDataAsync()
        if (impersonation) {
          setIsImpersonating(true)
          const effective = await getEffectiveUserAsync()
          const original = await getOriginalUserAsync()
          if (effective) {
            setTargetUser({ nama: effective.nama, role: effective.role })
          }
          if (original) {
            setAdminUser({ nama: original.nama })
          }
        }
      } catch (err) {
        console.error("Failed to check impersonation:", err)
      } finally {
        setLoading(false)
      }
    }

    checkImpersonation()
  }, [])

  const handleStopImpersonation = async () => {
    const result = await stopImpersonationAsync()
    if (result.success && result.redirect) {
      // Hard redirect to clear all client state
      window.location.href = result.redirect
    }
  }

  if (loading || !isImpersonating || !targetUser || !adminUser) {
    return null
  }

  return (
    <div className="sticky top-0 z-50 w-full border-b border-amber-200 bg-amber-100 px-4 py-3 dark:border-amber-800 dark:bg-amber-900/30">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
            <span className="text-xs font-bold tracking-wider uppercase">
              MODE IMPERSONASI AKTIF
            </span>
          </div>
          <div className="text-sm text-amber-700 dark:text-amber-300">
            Anda sedang masuk sebagai:{" "}
            <span className="font-semibold">{targetUser.nama}</span>
            <span className="ml-2 rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium dark:bg-amber-800">
              {targetUser.role === "siswa" ? "Siswa" : "Panitia"}
            </span>
          </div>
          <div className="text-xs text-amber-600 dark:text-amber-400">
            Admin asli: <span className="font-medium">{adminUser.nama}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={handleStopImpersonation}
            className="bg-red-600 text-xs text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
          >
            Keluar dari Impersonasi
          </Button>
        </div>
      </div>
    </div>
  )
}
