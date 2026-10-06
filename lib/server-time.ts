"use client"

const OFFSET_KEY = "server_time_offset_ms"
const LAST_SYNC_KEY = "server_time_last_sync_ms"
const WARN_THRESHOLD_MS = 60_000
const RESYNC_MS = 5 * 60_000
const STALE_MS = 30 * 60_000

export interface ServerTimeResponse {
  serverEpochMs: number
  wibDay: number
  wibHour: number
  wibMinute: number
  wibSecond: number
  wibLabel: string
  serverIso: string
}

export interface TimeSyncResult {
  offsetMs: number
  absSkewMs: number
  deviceTimeMs: number
  serverTimeMs: number
  isSkewed: boolean
  isFresh: boolean
}

function readOffset(): number | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(OFFSET_KEY)
    if (raw == null) return null
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? parsed : null
  } catch {
    return null
  }
}

function writeOffset(ms: number) {
  try {
    localStorage.setItem(OFFSET_KEY, String(ms))
    localStorage.setItem(LAST_SYNC_KEY, String(Date.now()))
  } catch {
    /* ignore storage errors */
  }
}

function lastSyncAgeMs(): number | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(LAST_SYNC_KEY)
    if (raw == null) return null
    const last = Number(raw)
    if (!Number.isFinite(last)) return null
    return Date.now() - last
  } catch {
    return null
  }
}

/**
 * Mengembalikan Date yang "sudah dikoreksi" dengan offset server.
 *
 * Rumus koreksi:
 *   serverNow = deviceNow + offsetMs
 *   dimana offsetMs = serverTimeMs - deviceTimeMs (saat terakhir sync)
 *
 * Jika belum pernah sync, fallback ke Date asli device.
 */
export function getSyncedNow(): Date {
  const offset = readOffset()
  if (offset == null) return new Date()
  return new Date(Date.now() + offset)
}

export function isOffsetAvailable(): boolean {
  return readOffset() != null
}

/**
 * Apakah offset masih "segar" (belum > RESYNC_MS sejak sync terakhir).
 * Return false jika belum pernah sync atau usia offset > STALE_MS.
 */
export function isOffsetFresh(): boolean {
  if (typeof window === "undefined") return false
  const age = lastSyncAgeMs()
  if (age == null) return false
  return age < STALE_MS
}

export function shouldResync(): boolean {
  if (typeof window === "undefined") return false
  const age = lastSyncAgeMs()
  if (age == null) return true
  return age >= RESYNC_MS
}

export function getStoredSyncStats() {
  const offsetMs = readOffset() ?? 0
  const ageMs = lastSyncAgeMs() ?? 0
  return {
    offsetMs,
    absSkewMs: Math.abs(offsetMs),
    ageMs,
    isSkewed: Math.abs(offsetMs) > WARN_THRESHOLD_MS,
    isFresh: ageMs < STALE_MS,
  }
}

/**
 * Fetch waktu otoritatif dari `/api/time`, hitung offset device → server.
 * Return hasil sinkronisasi (termasuk flag isSkewed jika selisih > 60 detik).
 */
export async function syncWithServerTime(force = false): Promise<TimeSyncResult> {
  if (typeof window === "undefined") {
    return {
      offsetMs: 0,
      absSkewMs: 0,
      deviceTimeMs: Date.now(),
      serverTimeMs: Date.now(),
      isSkewed: false,
      isFresh: true,
    }
  }

  if (!force && !shouldResync() && isOffsetAvailable()) {
    const s = getStoredSyncStats()
    return {
      offsetMs: s.offsetMs,
      absSkewMs: s.absSkewMs,
      deviceTimeMs: Date.now(),
      serverTimeMs: Date.now() + s.offsetMs,
      isSkewed: s.isSkewed,
      isFresh: s.isFresh,
    }
  }

  const tReq = Date.now()
  const res = await fetch("/api/time", {
    method: "GET",
    headers: {
      "Cache-Control":
        "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Pragma: "no-cache",
    },
    cache: "no-store",
  })

  const tResp = Date.now()

  if (!res.ok) {
    const fallback = getStoredSyncStats()
    return {
      offsetMs: fallback.offsetMs,
      absSkewMs: fallback.absSkewMs,
      deviceTimeMs: Date.now(),
      serverTimeMs: Date.now() + fallback.offsetMs,
      isSkewed: fallback.isSkewed,
      isFresh: fallback.isFresh,
    }
  }

  const data = (await res.json()) as ServerTimeResponse
  const roundTrip = tResp - tReq
  const serverMidpoint = tReq + Math.round(roundTrip / 2)
  const offsetMs = data.serverEpochMs - serverMidpoint

  writeOffset(offsetMs)

  const absSkewMs = Math.abs(offsetMs)

  return {
    offsetMs,
    absSkewMs,
    deviceTimeMs: Date.now(),
    serverTimeMs: Date.now() + offsetMs,
    isSkewed: absSkewMs > WARN_THRESHOLD_MS,
    isFresh: true,
  }
}

/**
 * Format selisih waktu menjadi "X menit Y detik terlambat / lebih cepat"
 * untuk dijadikan teks warning banner.
 */
export function formatSkew(offsetMs: number): string {
  const absMs = Math.abs(offsetMs)
  const mins = Math.floor(absMs / 60_000)
  const secs = Math.round((absMs % 60_000) / 1000)
  const direction = offsetMs > 0 ? "terlambat" : "lebih cepat"
  if (mins <= 0) return `${secs} detik ${direction}`
  if (secs <= 0) return `${mins} menit ${direction}`
  return `${mins} menit ${secs} detik ${direction}`
}

export const TIME_WARN_THRESHOLD_MS = WARN_THRESHOLD_MS
