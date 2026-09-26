import { createServerClient, type CookieOptions } from "@supabase/ssr"

import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from "@supabase/supabase-js"

import { cookies } from "next/headers"
import type { Database } from "./supabase-types"

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
 */
export async function createClient(): Promise<SupabaseServerClient> {
  try {
    const cookieStore = await cookies()

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !anonKey) {
      console.error(
        "[SUPABASE] NEXT_PUBLIC_SUPABASE_URL atau NEXT_PUBLIC_SUPABASE_ANON_KEY belum diset."
      )

      throw new Error("Supabase environment variables are not configured")
    }

    return createServerClient<Database>(url, anonKey, {
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
  } catch (error) {
    console.error("[SUPABASE] createClient error:", error)

    throw error
  }
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
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url) {
      console.error("[SUPABASE] NEXT_PUBLIC_SUPABASE_URL belum diset.")
      throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured")
    }

    let finalKey: string | undefined = serviceKey
    if (!finalKey) {
      if (anonKey) {
        console.warn(
          "[SUPABASE] ⚠️ SUPABASE_SERVICE_ROLE_KEY tidak diset. " +
            "Fall back ke NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
            "Operasi yang butuh bypass RLS (insert/select audit_logs, admin-only queries) " +
            "mungkin diblokir policy. Silakan set SUPABASE_SERVICE_ROLE_KEY asli di .env.local."
        )
        finalKey = anonKey
      } else {
        console.error(
          "[SUPABASE] SUPABASE_SERVICE_ROLE_KEY dan NEXT_PUBLIC_SUPABASE_ANON_KEY sama-sama belum diset."
        )
        throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured")
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
