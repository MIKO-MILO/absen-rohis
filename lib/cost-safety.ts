// ─── Cost Safety & Resource Guard Configuration ──────────────────────────────────────
// Centralized configuration untuk pembatasan penggunaan resource (Vercel Cost Safety).
// Semua batas bisa dioverride via environment variable (tanpa ubah kode production).

export interface CostSafetyConfig {
  rateLimit: {
    publicPerMin: number
    authPerMin: number
    loginPerMin: number
    sensitivePerMin: number
    qrScanPerMin: number
    systemMonitoringPerMin: number
  }
  pagination: {
    defaultPageSize: number
    maxPageSize: number
  }
  upload: {
    maxUploadSizeMb: number
  }
  retry: {
    maxRetry: number
  }
  requestMetrics: {
    samplingHighTrafficRate: number
    enabled: boolean
  }
}

function envInt(name: string, fallback: number): number {
  const raw = process.env[name]
  if (raw === undefined || raw === "") return fallback
  const parsed = parseInt(raw, 10)
  if (Number.isNaN(parsed)) return fallback
  return Math.max(0, parsed)
}

export const COST_SAFETY: CostSafetyConfig = {
  rateLimit: {
    publicPerMin: envInt("RATE_LIMIT_PUBLIC", 60),
    authPerMin: envInt("RATE_LIMIT_AUTH", 120),
    loginPerMin: envInt("RATE_LIMIT_LOGIN", 5),
    sensitivePerMin: envInt("RATE_LIMIT_SENSITIVE", 10),
    qrScanPerMin: envInt("RATE_LIMIT_QR_SCAN", 30),
    systemMonitoringPerMin: envInt("RATE_LIMIT_SYSTEM_MONITORING", 30),
  },
  pagination: {
    defaultPageSize: envInt("DEFAULT_PAGE_SIZE", 20),
    maxPageSize: envInt("MAX_PAGE_SIZE", 100),
  },
  upload: {
    maxUploadSizeMb: envInt("MAX_UPLOAD_SIZE_MB", 5),
  },
  retry: {
    maxRetry: envInt("MAX_RETRY", 3),
  },
  requestMetrics: {
    samplingHighTrafficRate: 0.2,
    enabled: process.env.DISABLE_REQUEST_METRICS !== "1",
  },
}

export function clampPageSize(pageSize: unknown): number {
  const raw = typeof pageSize === "string" ? parseInt(pageSize, 10) : Number(pageSize)
  if (!Number.isFinite(raw) || raw <= 0) return COST_SAFETY.pagination.defaultPageSize
  return Math.min(raw, COST_SAFETY.pagination.maxPageSize)
}

export function clampPage(page: unknown): number {
  const raw = typeof page === "string" ? parseInt(page, 10) : Number(page)
  if (!Number.isFinite(raw) || raw <= 0) return 1
  return Math.max(1, Math.floor(raw))
}

export function safePagination(sp: URLSearchParams): { page: number; pageSize: number; offset: number } {
  const page = clampPage(sp.get("page"))
  const pageSize = clampPageSize(sp.get("limit") ?? sp.get("perPage") ?? sp.get("pageSize"))
  const offset = (page - 1) * pageSize
  return { page, pageSize, offset }
}
