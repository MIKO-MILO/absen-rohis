import { NextResponse } from "next/server"
import { createClient } from "./supabaseServer"
import { COST_SAFETY } from "./cost-safety"

interface RateLimitInput {
  key: string
  limit: number
  windowSeconds: number
  /**
   * Jika database rate limit offline/gagal:
   * - true (Fail-closed): Tolak request (misal untuk Login/Auth demi keamanan).
   * - false (Fail-open): Izinkan request (misal untuk endpoint non-kritis).
   */
  failClosed?: boolean
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
}

export async function checkRateLimit(input: RateLimitInput): Promise<RateLimitResult> {
  const failClosed = input.failClosed ?? false
  const defaultReset = new Date(Date.now() + input.windowSeconds * 1000)

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_key: input.key,
      p_limit: input.limit,
      p_window_seconds: input.windowSeconds,
    })

    if (error || !data || (data as Array<{ allowed: unknown }>).length === 0) {
      throw error || new Error("Gagal memproses rate limit di database")
    }

    const row = (data as Array<{ allowed: unknown; remaining?: unknown; reset_at?: unknown }>)[0]
    return {
      allowed: Boolean(row.allowed),
      remaining: Number(row.remaining ?? 0),
      resetAt: new Date((row.reset_at as string | number | Date) ?? defaultReset),
    }
  } catch (err) {
    console.error("[RATE LIMIT] Gagal melakukan checking:", err)

    if (failClosed) {
      return { allowed: false, remaining: 0, resetAt: defaultReset }
    }
    return { allowed: true, remaining: 1, resetAt: defaultReset }
  }
}

export function rateLimitErrorResponse(resetAt?: Date) {
  return NextResponse.json(
    {
      success: false,
      message: "Terlalu banyak request. Silakan coba lagi nanti.",
    },
    {
      status: 429,
      headers: {
        "Retry-After": Math.max(
          1,
          Math.ceil(((resetAt?.getTime() ?? Date.now() + 60_000) - Date.now()) / 1000)
        ).toString(),
      },
    }
  )
}

export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for")
  if (xff) return xff.split(",")[0]?.trim() || "unknown"
  const realIp = req.headers.get("x-real-ip")
  return realIp || "unknown"
}

export interface RateLimitPresetInput {
  req: Request
  scope:
    | "public"
    | "auth"
    | "login"
    | "sensitive"
    | "qr-scan"
    | "qr-generate"
    | "system-monitoring"
  /** Optional identifier tambahan (misal user_id) */
  suffix?: string
  /** Override default fail-closed behavior */
  failClosed?: boolean
}

export async function checkRateLimitPreset(input: RateLimitPresetInput) {
  const ip = getClientIp(input.req)
  const suffix = input.suffix ? `:${input.suffix}` : ""
  const key = `${input.scope}:${ip}${suffix}`

  const cfg = COST_SAFETY.rateLimit
  let limit: number
  let failClosed = input.failClosed ?? false
  switch (input.scope) {
    case "public":
      limit = cfg.publicPerMin
      break
    case "auth":
      limit = cfg.authPerMin
      break
    case "login":
      limit = cfg.loginPerMin
      failClosed = input.failClosed ?? true
      break
    case "sensitive":
      limit = cfg.sensitivePerMin
      failClosed = input.failClosed ?? true
      break
    case "qr-scan":
      limit = cfg.qrScanPerMin
      break
    case "qr-generate":
      limit = cfg.sensitivePerMin
      failClosed = input.failClosed ?? true
      break
    case "system-monitoring":
      limit = cfg.systemMonitoringPerMin
      break
  }

  return checkRateLimit({
    key,
    limit,
    windowSeconds: 60,
    failClosed,
  })
}
