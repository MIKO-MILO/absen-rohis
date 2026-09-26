import { NextResponse, NextRequest } from "next/server"
import { createClient } from "@/lib/supabaseServer"
import { requireSuperadminSession } from "@/lib/auth-server"
import { withRequestMetrics } from "@/lib/request-metrics"
import {
  costGuardObserveRequest,
  emergencyModeResponseIfActive,
  withSlowQuerySampling,
  capResponseItems,
  withRequestDeduplication,
} from "@/lib/cost-guard"
import type { AuditLogRow as AuditRowDB } from "@/lib/app-types"

type AuditLogRow = AuditRowDB

interface AuditActivity {
  source: "audit"
  id: number
  timestamp: string
  actorName: string
  actorRole: string
  action: string
  targetType: string | null
  targetId: number | null
  description: string | null
}

interface Summary {
  auditEvents: number
}

interface ApiResponse {
  summary: Summary
  auditActivities: AuditActivity[]
  pagination: { page: number; limit: number; auditTotal: number }
  generatedAt: string
}

export const dynamic = "force-dynamic"

export const GET = withRequestMetrics(async function GET(req: NextRequest) {
  costGuardObserveRequest(req)
  const emergencyResp = emergencyModeResponseIfActive(req)
  if (emergencyResp) return emergencyResp

  try {
    const session = await requireSuperadminSession()

    return withRequestDeduplication(req, session.id, async () => {
      const supabase = await createClient()
      const { searchParams } = new URL(req.url)
      const range = searchParams.get("range") || "1h"
      const search = searchParams.get("search")?.trim() || null
      const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
      const limitRaw = Math.max(
        1,
        Math.min(100, parseInt(searchParams.get("limit") || "50", 10))
      )
      const sinceIdRaw = searchParams.get("since_id")
      const sinceId = sinceIdRaw !== null ? parseInt(sinceIdRaw, 10) : null

      const now = new Date()
      let startDate: Date
      switch (range) {
        case "6h":
          startDate = new Date(now.getTime() - 6 * 60 * 60 * 1000)
          break
        case "24h":
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
          break
        default:
          startDate = new Date(now.getTime() - 60 * 60 * 1000)
          break
      }
      const startIso = startDate.toISOString()
      const endIso = now.toISOString()
      const offset = (page - 1) * limitRaw

      let auditActivities: AuditActivity[] = []
      let auditTotal = 0

      if (sinceId !== null && !isNaN(sinceId)) {
        let auditQuery = supabase
          .from("audit_logs")
          .select(
            "id, admin_id, action, target_type, target_user_id, target_panitia_id, description, created_at"
          )
          .gt("id", sinceId)
          .order("id", { ascending: true })
          .limit(50)

        if (search) {
          auditQuery = auditQuery.or(
            `action.ilike.%${search}%,description.ilike.%${search}%`
          )
        }

        const { data: auditRows, error: auditErr } =
          await withSlowQuerySampling("audit-logs", "select", () => auditQuery)
        if (auditErr) throw auditErr
        auditTotal = (auditRows ?? []).length

        const adminIds = [
          ...new Set(
            (auditRows ?? [])
              .map((r) => r.admin_id)
              .filter((id): id is number => id !== null)
          ),
        ]
        let adminMap: Record<number, { nama: string; role: string }> = {}
        if (adminIds.length > 0) {
          const { data: admins } = await supabase
            .from("admin")
            .select("id, nama, role")
            .in("id", adminIds)
          adminMap = Object.fromEntries(
            (admins ?? []).map((a) => [
              a.id,
              { nama: a.nama ?? "Unknown", role: a.role ?? "admin" },
            ])
          ) as Record<number, { nama: string; role: string }>
        }

        auditActivities = (auditRows ?? []).map((r) => {
          const row = r as AuditLogRow
          const admin = adminMap[row.admin_id] ?? {
            nama: "Unknown",
            role: "admin",
          }
          return {
            source: "audit" as const,
            id: row.id,
            timestamp: row.created_at ?? new Date().toISOString(),
            actorName: admin.nama,
            actorRole: admin.role,
            action: row.action,
            targetType: row.target_type ?? null,
            targetId: row.target_user_id ?? null,
            description: row.description ?? null,
          }
        })
      } else {
        let auditQuery = supabase
          .from("audit_logs")
          .select(
            "id, admin_id, action, target_type, target_user_id, target_panitia_id, description, created_at",
            { count: "exact" }
          )
          .gte("created_at", startIso)
          .lte("created_at", endIso)
          .order("created_at", { ascending: false })
          .range(offset, offset + limitRaw - 1)

        if (search) {
          auditQuery = auditQuery.or(
            `action.ilike.%${search}%,description.ilike.%${search}%`
          )
        }

        const {
          data: auditRows,
          count: auditCount,
          error: auditErr,
        } = await withSlowQuerySampling(
          "audit-logs",
          "select",
          () => auditQuery
        )
        if (auditErr) throw auditErr
        auditTotal = auditCount ?? 0

        const adminIds = [
          ...new Set(
            (auditRows ?? [])
              .map((r) => r.admin_id)
              .filter((id): id is number => id !== null)
          ),
        ]
        let adminMap: Record<number, { nama: string; role: string }> = {}
        if (adminIds.length > 0) {
          const { data: admins } = await supabase
            .from("admin")
            .select("id, nama, role")
            .in("id", adminIds)
          adminMap = Object.fromEntries(
            (admins ?? []).map((a) => [
              a.id,
              { nama: a.nama ?? "Unknown", role: a.role ?? "admin" },
            ])
          ) as Record<number, { nama: string; role: string }>
        }

        auditActivities = (auditRows ?? []).map((r) => {
          const row = r as AuditLogRow
          const admin = adminMap[row.admin_id] ?? {
            nama: "Unknown",
            role: "admin",
          }
          return {
            source: "audit" as const,
            id: row.id,
            timestamp: row.created_at ?? new Date().toISOString(),
            actorName: admin.nama,
            actorRole: admin.role,
            action: row.action,
            targetType: row.target_type ?? null,
            targetId: row.target_user_id ?? null,
            description: row.description ?? null,
          }
        })
      }

      const response: ApiResponse = {
        summary: { auditEvents: auditTotal },
        auditActivities: capResponseItems(
          auditActivities,
          "activity-monitor-audit"
        ),
        pagination: { page, limit: limitRaw, auditTotal },
        generatedAt: new Date().toISOString(),
      }

      return NextResponse.json(response)
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (error instanceof Error && error.message === "Forbidden")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    console.error("[Activity Monitor] Error:", error)
    return NextResponse.json(
      {
        error: "Gagal mengambil activity data",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
})
