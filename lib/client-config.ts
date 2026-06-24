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

export function isWithinTimeRestriction(
  now?: Date,
  customConfig?: TestConfig
): boolean {
  const config = customConfig || getActiveConfig()
  if (!config.ENABLE_TIME_RESTRICTION) return true

  const checkTime = now || new Date()
  const day = checkTime.getDay()
  const hour = checkTime.getHours()

  const isTimeOk = config.ALLOW_ANY_TIME || (hour >= 12 && hour < 14)

  if (config.ALLOW_ANY_DAY) {
    return isTimeOk
  }

  return day === 5 && isTimeOk
}

export function isOutsideAbsensiTime(
  now?: Date,
  customConfig?: TestConfig
): boolean {
  const config = customConfig || getActiveConfig()

  if (!config.ENABLE_TIME_RESTRICTION) return false

  return !isWithinTimeRestriction(now, config)
}

export function isPastAbsensiTime(
  now?: Date,
  customConfig?: TestConfig
): boolean {
  const config = customConfig || getActiveConfig()
  if (!config.ENABLE_TIME_RESTRICTION) return false

  const checkTime = now || new Date()
  const day = checkTime.getDay()
  const hour = checkTime.getHours()

  if (config.ALLOW_ANY_TIME) return false

  if (config.ALLOW_ANY_DAY) {
    return hour >= 14
  }

  return day === 5 && hour >= 14
}

export function shouldMarkAsTidakHadir(
  sudahAbsen: boolean,
  now?: Date
): boolean {
  const config = getActiveConfig()
  if (!config.ENABLE_FORGOT_SIGN_IN) return false

  return isPastAbsensiTime(now) && !sudahAbsen
}
