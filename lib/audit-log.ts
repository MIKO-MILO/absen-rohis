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

export async function createAuditLog(
  params: CreateAuditLogParams
): Promise<void> {
  try {
    const { actor, action, targetType, targetId, description } = params
    const supabase = await createClient()

    const finalDescription =
      description ??
      `${actor.nama} (${actor.role}) ${action.replace(/_/g, " ")}`

    const { error } = await supabase.from("audit_logs").insert({
      admin_id: actor.id,
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
          admin_id: actor.id,
          actor_role: actor.role,
          actor_nama: actor.nama,
          action,
          description: finalDescription,
        }
      )
    }
  } catch (err) {
    console.error("[AUDIT-LOG] Error creating audit log:", err)
  }
}
