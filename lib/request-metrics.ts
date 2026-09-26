import { createClient } from "@/lib/supabaseServer"
import { COST_SAFETY } from "./cost-safety"
import type { RequestMetricsInsert } from "./app-types"

type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "OPTIONS"
  | "HEAD"

const METHOD_ALLOWLIST: Array<HttpMethod> = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
  "HEAD",
]

function sanitizeMethod(method: string): HttpMethod {
  const upper = method.toUpperCase() as HttpMethod
  return METHOD_ALLOWLIST.includes(upper) ? upper : "GET"
}

function sanitizePath(path: string, maxLen = 255): string {
  if (!path) return "/"
  const clean = path.length > maxLen ? path.slice(0, maxLen - 3) + "..." : path
  return clean
}

function categorizeEndpoint(path: string): string {
  const parts = path.split("/").filter(Boolean)
  if (parts.length === 0) return "root"
  if (parts[0] !== "api") return "page"
  const [, top] = parts
  if (!top) return "api/unknown"
  return `api/${top}`
}

/**
 * Higher-order wrapper yang mencatat metrik request ke tabel request_metrics (hourly-bucketed).
 * ─── COST SAFETY NOTES ─────────────────────────────────────────────────────────
 * 1. Tidak melempar error jika write metrics gagal (fail-open, tidak ganggu user).
 * 2. Gunakan `DISABLE_REQUEST_METRICS=1` untuk mematikan seluruhnya.
 * 3. Selama traffic tinggi, hanya 20% request yang di-sample (sampling) untuk
 *    menghindari banjir INSERT/UPDATE ke DB.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withRequestMetrics<T extends (...args: any[]) => Promise<any>>(handler: T): T {
  return (async function wrappedHandler(...args: Parameters<T>): Promise<ReturnType<T>> {
    const req = args[0]
    const cfg = COST_SAFETY.requestMetrics
    if (!cfg.enabled) {
      return handler(...args)
    }

    const shouldSample =
      cfg.samplingHighTrafficRate >= 1 ||
      Math.random() < cfg.samplingHighTrafficRate
    if (!shouldSample) {
      return handler(...args)
    }

    const start = performance.now()
    const response = await handler(...args)
    const elapsed = performance.now() - start

    void recordMetricsSafe({
      method: sanitizeMethod(req.method),
      route: categorizeEndpoint(req?.nextUrl?.pathname || req?.url || ""),
      path: sanitizePath(req?.nextUrl?.pathname || req?.url || ""),
      status: response?.status || 200,
      elapsed,
    }).catch((e) => {
      void e
    })

    return response
  }) as unknown as T
}

async function recordMetricsSafe(input: {
  method: HttpMethod
  route: string
  path: string
  status: number
  elapsed: number
}): Promise<void> {
  try {
    const { method, route, status, elapsed } = input

    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10)
    const hour = now.getHours()

    const total_requests = 1
    const success_count = status < 400 ? 1 : 0
    const error_count = status >= 400 ? 1 : 0
    const total_response_time = Math.max(0, Math.round(elapsed))

    const endpoint = route

    const supabase = await createClient()

    // Composite unique: bucket_date, bucket_hour, endpoint, method
    const dbPayload: RequestMetricsInsert = {
      bucket_date: dateStr,
      bucket_hour: hour,
      endpoint,
      method,
      total_requests,
      success_count,
      error_count,
      total_response_time,
    }

    const { error } = await supabase
      .from("request_metrics")
      .upsert(dbPayload, {
        onConflict: "bucket_date,bucket_hour,endpoint,method",
        ignoreDuplicates: false,
      })
      .select()

    if (error) {
      // Fallback: INSERT baris unik dengan menambahkan timestamp agar unik
      const uniqueEndpoint = `${endpoint}:${now.getTime().toString(36)}:${Math.random()
        .toString(36)
        .slice(2, 6)}`
      const fallback: RequestMetricsInsert = {
        bucket_date: dateStr,
        bucket_hour: hour,
        endpoint: uniqueEndpoint,
        method,
        total_requests,
        success_count,
        error_count,
        total_response_time,
      }
      await supabase
        .from("request_metrics")
        .insert(fallback)
        .select()
    }
  } catch {
    /* swallow */
  }
}
