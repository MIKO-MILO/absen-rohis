"use client"

import { AdminShell } from "../_components/AdminShell"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  MousePointerClick,
  ScanLine,
  Clock,
  UserX,
  FileSpreadsheet,
  ShieldCheck,
  RotateCcw,
  Save,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  DEFAULT_CONFIG,
  STORAGE_KEY,
  type TestConfig,
  getActiveConfig,
} from "@/lib/client-config"

// ─── Types ───────────────────────────────────────────────────────────────────
interface ConfigItem {
  key: keyof TestConfig
  label: string
  description: string
  warning?: string
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  default: boolean
}

// ─── Config metadata ──────────────────────────────────────────────────────────
const CONFIG_ITEMS: ConfigItem[] = [
  {
    key: "MAINTENANCE_MODE",
    label: "Maintenance Mode",
    description:
      "Jika aktif, panitia dan siswa akan diarahkan ke halaman maintenance. Hanya admin dan superadmin yang bisa mengakses sistem.",
    warning: "Aktif = semua pengguna kecuali admin akan diblokir",
    icon: <ShieldCheck className="h-4 w-4" />,
    iconBg: "bg-red-50 dark:bg-red-950/40",
    iconColor: "text-red-600 dark:text-red-400",
    default: false,
  },
  {
    key: "ENABLE_SIMULATION",
    label: "Mode Simulasi",
    description:
      "Tampilkan tombol simulasi di halaman scan. Berguna untuk testing tanpa harus scan QR sungguhan.",
    icon: <MousePointerClick className="h-4 w-4" />,
    iconBg: "bg-teal-50 dark:bg-teal-950/40",
    iconColor: "text-teal-600 dark:text-teal-400",
    default: true,
  },
  {
    key: "ENABLE_ONE_TIME_SCAN",
    label: "Aturan Satu Kali Scan",
    description:
      "Jika aktif, setiap QR dan pengguna hanya bisa melakukan absensi satu kali. Mencegah duplikasi absensi.",
    warning: "Nonaktif = QR & pengguna bisa scan berkali-kali",
    icon: <ScanLine className="h-4 w-4" />,
    iconBg: "bg-blue-50 dark:bg-blue-950/40",
    iconColor: "text-blue-600 dark:text-blue-400",
    default: false,
  },
  {
    key: "ENABLE_TIME_RESTRICTION",
    label: "Batasan Waktu Absensi",
    description:
      "Jika aktif, absensi hanya bisa dilakukan pada hari Jumat pukul 12:00 - 14:00 WIB.",
    warning: "Nonaktif = absen bisa dilakukan kapan saja",
    icon: <Clock className="h-4 w-4" />,
    iconBg: "bg-amber-50 dark:bg-amber-950/40",
    iconColor: "text-amber-600 dark:text-amber-400",
    default: false,
  },
  {
    key: "ENABLE_FORGOT_SIGN_IN",
    label: "Auto-tandai Tidak Hadir",
    description:
      "Pengguna yang belum absen setelah pukul 14:00 Jumat secara otomatis ditandai sebagai tidak hadir.",
    icon: <UserX className="h-4 w-4" />,
    iconBg: "bg-red-50 dark:bg-red-950/40",
    iconColor: "text-red-600 dark:text-red-400",
    default: false,
  },
  {
    key: "EXPORT_ALL_DATES",
    label: "Export Semua Tanggal",
    description:
      "Jika aktif, export menampilkan semua tanggal absensi. Jika nonaktif, hanya menampilkan hari Jumat.",
    icon: <FileSpreadsheet className="h-4 w-4" />,
    iconBg: "bg-green-50 dark:bg-green-950/40",
    iconColor: "text-green-600 dark:text-green-400",
    default: true,
  },
  {
    key: "ALLOW_ANY_DAY",
    label: "Absensi Setiap Hari",
    description:
      "Jika aktif, absensi bisa dilakukan di hari apa saja (tetap mengikuti batasan jam 12:00-14:00 jika batasan waktu aktif).",
    icon: <RotateCcw className="h-4 w-4" />,
    iconBg: "bg-purple-50 dark:bg-rose-950/40",
    iconColor: "text-purple-600 dark:text-purple-400",
    default: false,
  },
  {
    key: "ALLOW_ANY_TIME",
    label: "Absensi Setiap Jam",
    description:
      "Jika aktif, absensi bisa dilakukan kapan saja tanpa batasan jam 12:00-14:00.",
    icon: <Clock className="h-4 w-4" />,
    iconBg: "bg-indigo-50 dark:bg-indigo-950/40",
    iconColor: "text-indigo-600 dark:text-indigo-400",
    default: false,
  },
]

// ─── Toast component ──────────────────────────────────────────────────────────
function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div
      className={`fixed right-6 bottom-6 z-50 flex items-center gap-2.5 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground shadow-lg transition-all duration-300 ${
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <CheckCircle2 className="h-4 w-4 text-teal-500" />
      {message}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function SuperadminConfigPage() {
  const router = useRouter()
  const [config, setConfig] = useState<TestConfig>(getActiveConfig())
  const [toast, setToast] = useState({ visible: false, message: "" })
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)

  // Check session on mount
  useEffect(() => {
    const checkSession = () => {
      const adminSession = localStorage.getItem("admin_session")
      if (!adminSession) {
        router.push("/admin")
        return
      }
      setCheckingSession(false)
    }

    checkSession()
  }, [router])

  // Ambil config dari DB saat pertama kali load
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch("/api/config")
        if (res.ok) {
          const dbConfig = await res.json()
          setConfig(dbConfig)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(dbConfig))
        }
      } catch (err) {
        console.error("Gagal mengambil config dari DB:", err)
      }
    }
    fetchConfig()
  }, [])

  const showToast = (message: string) => {
    setToast({ visible: true, message })
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2500)
  }

  const handleToggle = (key: keyof TestConfig, value: boolean) => {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }

  const confirmSave = () => {
    setShowConfirmModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Simpan ke database via API
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || "Gagal menyimpan ke database")
      }

      // Tetap simpan ke localStorage sebagai backup/local cache
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config))

      setSaving(false)
      setShowConfirmModal(false)
      showToast("Konfigurasi berhasil disimpan ke sistem")
    } catch (err) {
      console.error(err)
      setSaving(false)
      showToast(
        err instanceof Error ? err.message : "Gagal menyimpan konfigurasi!"
      )
    }
  }

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG)
    showToast("Direset ke pengaturan default")
  }

  const activeCount = Object.values(config).filter(Boolean).length

  if (checkingSession) {
    return (
      <AdminShell requireSuperadmin>
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Memeriksa sesi...</p>
          </div>
        </div>
      </AdminShell>
    )
  }

  return (
    <AdminShell requireSuperadmin>
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-3 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-teal-500 to-cyan-600">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">
                Konfigurasi Sistem
              </h1>
              <p className="text-xs text-muted-foreground">Superadmin Panel</p>
            </div>
            <span className="ml-auto rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {activeCount} / {CONFIG_ITEMS.length} aktif
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Aktifkan atau nonaktifkan fitur aplikasi secara global. Perubahan
            berlaku segera setelah disimpan.
          </p>
        </div>

        {/* Config Cards */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {CONFIG_ITEMS.map((item, index) => {
            const isOn = config[item.key]
            const showWarning =
              item.warning &&
              (isOn || item.key === "MAINTENANCE_MODE" ? isOn : !isOn)

            return (
              <div key={item.key}>
                <div className="flex items-start gap-4 px-5 py-4 transition-colors hover:bg-muted/30">
                  {/* Icon */}
                  <div
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${item.iconBg} ${item.iconColor}`}
                  >
                    {item.icon}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      {item.label}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                    {showWarning && (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <AlertTriangle className="h-3 w-3 shrink-0 text-amber-500" />
                        <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                          {item.warning}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Toggle */}
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <Switch
                      checked={isOn}
                      onCheckedChange={(val) => handleToggle(item.key, val)}
                    />
                    <span
                      className={`text-[11px] font-semibold ${
                        isOn
                          ? "text-teal-600 dark:text-teal-400"
                          : "text-muted-foreground"
                      }`}
                    >
                      {isOn ? "Aktif" : "Nonaktif"}
                    </span>
                  </div>
                </div>

                {/* Divider */}
                {index < CONFIG_ITEMS.length - 1 && (
                  <div className="mx-5 border-t border-border/50" />
                )}
              </div>
            )
          })}
        </div>

        {/* Actions */}
        <div className="mt-8 flex items-center justify-between gap-4">
          <Button
            variant="outline"
            onClick={handleReset}
            className="h-11 flex-1 gap-2 rounded-2xl border-border font-bold text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-[0.98]"
          >
            <RotateCcw className="h-4 w-4" />
            Reset Default
          </Button>
          <Button
            onClick={confirmSave}
            className="h-11 flex-[1.5] gap-2 rounded-2xl bg-linear-to-r from-teal-600 to-teal-500 font-bold text-white shadow-lg shadow-teal-500/25 transition-all hover:opacity-90 active:scale-[0.98]"
          >
            <Save className="h-4 w-4" />
            Simpan Perubahan
          </Button>
        </div>

        {/* Confirmation Modal */}
        <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
          <DialogContent className="max-w-[340px] rounded-3xl p-6">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/20">
                <AlertTriangle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
              </div>
              <DialogHeader className="space-y-2">
                <DialogTitle className="text-xl font-bold">
                  Simpan Konfigurasi?
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Apakah Anda yakin ingin menyimpan perubahan konfigurasi sistem
                  ini? Perubahan akan langsung diterapkan.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-6 flex w-full gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowConfirmModal(false)}
                  className="h-11 flex-1 rounded-xl border-border font-semibold"
                >
                  Batal
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="h-11 flex-1 rounded-xl bg-teal-600 font-semibold text-white hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600"
                >
                  {saving ? "Menyimpan..." : "Ya, Simpan"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Toast */}
        <Toast message={toast.message} visible={toast.visible} />
      </div>
    </AdminShell>
  )
}
