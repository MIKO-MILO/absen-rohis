"use client"

import { AdminShell } from "../_components/AdminShell"
import { useState, useEffect } from "react"
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
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"

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

interface TestConfig {
  ENABLE_SIMULATION: boolean
  ENABLE_ONE_TIME_SCAN: boolean
  ENABLE_TIME_RESTRICTION: boolean
  ENABLE_FORGOT_SIGN_IN: boolean
  EXPORT_ALL_DATES: boolean
}

// ─── Default config (mirrors test-config.ts) ─────────────────────────────────

const DEFAULT_CONFIG: TestConfig = {
  ENABLE_SIMULATION: true,
  ENABLE_ONE_TIME_SCAN: false,
  ENABLE_TIME_RESTRICTION: false,
  ENABLE_FORGOT_SIGN_IN: false,
  EXPORT_ALL_DATES: true,
}

const STORAGE_KEY = "test_config_superadmin"

// ─── Config metadata ──────────────────────────────────────────────────────────

const CONFIG_ITEMS: ConfigItem[] = [
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
      "Jika aktif, setiap QR dan pengguna hanya bisa melakukan absen satu kali. Mencegah duplikasi absensi.",
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
      "Jika aktif, absensi hanya bisa dilakukan pada hari Jumat pukul 12:00–14:00 WIB.",
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
  const [config, setConfig] = useState<TestConfig>(DEFAULT_CONFIG)
  const [mounted, setMounted] = useState(false)
  const [toast, setToast] = useState({ visible: false, message: "" })

  // Load from localStorage on mount
  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(stored) })
      } catch {
        // Fallback to default
      }
    }
  }, [])

  const showToast = (message: string) => {
    setToast({ visible: true, message })
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2500)
  }

  const handleToggle = (key: keyof TestConfig, value: boolean) => {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    showToast("Konfigurasi berhasil disimpan")
  }

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG)
    showToast("Direset ke pengaturan default")
  }

  if (!mounted) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  const activeCount = Object.values(config).filter(Boolean).length

  return (
    <AdminShell>
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
          const showWarning = item.warning && !isOn

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
      <div className="mt-5 flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          className="gap-2 rounded-xl"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset default
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          className="gap-2 rounded-xl bg-teal-600 hover:bg-teal-700 dark:bg-teal-600 dark:hover:bg-teal-700"
        >
          <Save className="h-3.5 w-3.5" />
          Simpan perubahan
        </Button>
      </div>

      {/* Toast */}
      <Toast message={toast.message} visible={toast.visible} />
    </div>
    </AdminShell>
  )
}
