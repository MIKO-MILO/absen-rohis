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
 * (Jumat 12:00 - 14:00 WIB)
 */
export function isWithinTimeRestriction(
  now?: Date,
  customConfig?: TestConfig
): boolean {
  const config = customConfig || getActiveConfig()
  if (!config.ENABLE_TIME_RESTRICTION) return true

  const checkTime = now || new Date()
  const day = checkTime.getDay()
  const hour = checkTime.getHours()

  // Jika ALLOW_ANY_TIME aktif, jam tidak dicek
  const isTimeOk = config.ALLOW_ANY_TIME || (hour >= 12 && hour < 14)

  // Jika ALLOW_ANY_DAY aktif, hari tidak dicek
  if (config.ALLOW_ANY_DAY) {
    return isTimeOk
  }

  // Jika ALLOW_ANY_DAY tidak aktif, cek hari Jumat DAN jam
  return day === 5 && isTimeOk
}

/**
 * 🕒 Fungsi untuk memeriksa apakah waktu absensi belum dimulai atau sudah berakhir
 * (Selain Jumat 12:00 - 14:00 WIB)
 */
export function isOutsideAbsensiTime(
  now?: Date,
  customConfig?: TestConfig
): boolean {
  const config = customConfig || getActiveConfig()

  // Jika batasan waktu dimatikan secara global, maka tidak ada waktu yang "di luar" (selalu boleh)
  if (!config.ENABLE_TIME_RESTRICTION) return false

  return !isWithinTimeRestriction(now, config)
}

/**
 * 🕒 Fungsi untuk memeriksa apakah waktu sudah melewati batas absensi
 * (Lebih dari 14:00)
 */
export function isPastAbsensiTime(
  now?: Date,
  customConfig?: TestConfig
): boolean {
  const config = customConfig || getActiveConfig()
  if (!config.ENABLE_TIME_RESTRICTION) return false

  const checkTime = now || new Date()
  const day = checkTime.getDay()
  const hour = checkTime.getHours()

  // Jika ALLOW_ANY_TIME aktif, tidak pernah dianggap "past"
  if (config.ALLOW_ANY_TIME) return false

  // Jika ALLOW_ANY_DAY aktif, hanya cek jam
  if (config.ALLOW_ANY_DAY) {
    return hour >= 14
  }

  return day === 5 && hour >= 14
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
