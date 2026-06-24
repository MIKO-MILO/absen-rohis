import { createClient } from "./supabaseServer"

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

export async function getGlobalConfig(): Promise<TestConfig> {
  try {
    const supabaseServer = await createClient()
    const { data, error } = await supabaseServer
      .from("system_settings")
      .select("config")
      .eq("id", 1)
      .single()

    if (error || !data) return DEFAULT_CONFIG
    return { ...DEFAULT_CONFIG, ...data.config }
  } catch {
    return DEFAULT_CONFIG
  }
}
