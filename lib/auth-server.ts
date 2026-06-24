import { cookies } from "next/headers"
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

// ─── Cookie helpers ──────────────────────────────────────────────────────────
export async function setSessionCookie(session: SessionData): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}

export async function setImpersonationCookie(
  data: ImpersonationCookieData
): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(IMPERSONATION_COOKIE_NAME, JSON.stringify(data), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 2, // 2 hours for impersonation
  })
}

export async function clearImpersonationCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(IMPERSONATION_COOKIE_NAME)
}

async function getImpersonationCookie(): Promise<ImpersonationCookieData | null> {
  const cookieStore = await cookies()
  const impersonationCookie = cookieStore.get(IMPERSONATION_COOKIE_NAME)?.value
  if (!impersonationCookie) return null
  try {
    return JSON.parse(impersonationCookie)
  } catch {
    return null
  }
}

// ─── Session helpers ─────────────────────────────────────────────────────────
export async function getOriginalSession(): Promise<SessionData | null> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value
  if (!sessionCookie) {
    return null
  }
  return parseSessionCookie(sessionCookie)
}

async function fetchTargetUserFromDB(
  targetUserId: number,
  targetRole: "siswa" | "panitia"
): Promise<SessionData | null> {
  const supabase = await createClient()

  if (targetRole === "siswa") {
    const { data: userData } = await supabase
      .from("users")
      .select("*")
      .eq("id", targetUserId)
      .maybeSingle()

    if (!userData) return null

    return {
      id: userData.id,
      nama: userData.nama,
      role: "siswa",
      kelas: userData.kelas,
    }
  } else {
    const { data: panitiaData } = await supabase
      .from("panitia")
      .select("*")
      .eq("id", targetUserId)
      .maybeSingle()

    if (!panitiaData) return null

    return {
      id: panitiaData.id,
      nama: panitiaData.nama,
      role: "panitia",
      divisi: panitiaData.divisi,
    }
  }
}

export async function getEffectiveSession(): Promise<SessionData | null> {
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
}

export async function getOriginalAdmin(): Promise<SessionData | null> {
  const originalSession = await getOriginalSession()
  if (!originalSession || !isAdmin(originalSession.role)) {
    return null
  }

  const impersonationCookie = await getImpersonationCookie()
  if (impersonationCookie) {
    return originalSession
  }

  return null
}

export async function getFullSessionData(): Promise<{
  user: SessionData
  originalUser?: SessionData
  impersonation?: ImpersonationCookieData
} | null> {
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
}

export async function getSession(): Promise<SessionData | null> {
  return getEffectiveSession()
}

// ─── Maintenance mode helpers ────────────────────────────────────────────────
export async function isMaintenanceModeActive(): Promise<boolean> {
  const config = await getGlobalConfig()
  return config.MAINTENANCE_MODE
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
  const isMaintenance = await isMaintenanceModeActive()
  if (!isMaintenance) return false

  if (session && isAdmin(session.role)) {
    return false
  }

  return true
}

// ─── Password helpers (TEMPORARY) ───────────────────────────────────────────
export function verifyPassword(
  inputPassword: string,
  storedPassword: string
): boolean {
  return inputPassword === storedPassword
}

export async function hashPassword(password: string): Promise<string> {
  return password
}
