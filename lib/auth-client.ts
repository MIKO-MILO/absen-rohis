// ─── Strict Type definitions ─────────────────────────────────────────────────
export const USER_ROLES = ["siswa", "panitia", "admin", "superadmin"] as const
export type UserRole = (typeof USER_ROLES)[number]

export const ADMIN_ROLES = ["admin", "superadmin"] as const
export type AdminRole = (typeof ADMIN_ROLES)[number]

export interface SessionData {
  id: number
  username?: string
  nama: string
  role: UserRole
  kelas?: string
  divisi?: string
}

// ─── Impersonation Types ─────────────────────────────────────────────────────
export interface ImpersonationData {
  adminId: number
  adminNama: string
  targetUserId: number
  targetRole: "siswa" | "panitia"
}

export interface FullSessionData {
  user: SessionData
  originalUser?: SessionData
  impersonation?: ImpersonationData
}

// ─── Type guards ─────────────────────────────────────────────────────────────
export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && USER_ROLES.includes(value as UserRole)
}

export function isValidSessionData(value: unknown): value is SessionData {
  if (typeof value !== "object" || value === null) return false
  const candidate = value as Record<string, unknown>
  if (typeof candidate.id !== "number") return false
  if (typeof candidate.nama !== "string") return false
  if (!isUserRole(candidate.role)) return false
  if (
    candidate.username !== undefined &&
    typeof candidate.username !== "string"
  )
    return false
  return true
}

export function isAdmin(role: UserRole): boolean {
  return ADMIN_ROLES.includes(role as AdminRole)
}

export function isRoleAllowed(
  role: UserRole,
  allowedRoles: readonly UserRole[]
): boolean {
  return allowedRoles.includes(role)
}

export function canAccessUserData(
  session: SessionData,
  requestedUserId: number | string
): boolean {
  // Admin & Superadmin can access everything
  if (isAdmin(session.role)) {
    return true
  }
  // Panitia can access everything
  if (session.role === "panitia") {
    return true
  }
  // Siswa can only access their own data
  const requestedId = Number(requestedUserId)
  return session.id === requestedId
}

// ─── Parse session cookie (string) ───────────────────────────────────────────
export function parseSessionCookie(cookie: string): SessionData | null {
  try {
    const parsed = JSON.parse(cookie)
    if (isValidSessionData(parsed)) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

// ─── Legacy localStorage helpers (for backward compatibility) ────────────────
export const IMPERSONATION_KEY = "impersonation_session"
export const ADMIN_SESSION_KEY = "admin_session"
export const PANITIA_SESSION_KEY = "panitia_session"
export const SISWA_SESSION_KEY = "siswa_session"

export function isValidImpersonationSession(
  value: unknown
): value is { role: "siswa" | "panitia" } {
  if (typeof value !== "object" || value === null) return false
  const candidate = value as Record<string, unknown>
  if (typeof candidate.role !== "string") return false
  return ["siswa", "panitia"].includes(candidate.role)
}

export function getEffectiveRole(): UserRole | null {
  const impersonationStr =
    typeof window !== "undefined"
      ? localStorage.getItem(IMPERSONATION_KEY)
      : null
  if (impersonationStr) {
    try {
      const impersonation = JSON.parse(impersonationStr)
      if (isValidImpersonationSession(impersonation)) {
        const adminSessionStr = localStorage.getItem(ADMIN_SESSION_KEY)
        if (adminSessionStr) {
          try {
            const adminSession = JSON.parse(adminSessionStr)
            if (
              isValidSessionData(adminSession) &&
              isAdmin(adminSession.role)
            ) {
              return impersonation.role
            }
          } catch {
            localStorage.removeItem(IMPERSONATION_KEY)
          }
        } else {
          localStorage.removeItem(IMPERSONATION_KEY)
        }
      }
    } catch {
      localStorage.removeItem(IMPERSONATION_KEY)
    }
  }

  if (typeof window !== "undefined") {
    const adminSessionStr = localStorage.getItem(ADMIN_SESSION_KEY)
    if (adminSessionStr) {
      try {
        const adminSession = JSON.parse(adminSessionStr)
        if (isValidSessionData(adminSession)) return adminSession.role
      } catch {}
    }
    const panitiaSessionStr = localStorage.getItem(PANITIA_SESSION_KEY)
    if (panitiaSessionStr) {
      try {
        const panitiaSession = JSON.parse(panitiaSessionStr)
        if (isValidSessionData(panitiaSession)) return panitiaSession.role
      } catch {}
    }
    const siswaSessionStr = localStorage.getItem(SISWA_SESSION_KEY)
    if (siswaSessionStr) {
      try {
        const siswaSession = JSON.parse(siswaSessionStr)
        if (isValidSessionData(siswaSession)) return siswaSession.role
      } catch {}
    }
  }
  return null
}

export function getEffectiveSession(): SessionData | null {
  if (typeof window === "undefined") return null
  const impersonation = getImpersonationSession()
  const adminSessionStr = localStorage.getItem(ADMIN_SESSION_KEY)

  if (impersonation && adminSessionStr) {
    try {
      const adminSession = JSON.parse(adminSessionStr)
      if (isValidSessionData(adminSession) && isAdmin(adminSession.role)) {
        return {
          ...adminSession,
          role: impersonation.role,
          kelas: impersonation.role === "siswa" ? "Kelas Dummy" : undefined,
          divisi: impersonation.role === "panitia" ? "Divisi Dummy" : undefined,
        }
      }
    } catch {}
  }

  const checkKeys = [ADMIN_SESSION_KEY, PANITIA_SESSION_KEY, SISWA_SESSION_KEY]
  for (const key of checkKeys) {
    const sessionStr = localStorage.getItem(key)
    if (sessionStr) {
      try {
        const session = JSON.parse(sessionStr)
        if (isValidSessionData(session)) return session
      } catch {}
    }
  }
  return null
}

export function getImpersonationSession(): {
  role: "siswa" | "panitia"
} | null {
  if (!isImpersonating()) return null
  const impersonationStr = localStorage.getItem(IMPERSONATION_KEY)
  if (!impersonationStr) return null
  try {
    const impersonation = JSON.parse(impersonationStr)
    if (isValidImpersonationSession(impersonation)) return impersonation
  } catch {}
  return null
}

export function isImpersonating(): boolean {
  if (typeof window === "undefined") return false
  const impersonationStr = localStorage.getItem(IMPERSONATION_KEY)
  if (!impersonationStr) return false
  try {
    const impersonation = JSON.parse(impersonationStr)
    if (!isValidImpersonationSession(impersonation)) return false
    const adminSessionStr = localStorage.getItem(ADMIN_SESSION_KEY)
    if (!adminSessionStr) {
      localStorage.removeItem(IMPERSONATION_KEY)
      return false
    }
    try {
      const adminSession = JSON.parse(adminSessionStr)
      return isValidSessionData(adminSession) && isAdmin(adminSession.role)
    } catch {
      localStorage.removeItem(IMPERSONATION_KEY)
      return false
    }
  } catch {
    localStorage.removeItem(IMPERSONATION_KEY)
    return false
  }
}

export function startImpersonationLegacy(role: "siswa" | "panitia"): boolean {
  if (typeof window === "undefined") return false
  const adminSessionStr = localStorage.getItem(ADMIN_SESSION_KEY)
  if (!adminSessionStr) return false
  try {
    const adminSession = JSON.parse(adminSessionStr)
    if (!isValidSessionData(adminSession) || !isAdmin(adminSession.role))
      return false
    const impersonation = { role }
    localStorage.setItem(IMPERSONATION_KEY, JSON.stringify(impersonation))
    return true
  } catch {
    return false
  }
}

export function stopImpersonationLegacy(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(IMPERSONATION_KEY)
}

// For backward compatibility:
export function startImpersonation(role: "siswa" | "panitia"): boolean {
  return startImpersonationLegacy(role)
}

export function stopImpersonation(): void {
  stopImpersonationLegacy()
}

// ─── New API-based helpers ───────────────────────────────────────────────────
let cachedSession: FullSessionData | null = null
let lastFetchTime = 0
const CACHE_TTL = 5000 // 5 seconds

export async function fetchSession(): Promise<FullSessionData | null> {
  const now = Date.now()
  if (cachedSession && now - lastFetchTime < CACHE_TTL) {
    return cachedSession
  }

  try {
    const res = await fetch("/api/auth/session")
    if (!res.ok) {
      cachedSession = null
      return null
    }
    const data = await res.json()
    cachedSession = data
    lastFetchTime = now
    return data
  } catch (err) {
    console.error("Failed to fetch session:", err)
    cachedSession = null
    return null
  }
}

export function clearSessionCache() {
  cachedSession = null
  lastFetchTime = 0
}

export async function isImpersonatingAsync(): Promise<boolean> {
  const session = await fetchSession()
  return !!session?.impersonation
}

export async function getImpersonationDataAsync(): Promise<ImpersonationData | null> {
  const session = await fetchSession()
  return session?.impersonation || null
}

export async function getEffectiveUserAsync(): Promise<SessionData | null> {
  const session = await fetchSession()
  return session?.user || null
}

export async function getOriginalUserAsync(): Promise<SessionData | null> {
  const session = await fetchSession()
  return session?.originalUser || session?.user || null
}

// ─── New API-based impersonation actions ─────────────────────────────────────
export async function startImpersonationAsync(
  targetUserId: number,
  targetRole: "siswa" | "panitia"
): Promise<{ success: boolean; redirect?: string; error?: string }> {
  try {
    const res = await fetch("/api/admin/impersonate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId, targetRole }),
    })
    const data = await res.json()
    if (data.success) {
      clearSessionCache()
      return { success: true, redirect: data.redirect }
    }
    return { success: false, error: data.error || "Unknown error" }
  } catch (err) {
    console.error("Failed to start impersonation:", err)
    return { success: false, error: "Failed to start impersonation" }
  }
}

export async function stopImpersonationAsync(): Promise<{
  success: boolean
  redirect?: string
  error?: string
}> {
  try {
    const res = await fetch("/api/admin/stop-impersonation", {
      method: "POST",
    })
    const data = await res.json()
    if (data.success) {
      clearSessionCache()
      // Clear legacy localStorage impersonation key
      if (typeof window !== "undefined") {
        localStorage.removeItem(IMPERSONATION_KEY)
      }
      return { success: true, redirect: data.redirect }
    }
    return { success: false, error: data.error || "Unknown error" }
  } catch (err) {
    console.error("Failed to stop impersonation:", err)
    return { success: false, error: "Failed to stop impersonation" }
  }
}
