/**
 * ⚙️ KONFIGURASI TESTING TERPUSAT (CLIENT-SIDE)
 * Membaca dari localStorage jika di sisi client, atau menggunakan default.
 */

export const STORAGE_KEY = "test_config_superadmin"

export interface TestConfig {
  ENABLE_SIMULATION: boolean
  ENABLE_ONE_TIME_SCAN: boolean
  ENABLE_TIME_RESTRICTION: boolean
  ENABLE_FORGOT_SIGN_IN: boolean
  EXPORT_ALL_DATES: boolean
  ALLOW_ANY_DAY: boolean
  ALLOW_ANY_TIME: boolean
  MAINTENANCE_MODE: boolean
  ABSENSI_START_HOUR: number
  ABSENSI_END_HOUR: number
}

export const DEFAULT_CONFIG: TestConfig = {
  ENABLE_SIMULATION: false,
  ENABLE_ONE_TIME_SCAN: true,
  ENABLE_TIME_RESTRICTION: true,
  ENABLE_FORGOT_SIGN_IN: true,
  EXPORT_ALL_DATES: false,
  ALLOW_ANY_DAY: false,
  ALLOW_ANY_TIME: false,
  MAINTENANCE_MODE: false,
  ABSENSI_START_HOUR: 12,
  ABSENSI_END_HOUR: 14,
}

export function getActiveConfig(): TestConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG

  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return DEFAULT_CONFIG

  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(stored) }
  } catch {
    return DEFAULT_CONFIG
  }
}

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000

interface WIBDetails {
  day: number
  hour: number
  minute: number
  second: number
}

let cachedGetSyncedNow: (() => Date) | null = null

function registerSyncedNowProvider(fn: () => Date) {
  cachedGetSyncedNow = fn
}

export function _setSyncedNowProvider(fn: () => Date) {
  registerSyncedNowProvider(fn)
}

/**
 * 🕒 Helper terpusat: ekstrak hari & jam dalam WIB (UTC+7).
 * Konsisten antara browser (timezone user) dan server Vercel (UTC).
 *
 * ⚠️ Ketika client-side:
 * - Jika sudah pernah `syncWithServerTime()` sebelumnya, fungsi ini otomatis
 *   menggunakan waktu yang DIKOREKSI offset server (anti manipulasi jam device).
 * - Jika belum pernah sync, fallback ke waktu device (mode kompatibilitas).
 */
export function getWIBDetails(checkTime: Date): WIBDetails {
  const isServer = typeof window === "undefined"

  let effectiveTime = checkTime
  if (!isServer && cachedGetSyncedNow) {
    const diff = checkTime.getTime() - Date.now()
    effectiveTime = new Date(cachedGetSyncedNow().getTime() + diff)
  }

  if (isServer) {
    const wib = new Date(effectiveTime.getTime() + WIB_OFFSET_MS)
    return {
      day: wib.getUTCDay(),
      hour: wib.getUTCHours(),
      minute: wib.getUTCMinutes(),
      second: wib.getUTCSeconds(),
    }
  }
  return {
    day: effectiveTime.getDay(),
    hour: effectiveTime.getHours(),
    minute: effectiveTime.getMinutes(),
    second: effectiveTime.getSeconds(),
  }
}

function normalizeHours(config: TestConfig): { start: number; end: number } {
  const start = Number(config.ABSENSI_START_HOUR ?? 12)
  const end = Number(config.ABSENSI_END_HOUR ?? 14)
  return {
    start: Number.isFinite(start) ? start : 12,
    end: Number.isFinite(end) ? end : 14,
  }
}

/**
 * 🕒 Mengembalikan pesan error jika waktu diluar batasan, atau `null` jika valid.
 * Fungsi ini adalah sumber kebenaran TUNGGAL untuk validasi batas waktu absensi.
 */
export function getTimeRestrictionError(
  now?: Date,
  customConfig?: TestConfig
): string | null {
  const config = customConfig || getActiveConfig()
  if (!config.ENABLE_TIME_RESTRICTION) return null

  const { day, hour } = getWIBDetails(now || new Date())
  const { start, end } = normalizeHours(config)

  const isFriday = day === 5
  const isTimeOk = config.ALLOW_ANY_TIME || (hour >= start && hour < end)

  if (config.ALLOW_ANY_DAY && isTimeOk) return null
  if (!config.ALLOW_ANY_DAY && isFriday && isTimeOk) return null

  const startStr = String(start).padStart(2, "0")
  const endStr = String(end).padStart(2, "0")

  if (!config.ALLOW_ANY_DAY && !config.ALLOW_ANY_TIME) {
    return `Absensi hanya tersedia pada hari Jumat pukul ${startStr}:00 - ${endStr}:00 WIB`
  }
  if (!config.ALLOW_ANY_DAY) {
    return "Absensi hanya tersedia di hari Jumat"
  }
  return `Absensi hanya tersedia pukul ${startStr}:00 - ${endStr}:00 WIB`
}

/**
 * 🕒 Fungsi untuk memeriksa apakah waktu saat ini dalam jendela absensi yang diizinkan
 */
export function isWithinTimeRestriction(
  now?: Date,
  customConfig?: TestConfig
): boolean {
  return getTimeRestrictionError(now, customConfig) === null
}

/**
 * 🕒 Fungsi untuk memeriksa apakah waktu absensi belum dimulai atau sudah berakhir
 */
export function isOutsideAbsensiTime(
  now?: Date,
  customConfig?: TestConfig
): boolean {
  const config = customConfig || getActiveConfig()
  if (!config.ENABLE_TIME_RESTRICTION) return false
  return !isWithinTimeRestriction(now, config)
}

/**
 * 🕒 Fungsi untuk memeriksa apakah waktu sudah melewati batas absensi (lewat jam end)
 */
export function isPastAbsensiTime(
  now?: Date,
  customConfig?: TestConfig
): boolean {
  const config = customConfig || getActiveConfig()
  if (!config.ENABLE_TIME_RESTRICTION) return false
  if (config.ALLOW_ANY_TIME) return false

  const { day, hour } = getWIBDetails(now || new Date())
  const { end } = normalizeHours(config)

  if (config.ALLOW_ANY_DAY) return hour >= end
  return day === 5 && hour >= end
}

export function shouldMarkAsTidakHadir(
  sudahAbsen: boolean,
  now?: Date
): boolean {
  const config = getActiveConfig()
  if (!config.ENABLE_FORGOT_SIGN_IN) return false

  return isPastAbsensiTime(now) && !sudahAbsen
}
