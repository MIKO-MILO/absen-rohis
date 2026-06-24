"use client"

import { useState, useEffect } from "react"
import { ShieldAlert, RefreshCcw, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"

export default function MaintenancePage() {
  const [currentTime, setCurrentTime] = useState<Date>(new Date())
  const [refreshing, setRefreshing] = useState(false)

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await new Promise(resolve => setTimeout(resolve, 800))
    window.location.reload()
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-between overflow-hidden bg-background">
      {/* Header Area */}
      <div
        className="relative flex min-h-[38vh] w-full max-w-md flex-col items-center justify-end overflow-hidden rounded-b-[3rem] pb-10"
        style={{
          background: "linear-gradient(135deg, #dc2626 0%, #ea580c 100%)",
        }}
      >
        {/* Decorative blobs */}
        <div
          aria-hidden
          className="absolute -top-12.5 -right-12.5 h-50 w-50 rounded-full bg-white/7"
        />
        <div
          aria-hidden
          className="absolute top-5 -left-15 h-40 w-40 rounded-full bg-white/5"
        />
        <div
          aria-hidden
          className="absolute -bottom-7.5 left-[30%] h-30 w-30 rounded-full bg-white/6"
        />

        {/* Mode Toggle */}
        <div className="absolute top-12 right-6 z-20">
          <ModeToggle />
        </div>

        {/* Islamic geometric ornament */}
        <div
          aria-hidden
          className="absolute top-6 left-1/2 -translate-x-1/2 opacity-12"
        >
          {[0, 45, 90, 135].map((deg) => (
            <div
              key={deg}
              className="absolute top-1/2 left-1/2 h-20 w-20 rounded-[4px] border-2 border-white"
              style={{
                transform: `translate(-50%, -50%) rotate(${deg}deg)`,
              }}
            />
          ))}
          <div className="h-20 w-20" />
        </div>

        {/* Brand */}
        <div className="relative z-10 flex flex-col items-center gap-2 px-6 text-center">
          <div className="mb-1 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 shadow-lg backdrop-blur-md">
            <ShieldAlert className="h-9 w-9 text-white" />
          </div>
          <h1 className="text-2xl leading-none font-black tracking-tight text-white">
            Sistem Sedang Maintenance
          </h1>
          <p className="text-sm text-white/70">Kami sedang melakukan pembaruan sistem</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex w-full max-w-md flex-1 flex-col gap-6 px-5 py-8">
        {/* Status Card */}
        <div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
              <Clock className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Maintenance Mode Active</h3>
              <p className="text-sm text-muted-foreground">Sistem sedang diperbaiki</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-background p-4 border border-border">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Tanggal
              </span>
              <p className="text-sm font-bold text-foreground mt-1">
                {formatDate(currentTime)}
              </p>
            </div>
            <div className="rounded-2xl bg-background p-4 border border-border">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Waktu
              </span>
              <p className="text-sm font-bold text-foreground mt-1">
                {formatTime(currentTime)}
              </p>
            </div>
          </div>
        </div>

        {/* Info Text */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Mohon maaf atas ketidaknyamanan ini.
            <br />
            Silakan kembali beberapa saat lagi atau tekan tombol refresh di bawah ini.
          </p>
        </div>

        {/* Refresh Button */}
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          className="mt-4 h-12 w-full items-center gap-2 rounded-2xl bg-linear-to-r from-destructive to-orange-600 text-base font-bold text-white shadow-lg shadow-destructive/25 transition-all hover:opacity-90 active:scale-[0.98]"
        >
          <RefreshCcw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Memperbarui..." : "Refresh Halaman"}
        </Button>
      </div>

      {/* Footer */}
      <div className="w-full max-w-md px-5 pb-8 text-center">
        <p className="text-xs text-muted-foreground/60">
          © 2025 Rohis · Sistem Absensi Sholat
        </p>
      </div>
    </div>
  )
}
