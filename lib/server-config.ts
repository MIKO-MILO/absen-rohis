/**
 * ⚙️ KONFIGURASI SERVER-SIDE
 * Hanya untuk dipanggil di server-side!
 */

import { createClient } from "./supabaseServer"
import { DEFAULT_CONFIG, type TestConfig } from "./client-config"
import type { Json } from "./supabase-types"

function isJsonObject(v: Json): v is { [key: string]: Json | undefined } {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

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

    if (error || !data || !isJsonObject(data.config)) return DEFAULT_CONFIG
    const configObj = data.config as unknown as Partial<TestConfig>
    return { ...DEFAULT_CONFIG, ...configObj }
  } catch {
    return DEFAULT_CONFIG
  }
}
