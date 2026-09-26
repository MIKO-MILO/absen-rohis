import { createServiceClient } from "@/lib/supabaseServer"
import { COST_SAFETY } from "./cost-safety"
import type { NextRequest } from "next/server"

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

/**
 * Endpoint disimpan sebagai PATH ASLI tanpa parameter ID dinamis.
 * Tidak lagi hanya memakai `api/<top>` (terlalu general, membuat Error Monitor
 * HAVING SUM(error_count)>0 hampir tidak pernah match karena semua error
 * tercampur ke satu bucket dengan request yang sukses 99%).
 */
function categorizeEndpoint(path: string): string {
  const clean = sanitizePath(path)
  const parts = clean.split("/").filter(Boolean)
  if (parts.length === 0) return "root"
  if (parts[0] !== "api") {
    // Halaman non-API: kelompokkan sederhana
    const top = parts[0]
    if (!top) return "page"
    if (parts.length === 1) return `page/${top}`
    return `page/${top}/:rest`
  }
  // API: ambil 2 level pertama (mis. api/absensi, api/qr/scan, api/admin/users)
  // lalu semua trailing segment numeric/uuid di-replace dengan :id agar
  // endpoint `api/users/3` & `api/users/7` masuk 1 bucket yang sama.
  const segments = parts.slice(1) // buang "api"
  const normalized = segments
    .slice(0, 4)
    .map((seg, i) => {
      if (i === 0) return seg
      if (/^\d+$/.test(seg)) return ":id"
      if (
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          seg
        )
      ) {
        return ":uuid"
      }
      return seg
    })
    .join("/")
  return `api/${normalized}`
}

/**
 * Higher-order wrapper yang mencatat metrik request ke tabel request_metrics (hourly-bucketed).
 * ─── COST SAFETY NOTES ─────────────────────────────────────────────────────────
 * 1. Tidak melempar error jika write metrics gagal (fail-open, tidak ganggu user).
 * 2. Gunakan `DISABLE_REQUEST_METRICS=1` untuk mematikan seluruhnya.
 * 3. Selama traffic tinggi, hanya 20% request yang di-sample (sampling) untuk
 *    menghindari banjir INSERT/UPDATE ke DB.
 * 4. Write pakai `createServiceClient` + RPC `upsert_request_metrics` (atomic
 *    increment) → lewati RLS, counter 100% akurat dan TIDAK ada fallback insert
 *    row aneh (endpoint:`timestamp:hash`) yang terjadi sebelumnya.
 */
export function withRequestMetrics<
  A extends [Request | NextRequest, ...unknown[]],
  R extends Response | Promise<Response>,
>(handler: (...args: A) => R): (...args: A) => R {
  return async function wrappedHandler(...args: A): Promise<Response> {
    const req = args[0] as Request | NextRequest
    const cfg = COST_SAFETY.requestMetrics
    if (!cfg.enabled) {
      return handler(...args) as Promise<Response>
    }

    const shouldSample =
      cfg.samplingHighTrafficRate >= 1 ||
      Math.random() < cfg.samplingHighTrafficRate
    if (!shouldSample) {
      return handler(...args) as Promise<Response>
    }

    const start = performance.now()
    const response = (await handler(...args)) as Response
    const elapsed = performance.now() - start

    const url =
      "nextUrl" in req && req.nextUrl
        ? req.nextUrl.pathname
        : "url" in req
          ? req.url
          : ""

    void recordMetricsSafe({
      method: sanitizeMethod(req.method),
      route: categorizeEndpoint(url),
      path: sanitizePath(url),
      status: response?.status || 200,
      elapsed,
    }).catch((e) => {
      void e
    })

    return response
  } as unknown as (...args: A) => R
}

async function recordMetricsSafe(input: {
  method: HttpMethod
  route: string
  path: string
  status: number
  elapsed: number
}): Promise<void> {
  const { method, route, status, elapsed } = input

  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10)
  const hour = now.getHours()

  const incTotal = 1
  const incSuccess = status < 400 ? 1 : 0
  const incError = status >= 400 ? 1 : 0
  const incRt = Math.max(0, Math.round(elapsed))

  try {
    const serviceSupabase = await createServiceClient()

    // ✨ PAKAI RPC ATOMIC DARI MIGRATION 006: increment counter di row yang sama
    // (bukan upsert by client yang rawan RLS / conflict handler salah).
    // Bypass RLS via service role → 100% counter akurat.
    const { error: rpcErr } = await serviceSupabase.rpc(
      "upsert_request_metrics",
      {
        p_bucket_date: dateStr,
        p_bucket_hour: hour,
        p_endpoint: route,
        p_method: method,
        p_inc_total: incTotal,
        p_inc_success: incSuccess,
        p_inc_error: incError,
        p_inc_rt: incRt,
      }
    )

    if (rpcErr) {
      // Fallback: insert single row jika RPC error (mis. migration belum apply).
      // Bypass RLS pakai service role agar counter tetap ke-simpan.
      const endpointFallback =
        route.length > 0 && route.length <= 255
          ? route
          : route.slice(0, 252) + "..."
      const { error: insertErr } = await serviceSupabase
        .from("request_metrics")
        .insert({
          bucket_date: dateStr,
          bucket_hour: hour,
          endpoint: endpointFallback,
          method,
          total_requests: incTotal,
          success_count: incSuccess,
          error_count: incError,
          total_response_time: incRt,
        })
      if (insertErr) {
        // eslint-disable-next-line no-console
        console.warn(
          "[request-metrics] insert fallback juga gagal:",
          insertErr.message
        )
      }
    }
  } catch {
    /* swallow */
  }
}
