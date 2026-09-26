import type { Database } from "@/lib/supabase-types"

export type AdminRow = Database["public"]["Tables"]["admin"]["Row"]
export type AdminInsert = Database["public"]["Tables"]["admin"]["Insert"]
export type AdminUpdate = Database["public"]["Tables"]["admin"]["Update"]

export type UserRow = Database["public"]["Tables"]["users"]["Row"]
export type UserInsert = Database["public"]["Tables"]["users"]["Insert"]
export type UserUpdate = Database["public"]["Tables"]["users"]["Update"]

export type PanitiaRow = Database["public"]["Tables"]["panitia"]["Row"]
export type PanitiaInsert = Database["public"]["Tables"]["panitia"]["Insert"]
export type PanitiaUpdate = Database["public"]["Tables"]["panitia"]["Update"]

export type AbsensiRow = Database["public"]["Tables"]["absensi"]["Row"]
export type AbsensiInsert = Database["public"]["Tables"]["absensi"]["Insert"]
export type AbsensiUpdate = Database["public"]["Tables"]["absensi"]["Update"]

export type AuditLogRow = Database["public"]["Tables"]["audit_logs"]["Row"]
export type AuditLogInsert =
  Database["public"]["Tables"]["audit_logs"]["Insert"]

export type ClassesRow = Database["public"]["Tables"]["classes"]["Row"]
export type ClassesInsert = Database["public"]["Tables"]["classes"]["Insert"]

export type QrTokenRow = Database["public"]["Tables"]["qr_token"]["Row"]
export type QrTokenInsert = Database["public"]["Tables"]["qr_token"]["Insert"]

export type ImpersonationSessionRow =
  Database["public"]["Tables"]["impersonation_sessions"]["Row"]
export type ImpersonationSessionInsert =
  Database["public"]["Tables"]["impersonation_sessions"]["Insert"]

export type RequestMetricsRow =
  Database["public"]["Tables"]["request_metrics"]["Row"]
export type RequestMetricsInsert =
  Database["public"]["Tables"]["request_metrics"]["Insert"]

export type SystemSettingsRow =
  Database["public"]["Tables"]["system_settings"]["Row"]
export type SystemSettingsInsert =
  Database["public"]["Tables"]["system_settings"]["Insert"]

export type RateLimitBucketsRow =
  Database["public"]["Tables"]["rate_limit_buckets"]["Row"]
export type RateLimitBucketsInsert =
  Database["public"]["Tables"]["rate_limit_buckets"]["Insert"]

export type AuditTargetType = "user" | "panitia" | "admin" | "system"
export type UserRole = "superadmin" | "admin" | "panitia" | "user"

export type AbsensiWithUserSummary = AbsensiRow & {
  users: Pick<UserRow, "id" | "nama" | "kelas" | "nis" | "jenis_kelamin"> | null
}

export type AbsensiWithPanitia = AbsensiRow & {
  panitia: Pick<PanitiaRow, "id" | "nama" | "divisi"> | null
}

export type AuditLogWithAdmin = AuditLogRow & {
  admin: Pick<AdminRow, "id" | "nama" | "role"> | null
}

export interface UserRecord {
  id: number
  nama: string
  kelas: string
  nis: string
  jenis_kelamin: string
}

export function normalizeUserRecord(raw: {
  id: number
  nama: string | null
  kelas: string | null
  nis: number | null
  jenis_kelamin: string | null
}): UserRecord {
  return {
    id: raw.id,
    nama: raw.nama ?? "",
    kelas: raw.kelas ?? "",
    nis: raw.nis !== null ? String(raw.nis) : "",
    jenis_kelamin: raw.jenis_kelamin ?? "L",
  }
}
