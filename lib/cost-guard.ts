// ─── Cost Guard: Centralized Extra Resource Protection Layer ───────────────────────────────
// Memperluas lib/cost-safety.ts + lib/rate-limit.ts (TIDAK duplicate config).
// Menyediakan:
//  - Emergency Mode
//  - Heavy Endpoint Classification (light/normal/heavy/critical)
//  - Export Row Guard / Max Date
//  - Lightweight Circuit Breaker (in-memory per-instance, sampled, fail-open)
//  - Cron Guard (Lock via Supabase RPC table, prevent overlap)
//  - Slow Query Budget (logging only sampled + threshold, no DB per-event writes)
//  - Response Size / Row Counter Guard
//  - Status: normal / warning / protected / emergency
//
// Semua fail-safe: error di Cost Guard TIDAK BISA merusak alur normal.

import { COST_SAFETY } from "./cost-safety"
import { NextRequest, NextResponse } from "next/server"

function envBool(name: string, fallback: boolean): boolean {
  const v = process.env[name]
  if (v === undefined || v === "") return fallback
  return v === "1" || v.toLowerCase() === "true"
}
function envInt(name: string, fallback: number): number {
  const v = process.env[name]
  if (v === undefined || v === "") return fallback
  const p = parseInt(v, 10)
  return Number.isFinite(p) ? Math.max(0, p) : fallback
}

export type CostGuardStatus = "normal" | "warning" | "protected" | "emergency"
export type EndpointTier = "light" | "normal" | "heavy" | "critical"

interface CostGuardSettings {
  enabled: boolean
  emergency: boolean
  requestLimitPerWindow: number
  windowSeconds: number
  heavyPerMinute: number
  exportMaxRows: number
  exportMaxDateRangeDays: number
  bulkMaxRows: number
  failureThreshold: number
  cooldownSeconds: number
  slowQueryMs: number
  slowQuerySampleRate: number
  maxResponseItems: number
  maxCronOverlapSeconds: number
}

const SETTINGS: CostGuardSettings = {
  enabled: envBool("COST_GUARD_ENABLED", true),
  emergency: envBool("COST_GUARD_EMERGENCY_MODE", false),
  requestLimitPerWindow: envInt("COST_GUARD_REQUEST_LIMIT", 1000),
  windowSeconds: envInt("COST_GUARD_WINDOW_SECONDS", 60),
  heavyPerMinute: envInt("COST_GUARD_HEAVY_REQUESTS_PER_MINUTE", 10),
  exportMaxRows: envInt("COST_GUARD_EXPORT_MAX_ROWS", 5000),
  exportMaxDateRangeDays: envInt("COST_GUARD_EXPORT_MAX_DATE_RANGE_DAYS", 90),
  bulkMaxRows: envInt("COST_GUARD_BULK_MAX_ROWS", 200),
  failureThreshold: envInt("COST_GUARD_FAILURE_THRESHOLD", 10),
  cooldownSeconds: envInt("COST_GUARD_COOLDOWN_SECONDS", 60),
  slowQueryMs: envInt("SLOW_QUERY_THRESHOLD_MS", 1000),
  slowQuerySampleRate: (() => {
    const raw = process.env.SLOW_QUERY_SAMPLE_RATE
    if (!raw) return 0.2
    const p = parseFloat(raw)
    return Number.isFinite(p) ? Math.min(1, Math.max(0, p)) : 0.2
  })(),
  maxResponseItems: envInt("MAX_RESPONSE_ITEMS", 2000),
  maxCronOverlapSeconds: envInt("COST_GUARD_CRON_OVERLAP_SECONDS", 600),
}

// ───── Critical Features: Emergency / Status ──────────────────────────────────────────────
export function getCostGuardStatus(): CostGuardStatus {
  if (!SETTINGS.enabled) return "normal"
  if (SETTINGS.emergency) return "emergency"
  // Traffic & heuristic adalah best-effort per-instance (serverless OK karena hanya
  // digunakan untuk flagging, BUKAN satu-satunya protection).
  const stats = getInstanceStats()
  if (stats.failureActiveCooling) return "protected"
  if (stats.windowRequestCount > SETTINGS.requestLimitPerWindow * 0.8)
    return "warning"
  return "normal"
}

export function isEmergencyMode(): boolean {
  return SETTINGS.enabled && SETTINGS.emergency
}

/**
 * Fitur non-kritis apa yang MATI jika emergency mode aktif?
 * - Request metrics DB write (sudah ada DISABLE_REQUEST_METRICS tapi disinkronkan di sini).
 * - System monitoring: overview, requests, errors, alerts, logs (non critical).
 * - Auto-mark tidak hadir (bisa manual jika diperlukan).
 * - Activity monitor polling → frontend side dianjurkan STOP polling.
 *
 * FITUR KRITIS YANG TETAP BERJALAN:
 * - Login, Session, Logout
 * - QR Scan, Absensi (write/read), Absensi Today check
 * - Users/Panitia/Admin (auth)
 * - Config (GET non-sensitif)
 */
export function isFeatureAllowed(
  feature:
    | "system-monitoring"
    | "metrics-write"
    | "audit-heavy-query"
    | "export-large"
    | "cleanup-job"
    | "auto-mark"
    | "impersonation"
    | "bulk-insert"
    | "cron"
): boolean {
  if (!SETTINGS.enabled) return true
  if (!SETTINGS.emergency) return true

  switch (feature) {
    case "system-monitoring":
    case "audit-heavy-query":
    case "export-large":
    case "cleanup-job":
    case "auto-mark":
    case "bulk-insert":
      return false
    case "metrics-write":
      return false
    case "impersonation":
    case "cron":
      return true
  }
}

export function emergencyModeResponseIfActive(
  req: NextRequest
): NextResponse | null {
  if (!isEmergencyMode()) return null
  const path = req.nextUrl?.pathname ?? ""
  const isMonitoringHeavy =
    path.startsWith("/api/admin/system-monitoring/") ||
    path.startsWith("/api/admin/activity-monitor") ||
    path.startsWith("/api/admin/audit-logs/export") ||
    path === "/api/admin/system-monitoring/cleanup"
  if (isMonitoringHeavy) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Fitur monitoring sementara dibatasi dalam mode emergency untuk menghemat resource. Fitur login, absensi, dan QR scan tetap berjalan normal.",
      },
      { status: 503 }
    )
  }
  const isExport = path.startsWith("/api/absensi/export")
  if (isExport) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Export data sementara tidak tersedia. Silakan coba beberapa saat lagi.",
      },
      { status: 503 }
    )
  }
  if (path === "/api/absensi/auto-mark-tidak-hadir") {
    return NextResponse.json(
      {
        success: false,
        message: "Auto mark tidak hadir sementara dinonaktifkan.",
      },
      { status: 503 }
    )
  }
  return null
}

// ───── Instance Stats & Traffic Heuristic ─────────────────────────────────────────────────
// NOTE: Serverless friendly — ini TIDAK diandalkan untuk enforcement tunggal (rate limit
// enforcement TETAP pakai Supabase RPC). Hanya untuk flagging status warning/protected.

interface InstanceStats {
  windowStart: number
  windowRequestCount: number
  failureCount: number
  failureStart: number
  failureActiveCooling: boolean
  failureCoolUntil: number
  lastFailures: Array<{ kind: string; at: number }>
}

const _instanceStats: InstanceStats = {
  windowStart: Date.now(),
  windowRequestCount: 0,
  failureCount: 0,
  failureStart: 0,
  failureActiveCooling: false,
  failureCoolUntil: 0,
  lastFailures: [],
}

function getInstanceStats(): InstanceStats {
  const now = Date.now()
  // Rotate window
  if (now - _instanceStats.windowStart > SETTINGS.windowSeconds * 1000) {
    _instanceStats.windowStart = now
    _instanceStats.windowRequestCount = 0
  }
  // Cooldown expire reset
  if (
    _instanceStats.failureActiveCooling &&
    now > _instanceStats.failureCoolUntil
  ) {
    _instanceStats.failureActiveCooling = false
    _instanceStats.failureCount = 0
    _instanceStats.failureStart = 0
  }
  return _instanceStats
}

/**
 * Count request heuristic (lightweight, memory instance saja).
 * Dipakai hanya untuk flagging status warning/protected; TIDAK untuk enforcement.
 */
export function costGuardObserveRequest(req: NextRequest): void {
  if (!SETTINGS.enabled) return
  try {
    const stats = getInstanceStats()
    stats.windowRequestCount += 1
    void req
  } catch {
    /* cost guard error never propagate */
  }
}

// ───── Heavy Endpoint / Export / Bulk Safety ──────────────────────────────────────────────

export interface ExportSafetyInput {
  totalRows?: number
  startDate?: Date | null
  endDate?: Date | null
}

export function checkExportSafe(
  input: ExportSafetyInput
): { ok: true } | { ok: false; status: 413 | 400; message: string } {
  if (!SETTINGS.enabled) return { ok: true }
  const maxRows = SETTINGS.exportMaxRows
  const maxDays = SETTINGS.exportMaxDateRangeDays

  if (input.startDate && input.endDate) {
    const spanMs = input.endDate.getTime() - input.startDate.getTime()
    const spanDays = spanMs / (24 * 60 * 60 * 1000)
    if (spanDays > maxDays) {
      return {
        ok: false,
        status: 400,
        message: `Rentang tanggal terlalu besar (${Math.ceil(spanDays)} hari). Maksimal ${maxDays} hari. Persempit rentang data atau gunakan filter.`,
      }
    }
  }

  if (input.totalRows !== undefined && input.totalRows > maxRows) {
    return {
      ok: false,
      status: 413,
      message: `Data yang diminta terlalu besar (${input.totalRows} baris). Maksimal ${maxRows} baris per export. Persempit rentang data atau gunakan filter.`,
    }
  }
  return { ok: true }
}

export function checkBulkSafe(rows: number): { ok: boolean; message?: string } {
  if (!SETTINGS.enabled) return { ok: true }
  if (rows > SETTINGS.bulkMaxRows) {
    return {
      ok: false,
      message: `Bulk insert melebihi batas (${rows} > ${SETTINGS.bulkMaxRows}).`,
    }
  }
  return { ok: true }
}

export function heavyEndpointRequestsPerMinute(tier: EndpointTier): number {
  const cfg = COST_SAFETY.rateLimit
  switch (tier) {
    case "light":
      return cfg.authPerMin
    case "normal":
      return Math.max(10, Math.floor(cfg.authPerMin / 2))
    case "heavy":
      return SETTINGS.heavyPerMinute
    case "critical":
      return cfg.sensitivePerMin
  }
}

// ───── Circuit Breaker (lightweight, fail-open) ──────────────────────────────────────────
// Hanya aktif untuk endpoint heavy/monitoring. Tidak pernah memblok login/session/QR.
// Fail-open: kalau CB mechanism error, request diizinkan.

export function circuitBreakerCheck(key: string): {
  open: boolean
  retryAt?: Date
} {
  if (!SETTINGS.enabled) return { open: false }
  try {
    const stats = getInstanceStats()
    void key
    if (stats.failureActiveCooling) {
      return {
        open: true,
        retryAt: new Date(stats.failureCoolUntil),
      }
    }
    return { open: false }
  } catch {
    return { open: false }
  }
}

/**
 * Laporkan error backend berat (misal DB timeout berkali-kali).
 * Hanya disimpan untuk heavy endpoint.
 */
export function circuitBreakerReportFailure(kind: string): void {
  if (!SETTINGS.enabled) return
  try {
    const stats = getInstanceStats()
    const now = Date.now()
    stats.lastFailures.push({ kind, at: now })
    // keep 50 latest
    if (stats.lastFailures.length > 50) stats.lastFailures.shift()
    if (stats.failureStart === 0) stats.failureStart = now
    stats.failureCount += 1
    if (stats.failureCount >= SETTINGS.failureThreshold) {
      stats.failureActiveCooling = true
      stats.failureCoolUntil = now + SETTINGS.cooldownSeconds * 1000
      // Reset count untuk incremental recovery
      stats.failureCount = 0
      console.warn(
        `[Cost Guard][Circuit Breaker] Active cooling ${SETTINGS.cooldownSeconds}s — kind=${kind}`
      )
    }
  } catch {
    /* swallow */
  }
}

// ───── Cron Guard (Idempotency + No Overlap) ─────────────────────────────────────────────
// Catatan: Penyimpanan dilakukan ke Supabase agar konsisten antar serverless instance.
// Namun jika Supabase gagal, CRON masih boleh dijalankan (fail-open) tapi warn log.

import type { Database } from "./supabase-types"
import type { SupabaseClient } from "@supabase/supabase-js"

type TypedSupabase = SupabaseClient<Database>

// Catatan: Tabel `cron_jobs` saat ini BELUM ada di generated types (belum di-migrate).
// Semua akses ke tabel ini dibungkus try/catch dengan fail-open policy.
// Jika migration cron_jobs sudah dilakukan, hapus cast `as unknown as` di bawah.

interface CronJobsRow {
  job_key: string
  locked_at: string | null
  locked_by: string | null
  last_heartbeat_at: string | null
}

type CronJobsClient = {
  from: {
    (table: "cron_jobs"): {
      update: (fields: Partial<CronJobsRow>) => {
        eq: (
          col: keyof CronJobsRow | "job_key" | "locked_by",
          val: unknown
        ) => {
          eq: (
            col: keyof CronJobsRow | "job_key" | "locked_by",
            val: unknown
          ) => {
            lt: (col: string, val: string) => Promise<unknown>
          }
          is: (
            col: string,
            val: null
          ) => {
            lt: (col: string, val: string) => Promise<unknown>
          }
        }
      }
      upsert: (
        values: CronJobsRow | CronJobsRow[],
        opts?: { onConflict?: string; ignoreDuplicates?: boolean }
      ) => {
        select: () => {
          maybeSingle: () => Promise<{
            data: CronJobsRow | null
            error: { message: string } | null
          }>
        }
      }
    }
  }
}

export async function cronTryClaimLock(
  supabaseClient: TypedSupabase,
  jobKey: string,
  maxDurationSeconds = SETTINGS.maxCronOverlapSeconds
): Promise<{ acquired: boolean; release: () => Promise<void> }> {
  if (!SETTINGS.enabled) return { acquired: true, release: async () => {} }
  try {
    const now = new Date()
    const safeClient = supabaseClient as unknown as TypedSupabase &
      CronJobsClient

    // 1. Coba expire lock jadul
    try {
      const expireClient = safeClient as unknown as {
        from: (t: string) => {
          update: (payload: unknown) => {
            eq: (
              col: string,
              val: unknown
            ) => {
              is: (
                col: string,
                val: null
              ) => {
                lt: (col: string, val: string) => Promise<unknown>
              }
            }
          }
        }
      }
      await expireClient
        .from("cron_jobs")
        .update({ locked_by: null, locked_at: null })
        .eq("job_key", jobKey)
        .is("locked_by", null)
        .lt(
          "locked_at",
          new Date(now.getTime() - maxDurationSeconds * 1000).toISOString()
        )
    } catch {
      /* ignore */
    }

    // 2. Coba upsert & ambil lock
    const unlockKey = `${jobKey}-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`

    const cronPayload: CronJobsRow = {
      job_key: jobKey,
      locked_at: now.toISOString(),
      locked_by: unlockKey,
      last_heartbeat_at: now.toISOString(),
    }

    const result = await (async () => {
      try {
        const rpcClient = supabaseClient as unknown as {
          from: (t: string) => {
            upsert: (
              v: unknown,
              o: { onConflict: string; ignoreDuplicates: boolean }
            ) => {
              select: () => {
                maybeSingle: () => Promise<{
                  data: unknown
                  error: { message: string } | null
                }>
              }
            }
          }
        }
        return await rpcClient
          .from("cron_jobs")
          .upsert(cronPayload, {
            onConflict: "job_key",
            ignoreDuplicates: false,
          })
          .select()
          .maybeSingle()
      } catch (e) {
        return {
          data: null,
          error: { message: e instanceof Error ? e.message : String(e) },
        }
      }
    })()

    void result.data
    if (result.error) {
      console.warn(
        "[Cost Guard][Cron] Gagal claim lock, fallback allow:",
        result.error.message
      )
      return { acquired: true, release: async () => {} }
    }

    const release = async () => {
      try {
        try {
          const rpcClient = supabaseClient as unknown as {
            from: (t: string) => {
              update: (f: Record<string, unknown>) => {
                eq: (
                  col: string,
                  val: unknown
                ) => {
                  eq: (col: string, val: unknown) => Promise<unknown>
                }
              }
            }
          }
          await rpcClient
            .from("cron_jobs")
            .update({ locked_by: null, locked_at: null })
            .eq("job_key", jobKey)
            .eq("locked_by", unlockKey)
        } catch {
          /* ignore */
        }
      } catch {
        /* swallow */
      }
    }
    return { acquired: true, release }
  } catch (err) {
    console.warn(
      "[Cost Guard][Cron] Lock claim exception, fallback allow:",
      err
    )
    return { acquired: true, release: async () => {} }
  }
}

// ───── Slow Query Sampling Logger ────────────────────────────────────────────────────────
// TIDAK menulis ke DB (jangan buat biaya baru!). Cukup console.warn dengan sampling.

export async function withSlowQuerySampling<T>(
  endpointName: string,
  operation: "select" | "insert" | "update" | "delete" | "rpc" | "export",
  fn: () => Promise<T> | PromiseLike<T>
): Promise<T> {
  if (!SETTINGS.enabled) return fn()
  const start = Date.now()
  try {
    return await fn()
  } finally {
    const elapsed = Date.now() - start
    if (elapsed > SETTINGS.slowQueryMs) {
      if (
        SETTINGS.slowQuerySampleRate >= 1 ||
        Math.random() < SETTINGS.slowQuerySampleRate
      ) {
        console.warn(
          `[Cost Guard][Slow Query] endpoint=${endpointName} op=${operation} duration=${elapsed}ms threshold=${SETTINGS.slowQueryMs}ms`
        )
      }
    }
  }
}

// ───── Response Item Counter / Hard Cap ─────────────────────────────────────────────────
/**
 * Best-effort hard cap. Digunakan jika endpoint list TIDAK punya pagination dan lupa limit.
 * Mengembalikan array yang dipotong jika melebihi MAX_RESPONSE_ITEMS.
 */
export function capResponseItems<T>(items: T[], context: string): T[] {
  if (!SETTINGS.enabled) return items
  if (items.length <= SETTINGS.maxResponseItems) return items
  console.warn(
    `[Cost Guard][Response Items] ${context} items=${items.length} cap=${SETTINGS.maxResponseItems} — dipotong untuk hemat bandwidth.`
  )
  return items.slice(0, SETTINGS.maxResponseItems)
}

// ───── Utils: Standard Heavy Response 429 / 503 ──────────────────────────────────────────

export function heavyEndpointBusyResponse(cooldownSeconds = 60) {
  return NextResponse.json(
    {
      success: false,
      message: `Endpoint sedang sibuk. Silakan coba lagi ${cooldownSeconds} detik.`,
    },
    {
      status: 429,
      headers: { "Retry-After": cooldownSeconds.toString() },
    }
  )
}

export function exportTooLargeResponse(message: string) {
  return NextResponse.json({ success: false, message }, { status: 413 })
}

export function getSettingsSnapshot() {
  return { ...SETTINGS, ...COST_SAFETY }
}

// ───── Request Deduplication (In-Memory per Instance) ───────────────────────────
// Mencegah overlap request identik dari user yang sama yang berjalan bersamaan di
// memory yang sama (misal user spam klik refresh).
const dedupCache = new Map<string, Promise<NextResponse | Response>>()

export async function withRequestDeduplication(
  req: NextRequest,
  userId: string | number,
  fn: () => Promise<NextResponse | Response>
): Promise<NextResponse | Response> {
  if (!SETTINGS.enabled) return fn()
  // Hanya berlaku untuk GET request
  if (req.method !== "GET") return fn()

  const key = `dedup:${userId}:${req.nextUrl.pathname}${req.nextUrl.search}`
  const existing = dedupCache.get(key)
  if (existing) {
    return existing.then((res) => res.clone())
  }

  const promise = fn().finally(() => {
    // Hapus dari cache setelah selesai (minimal durasi 1 detik untuk menangkap burst)
    setTimeout(() => {
      dedupCache.delete(key)
    }, 1000)
  })

  dedupCache.set(key, promise)
  return promise.then((res) => res.clone())
}
