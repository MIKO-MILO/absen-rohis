import { createServerClient, type CookieOptions } from "@supabase/ssr"

import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from "@supabase/supabase-js"

import { cookies } from "next/headers"
import type { Database } from "./supabase-types"

function decodeJwtPayload(jwt: string): Record<string, unknown> | null {
  try {
    const parts = jwt.split(".")
    if (parts.length < 2) return null
    const base64Url = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .replace(/\s/g, "")
    const pad = base64Url.length % 4
    const padded = pad ? base64Url + "=".repeat(4 - pad) : base64Url
    const json = Buffer.from(padded, "base64").toString("utf-8")
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return null
  }
}

function isPlaceholderKey(key: string | undefined): boolean {
  if (!key) return true
  if (key.length < 20) return true
  if (/GANTI|SILAKAN|PLACEHOLDER|ANON_KEY_/i.test(key)) return true
  return false
}

function warnIfAnonKeyIsServiceRole(keyLabel: string, key: string): void {
  const payload = decodeJwtPayload(key)
  if (payload && payload.role === "service_role") {
    console.warn(
      `[SUPABASE] ⚠️ ${keyLabel} berisi JWT dengan claim "role":"service_role". ` +
        `Ini adalah SUPABASE_SERVICE_ROLE_KEY yang seharusnya TIDAK dipublikasikan. ` +
        `Silakan salin "anon public" key dari dashboard Supabase (Project Settings → API) ` +
        `dan gunakan untuk ${keyLabel}. Apps jalan sementara sebagai fallback dev.`
    )
  }
}

function resolveEffectiveAnonKey(): {
  key: string
  source: "env" | "service_role_fallback" | "invalid"
  issues: string[]
} {
  const rawAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const rawService = process.env.SUPABASE_SERVICE_ROLE_KEY
  const issues: string[] = []

  if (rawAnon && !isPlaceholderKey(rawAnon)) {
    warnIfAnonKeyIsServiceRole("NEXT_PUBLIC_SUPABASE_ANON_KEY", rawAnon)
    return { key: rawAnon, source: "env", issues }
  }

  if (!rawAnon) {
    issues.push("NEXT_PUBLIC_SUPABASE_ANON_KEY belum diset.")
  } else {
    issues.push(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY masih placeholder / belum diisi dengan key asli."
    )
  }

  if (rawService && !isPlaceholderKey(rawService)) {
    issues.push(
      "Fallback ke SUPABASE_SERVICE_ROLE_KEY untuk operasi anon — ini TIDAK untuk production. Harap isi NEXT_PUBLIC_SUPABASE_ANON_KEY segera."
    )
    return { key: rawService, source: "service_role_fallback", issues }
  }

  issues.push(
    "SUPABASE_SERVICE_ROLE_KEY juga tidak tersedia — tidak ada fallback, koneksi tidak dapat dibuat."
  )
  return { key: "", source: "invalid", issues }
}

/**
 * ============================================
 * TYPES
 * ============================================
 */

export type SupabaseServerClient = SupabaseClient<Database>

export type SupabaseServiceClient = SupabaseClient<Database>

/**
 * ============================================
 * SERVER CLIENT
 * ============================================
 *
 * Menggunakan:
 * NEXT_PUBLIC_SUPABASE_ANON_KEY
 *
 * Client ini mengikuti session/cookie user
 * dan RLS Supabase.
 *
 * Graceful fallback:
 *   Jika NEXT_PUBLIC_SUPABASE_ANON_KEY tidak ada / masih placeholder,
 *   coba pakai SUPABASE_SERVICE_ROLE_KEY sebagai pengganti (dengan warning).
 *   Aplikasi TIDAK crash 500 di fase dev walaupun env belum lengkap.
 */
export async function createClient(): Promise<SupabaseServerClient> {
  const cookieStore = await cookies()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!url) {
    const msg =
      "[SUPABASE] NEXT_PUBLIC_SUPABASE_URL belum diset. Koneksi Supabase tidak dapat dibuat."
    console.error(msg)
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured")
  }

  const { key, source, issues } = resolveEffectiveAnonKey()
  if (!key) {
    for (const issue of issues) console.warn("[SUPABASE]", issue)
    console.error(
      "[SUPABASE] NEXT_PUBLIC_SUPABASE_ANON_KEY & fallback SUPABASE_SERVICE_ROLE_KEY sama-sama invalid / tidak tersedia."
    )
    throw new Error("Supabase environment variables are not configured")
  }

  if (issues.length > 0) {
    for (const issue of issues) console.warn("[SUPABASE]", issue)
    if (source === "service_role_fallback") {
      console.warn(
        "[SUPABASE] ⚠️ Mode DEVELOPMENT ONLY — createClient() fallback menggunakan SUPABASE_SERVICE_ROLE_KEY."
      )
    }
  }

  return createServerClient<Database>(url, key, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },

      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({
            name,
            value,
            ...options,
          })
        } catch {
          // Ignore ketika cookies tidak bisa diubah
        }
      },

      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({
            name,
            value: "",
            ...options,
          })
        } catch {
          // Ignore ketika cookies tidak bisa diubah
        }
      },
    },
  })
}

/**
 * ============================================
 * SERVICE ROLE CLIENT
 * ============================================
 *
 * Menggunakan:
 * SUPABASE_SERVICE_ROLE_KEY
 *
 * ⚠️ HANYA untuk SERVER-SIDE.
 *
 * Service role dapat melewati RLS.
 *
 * Jangan pernah menggunakan function ini
 * di Client Component / browser.
 *
 * Graceful fallback:
 *   Jika SUPABASE_SERVICE_ROLE_KEY tidak diset, coba pakai NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   sebagai pengganti (dengan warning). Fitur yang butuh bypass RLS kemungkinan
 *   akan diblokir policy, tapi aplikasi TIDAK crash 500 — cocok untuk fase dev
 *   ketika environment belum lengkap.
 */
export async function createServiceClient(): Promise<SupabaseServiceClient> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const rawService = process.env.SUPABASE_SERVICE_ROLE_KEY
    const rawAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url) {
      console.error("[SUPABASE] NEXT_PUBLIC_SUPABASE_URL belum diset.")
      throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured")
    }

    let finalKey: string | undefined = !isPlaceholderKey(rawService)
      ? rawService
      : undefined

    if (!finalKey) {
      const safeAnon = !isPlaceholderKey(rawAnon) ? rawAnon : undefined
      if (safeAnon) {
        console.warn(
          "[SUPABASE] ⚠️ SUPABASE_SERVICE_ROLE_KEY tidak tersedia (tidak diset / masih placeholder). " +
            "Fall back ke NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
            "Operasi yang butuh bypass RLS (insert/select audit_logs, update qr_token.aktif) " +
            "mungkin diblokir policy. Silakan set SUPABASE_SERVICE_ROLE_KEY asli di .env.local."
        )
        finalKey = safeAnon
      } else {
        console.error(
          "[SUPABASE] SUPABASE_SERVICE_ROLE_KEY dan NEXT_PUBLIC_SUPABASE_ANON_KEY sama-sama tidak tersedia / placeholder."
        )
        throw new Error(
          "No valid Supabase key available (both service_role and anon are missing or placeholder)"
        )
      }
    }

    const supabaseAdmin = createSupabaseClient<Database>(url, finalKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    return supabaseAdmin
  } catch (error) {
    console.error("[SUPABASE] createServiceClient error:", error)
    throw error
  }
}
