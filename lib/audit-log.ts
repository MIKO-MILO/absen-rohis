import { createClient } from "./supabaseServer";
import { type SessionData } from "./auth-client";

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
  | "approve_absensi";

export type AuditTargetType =
  | "admin"
  | "panitia"
  | "siswa"
  | "config"
  | "absensi"
  | null;

export interface CreateAuditLogParams {
  actor: SessionData;
  action: AuditAction;
  targetType?: AuditTargetType;
  targetId?: number;
  description?: string;
}

export async function createAuditLog(params: CreateAuditLogParams): Promise<void> {
  const { actor, action, targetType, targetId, description } = params;
  const supabase = await createClient();

  try {
    const { error } = await supabase.from("audit_logs").insert({
      admin_id:       actor.id,
      action,
      target_user_id: targetId ?? null,
      target_type:    targetType ?? null,
      description:    description ?? null,
    });

    if (error) {
      console.error("Failed to create audit log:", error);
    }
  } catch (err) {
    console.error("Error creating audit log:", err);
  }
}

