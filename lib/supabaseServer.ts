import {
  createServerClient,
  type CookieOptions,
} from "@supabase/ssr"

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

      throw new Error(
        "Supabase environment variables are not configured"
      )
    }

    return createServerClient<Database>(
      url,
      anonKey,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },

          set(
            name: string,
            value: string,
            options: CookieOptions
          ) {
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

          remove(
            name: string,
            options: CookieOptions
          ) {
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
      }
    )
  } catch (error) {
    console.error(
      "[SUPABASE] createClient error:",
      error
    )

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
 */
export async function createServiceClient(): Promise<SupabaseServiceClient> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url) {
      console.error(
        "[SUPABASE] NEXT_PUBLIC_SUPABASE_URL belum diset."
      )

      throw new Error(
        "NEXT_PUBLIC_SUPABASE_URL is not configured"
      )
    }

    if (!serviceKey) {
      console.error(
        "[SUPABASE] SUPABASE_SERVICE_ROLE_KEY belum diset."
      )

      throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY is not configured"
      )
    }

    const supabaseAdmin =
      createSupabaseClient<Database>(
        url,
        serviceKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      )

    return supabaseAdmin
  } catch (error) {
    console.error(
      "[SUPABASE] createServiceClient error:",
      error
    )

    throw error
  }
}