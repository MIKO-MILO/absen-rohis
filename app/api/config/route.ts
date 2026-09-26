import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabaseServer"
import {
  requireAdminSession,
  requireAuthenticatedSession,
} from "@/lib/auth-server"
import type { Database } from "@/lib/supabase-types"
import type { Json } from "@/lib/supabase-types"
import type {
  SystemSettingsInsert,
  SystemSettingsUpdate,
} from "@/lib/app-types"
import { withRequestMetrics } from "@/lib/request-metrics"
import { checkRateLimitPreset, rateLimitErrorResponse } from "@/lib/rate-limit"
import { createAuditLog } from "@/lib/audit-log"
import { DEFAULT_CONFIG, type TestConfig } from "@/lib/client-config"

export const dynamic = "force-dynamic"

type SystemSettingsRow = Database["public"]["Tables"]["system_settings"]["Row"]

export const GET = withRequestMetrics(async function GET(req: NextRequest) {
  try {
    const rl = await checkRateLimitPreset({ req, scope: "auth" })
    if (!rl.allowed) return rateLimitErrorResponse(rl.resetAt)

    await requireAuthenticatedSession()
    const supabase = await createServiceClient()

    const { data, error } = await supabase
      .from("system_settings")
      .select("*")
      .single()

    if (error && error.code !== "PGRST116") {
      throw error
    }

    if (!data) {
      return NextResponse.json({ ...DEFAULT_CONFIG })
    }

    const merged: TestConfig = {
      ...DEFAULT_CONFIG,
      ...(data.config as Partial<TestConfig>),
    }

    return NextResponse.json(merged)
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    console.error(error)
    return NextResponse.json(
      { error: "Gagal mengambil config", ...DEFAULT_CONFIG },
      { status: 500 }
    )
  }
})

export const POST = withRequestMetrics(async function POST(req: NextRequest) {
  try {
    const rl = await checkRateLimitPreset({ req, scope: "sensitive" })
    if (!rl.allowed) return rateLimitErrorResponse(rl.resetAt)

    const actor = await requireAdminSession()
    const rawBody = (await req.json()) as Partial<TestConfig> &
      Record<string, unknown>

    const supabase = await createServiceClient()

    const body: Partial<TestConfig> = Object.keys(DEFAULT_CONFIG).reduce(
      (acc, k) => {
        const key = k as keyof TestConfig
        if (rawBody[key] !== undefined) {
          acc[key] = rawBody[key] as TestConfig[typeof key]
        }
        return acc
      },
      {} as Partial<TestConfig>
    )

    const { data: existing, error: fetchError } = await supabase
      .from("system_settings")
      .select("*")
      .single()

    if (fetchError && fetchError.code !== "PGRST116") {
      throw fetchError
    }

    const currentMerged: TestConfig = {
      ...DEFAULT_CONFIG,
      ...((existing?.config ?? {}) as Partial<TestConfig>),
    }

    const changedKeys = Object.keys(body).filter(
      (k) =>
        JSON.stringify(currentMerged[k as keyof TestConfig]) !==
        JSON.stringify(body[k as keyof TestConfig])
    )

    const finalConfig: TestConfig = { ...currentMerged, ...body }

    let upserted: SystemSettingsRow | null = null

    if (existing) {
      const updatePayload: SystemSettingsUpdate = {
        config: finalConfig as unknown as Json,
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from("system_settings")
        .update(updatePayload)
        .eq("id", existing.id)
        .select()
        .maybeSingle()

      if (error) {
        console.error("[CONFIG SAVE] Supabase UPDATE error:", error)
        throw new Error(
          `DB Update Error (${error.code}): ${error.message}${error.details ? " — " + error.details : ""}${error.hint ? " (" + error.hint + ")" : ""}`
        )
      }
      upserted = data
    } else {
      const insertPayload: SystemSettingsInsert = {
        config: finalConfig as unknown as Json,
        updated_at: new Date().toISOString(),
      }

      type DbInsert = Database["public"]["Tables"]["system_settings"]["Insert"]

      const { data, error } = await supabase
        .from("system_settings")
        .insert(insertPayload as DbInsert)
        .select()
        .maybeSingle()

      if (error) {
        console.error("[CONFIG SAVE] Supabase INSERT error:", error)
        throw new Error(
          `DB Insert Error (${error.code}): ${error.message}${error.details ? " — " + error.details : ""}${error.hint ? " (" + error.hint + ")" : ""}`
        )
      }
      upserted = data
    }

    await createAuditLog({
      actor,
      action: "update_config",
      targetType: "config",
      description: `${actor.nama} updated config: ${changedKeys.length > 0 ? changedKeys.join(", ") : "no changes detected"}`,
    })

    return NextResponse.json({ success: true, data: upserted, changedKeys })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    console.error("[CONFIG ROUTE ERROR]:", error)
    const detailMsg =
      error instanceof Error ? error.message : "Unknown DB/config error"
    return NextResponse.json(
      { error: "Failed to save config", details: detailMsg },
      { status: 500 }
    )
  }
})
