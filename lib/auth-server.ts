import { cookies } from "next/headers"
import { createHmac, timingSafeEqual, randomBytes } from "crypto"
import {
  UserRole,
  SessionData,
  isRoleAllowed,
  isAdmin,
  parseSessionCookie,
} from "./auth-client"
import { ADMIN_ROLES } from "./auth-client"
import { getGlobalConfig } from "./server-config"
import { createClient } from "./supabaseServer"

export const SESSION_COOKIE_NAME = "absen_rohis_session"
export const IMPERSONATION_COOKIE_NAME = "absen_rohis_impersonation"

export interface ImpersonationCookieData {
  adminId: number
  adminNama: string
  targetUserId: number
  targetRole: "siswa" | "panitia"
}

let _fallbackSecret: string | null = null
function getFallbackSecret(): string {
  if (!_fallbackSecret) {
    _fallbackSecret = randomBytes(32).toString("base64url")
    console.warn(
      "[AUTH] ⚠️  SESSION_SECRET is not configured! Using a runtime-generated fallback secret. " +
        "This will invalidate all sessions on server restart. Set SESSION_SECRET in .env.local."
    )
  }
  return _fallbackSecret
}

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret) {
    return getFallbackSecret()
  }
  return secret
}

function signSessionPayload(payload: string): string {
  try {
    return createHmac("sha256", getSessionSecret())
      .update(payload)
      .digest("base64url")
  } catch (err) {
    console.error("[AUTH] signSessionPayload error:", err)
    return ""
  }
}

function serializeSession(session: SessionData): string {
  try {
    const payload = Buffer.from(JSON.stringify(session)).toString("base64url")
    const signature = signSessionPayload(payload)
    if (!signature) return ""
    return `${payload}.${signature}`
  } catch (err) {
    console.error("[AUTH] serializeSession error:", err)
    return ""
  }
}

export function parseSignedSessionCookie(value: string): SessionData | null {
  if (!value || typeof value !== "string") return null
  try {
    const parts = value.split(".")
    if (parts.length !== 2) return null
    const [payload, signature] = parts
    if (!payload || !signature) return null

    const expectedSignature = signSessionPayload(payload)
    if (!expectedSignature) return null

    try {
      const provided = Buffer.from(signature)
      const expected = Buffer.from(expectedSignature)
      if (provided.length !== expected.length) return null
      if (!timingSafeEqual(provided, expected)) return null
    } catch {
      return null
    }

    try {
      return parseSessionCookie(
        Buffer.from(payload, "base64url").toString("utf8")
      )
    } catch {
      return null
    }
  } catch (err) {
    console.error("[AUTH] parseSignedSessionCookie error:", err)
    return null
  }
}

// ─── Cookie helpers ──────────────────────────────────────────────────────────
export async function setSessionCookie(session: SessionData): Promise<void> {
  try {
    const serialized = serializeSession(session)
    if (!serialized) return
    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE_NAME, serialized, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })
  } catch (err) {
    console.error("[AUTH] setSessionCookie error:", err)
  }
}

export async function clearSessionCookie(): Promise<void> {
  try {
    const cookieStore = await cookies()
    cookieStore.delete(SESSION_COOKIE_NAME)
  } catch (err) {
    console.error("[AUTH] clearSessionCookie error:", err)
  }
}

export async function setImpersonationCookie(
  data: ImpersonationCookieData
): Promise<void> {
  try {
    const cookieStore = await cookies()
    cookieStore.set(IMPERSONATION_COOKIE_NAME, JSON.stringify(data), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 2, // 2 hours for impersonation
    })
  } catch (err) {
    console.error("[AUTH] setImpersonationCookie error:", err)
  }
}

export async function clearImpersonationCookie(): Promise<void> {
  try {
    const cookieStore = await cookies()
    cookieStore.delete(IMPERSONATION_COOKIE_NAME)
  } catch (err) {
    console.error("[AUTH] clearImpersonationCookie error:", err)
  }
}

async function getImpersonationCookie(): Promise<ImpersonationCookieData | null> {
  try {
    const cookieStore = await cookies()
    const impersonationCookie = cookieStore.get(IMPERSONATION_COOKIE_NAME)?.value
    if (!impersonationCookie) return null
    try {
      return JSON.parse(impersonationCookie)
    } catch {
      await clearImpersonationCookie()
      return null
    }
  } catch (err) {
    console.error("[AUTH] getImpersonationCookie error:", err)
    return null
  }
}

// ─── Session helpers ─────────────────────────────────────────────────────────
export async function getOriginalSession(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value
    if (!sessionCookie) {
      return null
    }
    const parsed = parseSignedSessionCookie(sessionCookie)
    if (!parsed) {
      await clearSessionCookie()
    }
    return parsed
  } catch (err) {
    console.error("[AUTH] getOriginalSession error:", err)
    try {
      await clearSessionCookie()
    } catch {
      /* ignore */
    }
    return null
  }
}

async function fetchTargetUserFromDB(
  targetUserId: number,
  targetRole: "siswa" | "panitia"
): Promise<SessionData | null> {
  try {
    const supabase = await createClient()

    if (targetRole === "siswa") {
      const { data: userData, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", targetUserId)
        .maybeSingle()

      if (error || !userData) return null

      return {
        id: userData.id,
        nama: userData.nama,
        role: "siswa",
        kelas: userData.kelas,
      }
    } else {
      const { data: panitiaData, error } = await supabase
        .from("panitia")
        .select("*")
        .eq("id", targetUserId)
        .maybeSingle()

      if (error || !panitiaData) return null

      return {
        id: panitiaData.id,
        nama: panitiaData.nama,
        role: "panitia",
        divisi: panitiaData.divisi,
      }
    }
  } catch (err) {
    console.error("[AUTH] fetchTargetUserFromDB error:", err)
    return null
  }
}

export async function getEffectiveSession(): Promise<SessionData | null> {
  try {
    const originalSession = await getOriginalSession()
    if (!originalSession) return null

    const impersonationCookie = await getImpersonationCookie()
    if (impersonationCookie) {
      if (!isAdmin(originalSession.role)) {
        await clearImpersonationCookie()
        return originalSession
      }

      const targetUser = await fetchTargetUserFromDB(
        impersonationCookie.targetUserId,
        impersonationCookie.targetRole
      )

      return targetUser || originalSession
    }

    return originalSession
  } catch (err) {
    console.error("[AUTH] getEffectiveSession error:", err)
    return null
  }
}

export async function getOriginalAdmin(): Promise<SessionData | null> {
  try {
    const originalSession = await getOriginalSession()
    if (!originalSession || !isAdmin(originalSession.role)) {
      return null
    }

    const impersonationCookie = await getImpersonationCookie()
    if (impersonationCookie) {
      return originalSession
    }

    return null
  } catch (err) {
    console.error("[AUTH] getOriginalAdmin error:", err)
    return null
  }
}

export async function getFullSessionData(): Promise<{
  user: SessionData
  originalUser?: SessionData
  impersonation?: ImpersonationCookieData
} | null> {
  try {
    const originalSession = await getOriginalSession()
    if (!originalSession) return null

    const impersonationCookie = await getImpersonationCookie()

    if (impersonationCookie && isAdmin(originalSession.role)) {
      const targetUser = await fetchTargetUserFromDB(
        impersonationCookie.targetUserId,
        impersonationCookie.targetRole
      )

      return {
        user: targetUser || originalSession,
        originalUser: originalSession,
        impersonation: impersonationCookie,
      }
    }

    return {
      user: originalSession,
    }
  } catch (err) {
    console.error("[AUTH] getFullSessionData error:", err)
    return null
  }
}

export async function getSession(): Promise<SessionData | null> {
  return getEffectiveSession()
}

// ─── Maintenance mode helpers ────────────────────────────────────────────────
export async function isMaintenanceModeActive(): Promise<boolean> {
  try {
    const config = await getGlobalConfig()
    return config.MAINTENANCE_MODE
  } catch {
    return false
  }
}

// ─── Authorization helpers (throws) ──────────────────────────────────────────
export async function requireAuthenticatedSession(): Promise<SessionData> {
  const session = await getSession()
  if (!session) {
    throw new Error("Unauthorized")
  }
  return session
}

export async function requireRole(
  allowedRoles: readonly UserRole[]
): Promise<SessionData> {
  const session = await requireAuthenticatedSession()
  if (!isRoleAllowed(session.role, allowedRoles)) {
    throw new Error("Forbidden")
  }
  return session
}

export async function requireAdminSession(): Promise<SessionData> {
  return requireRole(ADMIN_ROLES)
}

export async function requireSuperadminSession(): Promise<SessionData> {
  return requireRole(["superadmin"])
}

export async function requireAdminOrPanitiaSession(): Promise<SessionData> {
  return requireRole(["admin", "superadmin", "panitia"])
}

export async function requireAdminOrUserSession(): Promise<SessionData> {
  return requireRole(["admin", "superadmin", "siswa"])
}

// Helper to check if user should be blocked by maintenance mode
export async function shouldRedirectToMaintenance(
  session?: SessionData | null
): Promise<boolean> {
  try {
    const isMaintenance = await isMaintenanceModeActive()
    if (!isMaintenance) return false

    if (session && isAdmin(session.role)) {
      return false
    }

    return true
  } catch {
    return false
  }
}

// ─── Password helpers (TEMPORARY) ───────────────────────────────────────────
export function verifyPassword(
  inputPassword: string,
  storedPassword: string
): boolean {
  try {
    return inputPassword === storedPassword
  } catch {
    return false
  }
}

export async function hashPassword(password: string): Promise<string> {
  return password
}
