"use client"

import { _setSyncedNowProvider } from "@/lib/client-config"
import { getSyncedNow } from "@/lib/server-time"

_setSyncedNowProvider(getSyncedNow)

export {
  syncWithServerTime,
  getSyncedNow,
  isOffsetAvailable,
  isOffsetFresh,
  shouldResync,
  getStoredSyncStats,
  formatSkew,
  TIME_WARN_THRESHOLD_MS,
} from "@/lib/server-time"

export type {
  ServerTimeResponse,
  TimeSyncResult,
} from "@/lib/server-time"
