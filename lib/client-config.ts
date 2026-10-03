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
  /** Jam mulai absensi (0-23, default 12) */
  ABSENSI_START_HOUR: number
  /** Jam selesai absensi, eksklusif (0-23, default 14) */
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

/**
 * Mendapatkan konfigurasi aktif (Client-side aware)
 */
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

/**
 * 🕒 Fungsi untuk memeriksa apakah waktu saat ini dalam jendela absensi yang diizinkan
 */
export function isWithinTimeRestriction(
  now?: Date,
  customConfig?: TestConfig
): boolean {
  const config = customConfig || getActiveConfig()
  if (!config.ENABLE_TIME_RESTRICTION) return true

  const checkTime = now || new Date()
  const day  = checkTime.getDay()
  const hour = checkTime.getHours()

  const start = config.ABSENSI_START_HOUR ?? 12
  const end   = config.ABSENSI_END_HOUR   ?? 14

  // Jika ALLOW_ANY_TIME aktif, jam tidak dicek
  const isTimeOk = config.ALLOW_ANY_TIME || (hour >= start && hour < end)

  // Jika ALLOW_ANY_DAY aktif, hari tidak dicek — cukup cek jam saja
  if (config.ALLOW_ANY_DAY) return isTimeOk

  // Default: harus hari Jumat DAN dalam rentang jam
  return day === 5 && isTimeOk
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
 * 🕒 Fungsi untuk memeriksa apakah waktu sudah melewati batas absensi
 */
export function isPastAbsensiTime(
  now?: Date,
  customConfig?: TestConfig
): boolean {
  const config = customConfig || getActiveConfig()
  if (!config.ENABLE_TIME_RESTRICTION) return false

  const checkTime = now || new Date()
  const day  = checkTime.getDay()
  const hour = checkTime.getHours()
  const end  = config.ABSENSI_END_HOUR ?? 14

  if (config.ALLOW_ANY_TIME) return false
  if (config.ALLOW_ANY_DAY) return hour >= end
  return day === 5 && hour >= end
}

/**
 * 📋 Fungsi untuk menentukan apakah user dianggap tidak hadir
 * (Jika waktu sudah lewat dan user belum absen)
 */
export function shouldMarkAsTidakHadir(
  sudahAbsen: boolean,
  now?: Date
): boolean {
  const config = getActiveConfig()
  if (!config.ENABLE_FORGOT_SIGN_IN) return false

  return isPastAbsensiTime(now) && !sudahAbsen
}
