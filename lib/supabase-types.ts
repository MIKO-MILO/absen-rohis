export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type GenericRelationship = {
  foreignKeyName: string
  columns: string[]
  isOneToOne?: boolean
  referencedRelation: string
  referencedColumns: string[]
}

export interface Admin {
  id: number
  username: string
  password: string
  nama: string
  role: "admin" | "superadmin"
  created_at?: string
}

export interface User {
  id: number
  nama: string
  kelas: string
  jenis_kelamin: "L" | "P"
  nis: string
  email?: string
  password?: string
}

// Partial User type for queries that select only certain fields
export interface UserSummary {
  nama: string
  nis: string
  kelas: string
  jenis_kelamin: "L" | "P"
}

export interface Panitia {
  id: number
  nama: string
  divisi?: string
  jenis_kelamin: "L" | "P"
  email?: string
  password?: string
}

export interface Absensi {
  id: number
  user_id: number
  tanggal: string
  waktu: string
  status: "hadir" | "tidak_hadir" | "haid"
  panitia_id?: number | null
  admin_id?: number | null
}

// Absensi with UserSummary (partial user data) - note: users is array because Supabase returns arrays for relationships
export interface AbsensiWithUserSummary {
  id: number
  user_id: number
  tanggal: string
  waktu: string
  status: "hadir" | "tidak_hadir" | "haid"
  panitia_id?: number | null
  admin_id?: number | null
  users: UserSummary[]
}

export interface QrToken {
  id: number
  token: string
  aktif: boolean
  panitia_id?: number | null
  expired_at?: string | null
  is_simulation?: boolean
}

export interface Classes {
  id?: number
  nama: string
}

export interface ImpersonationSession {
  id: number
  admin_id: number
  target_user_id: number
  target_role: "siswa" | "panitia"
  started_at: string
  ended_at?: string | null
  active: boolean
}

export interface AuditLog {
  id: number
  admin_id: number
  target_user_id?: number | null
  action: string
  created_at: string
}

export interface SystemSettings {
  id: number
  config: Json
  updated_at?: string
}

// Helper types for easier access
export type TableRow<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]

export type TableInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"]

export type TableUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "12"
  }
  public: {
    Tables: {
      admin: {
        Row: Admin
        Insert: {
          id?: never
          username: string
          password: string
          nama: string
          role: "admin" | "superadmin"
          created_at?: string
        }
        Update: {
          id?: never
          username?: string
          password?: string
          nama?: string
          role?: "admin" | "superadmin"
          created_at?: string
        }
        Relationships: GenericRelationship[]
      }
      users: {
        Row: User
        Insert: {
          id?: never
          nama: string
          kelas: string
          jenis_kelamin: "L" | "P"
          nis: string
          email?: string
          password?: string
        }
        Update: {
          id?: never
          nama?: string
          kelas?: string
          jenis_kelamin?: "L" | "P"
          nis?: string
          email?: string
          password?: string
        }
        Relationships: GenericRelationship[]
      }
      panitia: {
        Row: Panitia
        Insert: {
          id?: never
          nama: string
          divisi?: string
          jenis_kelamin: "L" | "P"
          email?: string
          password?: string
        }
        Update: {
          id?: never
          nama?: string
          divisi?: string
          jenis_kelamin?: "L" | "P"
          email?: string
          password?: string
        }
        Relationships: GenericRelationship[]
      }
      absensi: {
        Row: Absensi
        Insert: {
          id?: never
          user_id: number
          tanggal: string
          waktu: string
          status: "hadir" | "tidak_hadir" | "haid"
          panitia_id?: number | null
          admin_id?: number | null
        }
        Update: {
          id?: never
          user_id?: number
          tanggal?: string
          waktu?: string
          status?: "hadir" | "tidak_hadir" | "haid"
          panitia_id?: number | null
          admin_id?: number | null
        }
        Relationships: GenericRelationship[]
      }
      qr_token: {
        Row: QrToken
        Insert: {
          id?: never
          token: string
          aktif: boolean
          panitia_id?: number | null
          expired_at?: string | null
          is_simulation?: boolean
        }
        Update: {
          id?: never
          token?: string
          aktif?: boolean
          panitia_id?: number | null
          expired_at?: string | null
          is_simulation?: boolean
        }
        Relationships: GenericRelationship[]
      }
      classes: {
        Row: Classes
        Insert: {
          id?: never
          nama: string
        }
        Update: {
          id?: never
          nama?: string
        }
        Relationships: GenericRelationship[]
      }
      system_settings: {
        Row: SystemSettings
        Insert: {
          id?: never
          config: Json
          updated_at?: string
        }
        Update: {
          id?: never
          config?: Json
          updated_at?: string
        }
        Relationships: GenericRelationship[]
      }
      impersonation_sessions: {
        Row: ImpersonationSession
        Insert: {
          id?: never
          admin_id: number
          target_user_id: number
          target_role: "siswa" | "panitia"
          started_at?: string
          ended_at?: string | null
          active: boolean
        }
        Update: {
          id?: never
          admin_id?: number
          target_user_id?: number
          target_role?: "siswa" | "panitia"
          started_at?: string
          ended_at?: string | null
          active?: boolean
        }
        Relationships: GenericRelationship[]
      }
      audit_logs: {
        Row: AuditLog
        Insert: {
          id?: never
          admin_id: number
          target_user_id?: number | null
          action: string
          created_at?: string
        }
        Update: {
          id?: never
          admin_id?: number
          target_user_id?: number | null
          action?: string
          created_at?: string
        }
        Relationships: GenericRelationship[]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
  }
}
