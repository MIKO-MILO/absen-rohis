import { createServiceClient } from "./supabaseServer"
import { type SessionData } from "./auth-client"
import type { AuditLogInsert } from "./app-types"

export type AuditAction =
  | "login"
  | "logout"
  | "create_admin"
  | "update_admin"
  | "delete_admin"
  | "create_panitia"
  | "update_panitia"
  | "delete_panitia"
  | "create_siswa"
  | "update_siswa"
  | "delete_siswa"
  | "create_kelas"
  | "delete_kelas"
  | "generate_qr"
  | "update_config"
  | "start_impersonation"
  | "stop_impersonation"
  | "scan_qr"
  | "approve_absensi"
  | "create_divisi"
  | "auto_mark_tidak_hadir"
  | "system_cleanup"

export type AuditTargetType =
  | "admin"
  | "panitia"
  | "siswa"
  | "config"
  | "absensi"
  | null

export interface CreateAuditLogParams {
  actor: SessionData
  action: AuditAction
  targetType?: AuditTargetType
  targetId?: number
  description?: string
}

let cachedFallbackAdminId: number | null = null

type SupabaseClient = Awaited<ReturnType<typeof createServiceClient>>

async function getFallbackAdminId(
  supabase: SupabaseClient
): Promise<number | null> {
  if (cachedFallbackAdminId !== null) return cachedFallbackAdminId
  try {
    const { data } = await supabase
      .from("admin")
      .select("id")
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle()
    if (data && typeof data.id === "number") {
      cachedFallbackAdminId = data.id
      return data.id
    }
  } catch {
    /* ignore */
  }
  return null
}

type SiswaSession = SessionData & { role: "siswa"; kelas?: string }
type PanitiaSession = SessionData & { role: "panitia"; divisi?: string }

export async function createAuditLog(
  params: CreateAuditLogParams
): Promise<void> {
  try {
    const { actor, action, targetType, targetId, description } = params
    // Pakai service role bypass RLS karena audit_logs biasanya tidak punya
    // policy INSERT untuk role anon/public, dan insert dilakukan oleh API
    // route handler yang sudah memverifikasi auth via requireAdminSession dll.
    const supabase = await createServiceClient()

    let roleExtra = ` (${actor.role})`
    if (actor.role === "siswa") {
      const s = actor as SiswaSession
      if (s.kelas) roleExtra = ` (siswa · ${s.kelas})`
    } else if (actor.role === "panitia") {
      const p = actor as PanitiaSession
      if (p.divisi) roleExtra = ` (panitia · ${p.divisi})`
    }

    const finalDescription =
      description ?? `${actor.nama}${roleExtra} ${action.replace(/_/g, " ")}`

    const isAdminActor = actor.role === "superadmin" || actor.role === "admin"
    let resolvedAdminId = actor.id

    if (!isAdminActor) {
      const fbId = await getFallbackAdminId(supabase)
      if (fbId !== null) resolvedAdminId = fbId
    }

    const payload: AuditLogInsert = {
      admin_id: resolvedAdminId,
      action,
      target_user_id: targetId ?? null,
      target_type: targetType ?? null,
      description: finalDescription,
      created_at: new Date().toISOString(),
    }
    const { error } = await supabase.from("audit_logs").insert(payload)

    if (error) {
      console.error(
        "[AUDIT-LOG] Failed to create audit log:",
        error,
        "| payload:",
        {
          admin_id: resolvedAdminId,
          actor_role: actor.role,
          actor_nama: actor.nama,
          actor_id_original: actor.id,
          action,
          description: finalDescription,
        }
      )
    }
  } catch (err) {
    console.error("[AUDIT-LOG] Error creating audit log:", err)
  }
}
