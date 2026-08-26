import { createClient } from "./supabaseServer"
import { type SessionData } from "./auth-client"

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
  | "generate_qr"
  | "update_config"
  | "start_impersonation"
  | "stop_impersonation"
  | "scan_qr"
  | "approve_absensi"

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

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

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
    if (data?.id) {
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
    const supabase = await createClient()

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

    const { error } = await supabase.from("audit_logs").insert({
      admin_id: resolvedAdminId,
      action,
      target_user_id: targetId ?? null,
      target_type: targetType ?? null,
      description: finalDescription,
      created_at: new Date().toISOString(),
    })

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
