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

interface AuditLogRow {
  id: number
  admin_id: number
  action: string
  target_type: string | null
  target_user_id: number | null
  description: string | null
  created_at: string
}

interface AdminRow {
  id: number
  nama: string
  role: string
}

interface MetricRow {
  endpoint: string
  method: string
  bucket_date: string
  bucket_hour: number
  total_requests: number
  success_count: number
  error_count: number
  total_response_time: number
}

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

interface MetricBucket {
  source: "metrics"
  endpoint: string
  method: string
  bucketDate: string
  bucketHour: number
  bucketLabel: string
  totalRequests: number
  successCount: number
  errorCount: number
  errorRate: number
  avgResponseTime: number
}

interface Summary {
  auditEvents: number
  metricBuckets: number
  totalRequests: number
  totalErrors: number
  avgResponseTime: number
}

interface ApiResponse {
  summary: Summary
  auditActivities: AuditActivity[]
  metricBuckets: MetricBucket[]
  pagination: { page: number; limit: number; auditTotal: number }
  generatedAt: string
}

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
    const type = searchParams.get("type") || "all"
    const search = searchParams.get("search")?.trim() || null
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limitRaw = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "50", 10)))
    // since_id: when set, fetch only audit rows with id > since_id (incremental/live mode)
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
    const endDate = now
    const startIso = startDate.toISOString()
    const endIso = endDate.toISOString()
    const startDateStr = startDate.toISOString().slice(0, 10)
    const endDateStr = endDate.toISOString().slice(0, 10)
    const isSameDay = startDateStr === endDateStr
    const startHour = startDate.getHours()
    const endHour = endDate.getHours()
    const offset = (page - 1) * limitRaw

    let auditActivities: AuditActivity[] = []
    let auditTotal = 0

    if (type === "all" || type === "audit") {
      // ── Incremental mode: fetch rows newer than since_id, ascending (chronological) ──
      if (sinceId !== null && !isNaN(sinceId)) {
        let auditQuery = supabase
          .from("audit_logs")
          .select("id, admin_id, action, target_type, target_user_id, description, created_at")
          .gt("id", sinceId)
          .order("id", { ascending: true })
          .limit(50)

        if (search) {
          auditQuery = auditQuery.or(`action.ilike.%${search}%,description.ilike.%${search}%`)
        }

        const { data: auditRows, error: auditErr } = await withSlowQuerySampling("audit-logs", "select", () => auditQuery)
        if (auditErr) throw auditErr
        auditTotal = (auditRows ?? []).length

        const adminIds = [...new Set((auditRows ?? []).map((r: AuditLogRow) => r.admin_id).filter(Boolean))]
        let adminMap: Record<number, { nama: string; role: string }> = {}
        if (adminIds.length > 0) {
          const { data: admins } = await supabase.from("admin").select("id, nama, role").in("id", adminIds)
          adminMap = Object.fromEntries((admins ?? []).map((a: AdminRow) => [a.id, { nama: a.nama, role: a.role }]))
        }

        auditActivities = (auditRows ?? []).map((r: AuditLogRow) => {
          const admin = adminMap[r.admin_id] ?? { nama: "Unknown", role: "admin" }
          return {
            source: "audit" as const,
            id: r.id,
            timestamp: r.created_at,
            actorName: admin.nama,
            actorRole: admin.role,
            action: r.action,
            targetType: r.target_type ?? null,
            targetId: r.target_user_id ?? null,
            description: r.description ?? null,
          }
        })
      } else {
        // ── Full load mode (no since_id): original behaviour unchanged ──
        let auditQuery = supabase
          .from("audit_logs")
          .select("id, admin_id, action, target_type, target_user_id, description, created_at", { count: "exact" })
          .gte("created_at", startIso)
          .lte("created_at", endIso)
          .order("created_at", { ascending: false })
          .range(offset, offset + limitRaw - 1)

        if (search) {
          auditQuery = auditQuery.or(`action.ilike.%${search}%,description.ilike.%${search}%`)
        }

        const { data: auditRows, count: auditCount, error: auditErr } = await withSlowQuerySampling("audit-logs", "select", () => auditQuery)
        if (auditErr) throw auditErr
        auditTotal = auditCount ?? 0

        const adminIds = [...new Set((auditRows ?? []).map((r: AuditLogRow) => r.admin_id).filter(Boolean))]
        let adminMap: Record<number, { nama: string; role: string }> = {}
        if (adminIds.length > 0) {
          const { data: admins } = await supabase.from("admin").select("id, nama, role").in("id", adminIds)
          adminMap = Object.fromEntries((admins ?? []).map((a: AdminRow) => [a.id, { nama: a.nama, role: a.role }]))
        }

        auditActivities = (auditRows ?? []).map((r: AuditLogRow) => {
          const admin = adminMap[r.admin_id] ?? { nama: "Unknown", role: "admin" }
          return {
            source: "audit" as const,
            id: r.id,
            timestamp: r.created_at,
            actorName: admin.nama,
            actorRole: admin.role,
            action: r.action,
            targetType: r.target_type ?? null,
            targetId: r.target_user_id ?? null,
            description: r.description ?? null,
          }
        })
      }
    }

    let metricBuckets: MetricBucket[] = []

    if (type === "all" || type === "metrics" || type === "errors") {
      let metricsQuery = supabase
        .from("request_metrics")
        .select("endpoint, method, bucket_date, bucket_hour, total_requests, success_count, error_count, total_response_time")
        .gte("bucket_date", startDateStr)
        .lte("bucket_date", endDateStr)
        .order("bucket_date", { ascending: false })
        .order("bucket_hour", { ascending: false })
        .limit(200)

      if (isSameDay) {
        metricsQuery = metricsQuery.gte("bucket_hour", startHour).lte("bucket_hour", endHour)
      }
      if (type === "errors") {
        metricsQuery = metricsQuery.gt("error_count", 0)
      }
      if (search) {
        metricsQuery = metricsQuery.ilike("endpoint", `%${search}%`)
      }

      const { data: metricRows, error: metricErr } = await withSlowQuerySampling("request-metrics", "select", () => metricsQuery)
      if (metricErr) throw metricErr

      metricBuckets = (metricRows ?? []).map((r: MetricRow) => {
        const totalReqs = Number(r.total_requests ?? 0)
        const successCnt = Number(r.success_count ?? 0)
        const errorCnt = Number(r.error_count ?? 0)
        const totalRt = Number(r.total_response_time ?? 0)
        const avgRt = totalReqs > 0 ? Math.round(totalRt / totalReqs) : 0
        const errorRate = totalReqs > 0 ? parseFloat(((errorCnt / totalReqs) * 100).toFixed(2)) : 0
        return {
          source: "metrics" as const,
          endpoint: r.endpoint,
          method: r.method,
          bucketDate: r.bucket_date,
          bucketHour: Number(r.bucket_hour),
          bucketLabel: `${String(r.bucket_hour).padStart(2, "0")}:00 - ${String((r.bucket_hour + 1) % 24).padStart(2, "0")}:00`,
          totalRequests: totalReqs,
          successCount: successCnt,
          errorCount: errorCnt,
          errorRate,
          avgResponseTime: avgRt,
        }
      })
    }

    const totalRequests = metricBuckets.reduce((s, b) => s + b.totalRequests, 0)
    const totalErrors = metricBuckets.reduce((s, b) => s + b.errorCount, 0)
    const totalRt = metricBuckets.reduce((s, b) => s + b.avgResponseTime * b.totalRequests, 0)
    const avgResponseTime = totalRequests > 0 ? Math.round(totalRt / totalRequests) : 0

    const response: ApiResponse = {
      summary: { auditEvents: auditTotal, metricBuckets: metricBuckets.length, totalRequests, totalErrors, avgResponseTime },
      auditActivities: capResponseItems(auditActivities, "activity-monitor-audit"),
      metricBuckets: capResponseItems(metricBuckets, "activity-monitor-metrics"),
      pagination: { page, limit: limitRaw, auditTotal },
      generatedAt: new Date().toISOString(),
    }

    return NextResponse.json(response)
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (error instanceof Error && error.message === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    console.error("[Activity Monitor] Error:", error)
    return NextResponse.json({ error: "Gagal mengambil activity data", details: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
})
