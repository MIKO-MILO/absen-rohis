import { createClient } from "@/lib/supabaseServer"
import { COST_SAFETY } from "./cost-safety"

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

interface EndpointMetrics {
  method: HttpMethod
  route: string
  endpoint_category: string
  status_code: number
  response_time_ms: number
  total_requests: number
  success_count: number
  error_count: number
  total_response_time_ms: number
}

function normalizeBucketKey(
  dateStr: string,
  hour: number,
  route: string,
  method: HttpMethod
): string {
  return `${dateStr}|${hour.toString().padStart(2, "0")}|${method}|${route}`
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

    // Sampling: hanya tulis metrik jika lolos sampling.
    // Ini mencegah banjir write ke Supabase saat lonjakan traffic tiba-tiba.
    const shouldSample =
      cfg.samplingHighTrafficRate >= 1 ||
      Math.random() < cfg.samplingHighTrafficRate
    if (!shouldSample) {
      return handler(...args)
    }

    const start = performance.now()
    const response = await handler(...args)
    const elapsed = performance.now() - start

    // Non-blocking fire-and-forget: Never wait for metrics to finish,
    // user response harus segera dikembalikan.
    void recordMetricsSafe({
      method: sanitizeMethod(req.method),
      route: categorizeEndpoint(req?.nextUrl?.pathname || req?.url || ""),
      path: sanitizePath(req?.nextUrl?.pathname || req?.url || ""),
      status: response?.status || 200,
      elapsed,
    }).catch((e) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _e = e;
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
    const response_time_ms = Math.max(0, Math.round(elapsed))

    const bucketKey = normalizeBucketKey(dateStr, hour, route, method)
    const supabase = await createClient()

    // Upsert dengan arithmetic untuk bucket yang sama
    const payload: EndpointMetrics = {
      method,
      route,
      endpoint_category: route,
      status_code: status,
      response_time_ms,
      total_requests,
      success_count,
      error_count,
      total_response_time_ms: response_time_ms,
    }

    const { error } = await supabase
      .from("request_metrics")
      .upsert(
        {
          bucket_date: dateStr,
          bucket_hour: hour,
          bucket_key: bucketKey,
          ...payload,
        },
        {
          onConflict: "bucket_key",
          ignoreDuplicates: false,
        }
      )
      .select()

    if (error) {
      // Jika upsert gagal (concurrent conflict / lock), fall back to INSERT
      // single row sebagai counter per request (lebih murah compute & hindari retry).
      await supabase
        .from("request_metrics")
        .insert({
          bucket_date: dateStr,
          bucket_hour: hour,
          bucket_key: `${bucketKey}|${now.getTime().toString(36)}|${Math.random()
            .toString(36)
            .slice(2, 6)}`,
          ...payload,
        })
        .select()
    }
  } catch {
    /* swallow */
  }
}
