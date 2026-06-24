/**
 * ⚙️ KONFIGURASI SERVER-SIDE
 * Hanya untuk dipanggil di server-side!
 */

import { createClient } from "./supabaseServer"
import { DEFAULT_CONFIG, type TestConfig } from "./client-config"

/**
 * Mendapatkan konfigurasi dari Database (Server-side safe)
 */
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
