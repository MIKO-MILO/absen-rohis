import { NextResponse, NextRequest } from "next/server"
import { createClient } from "@/lib/supabaseServer"
import { requireSuperadminSession } from "@/lib/auth-server"

export async function GET(req: NextRequest) {
  try {
    await requireSuperadminSession()
    const supabase = await createClient()
    const { searchParams } = new URL(req.url)

    const typeFilter = searchParams.get("type") || "all" // all, api, admin
    const severityFilter = searchParams.get("severity") || "all" // all, info, warning, error
    const search = searchParams.get("search")?.trim().toLowerCase() || ""
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "20", 10)))

    // ─── 1. Fetch Audit Logs if applicable ────────────────────────────────────
    let combinedLogs: Array<{
      id: string
      timestamp: string
      type: "API_METRIC" | "ADMIN_ACTION"
      source: string
      action: string
      details: string
      severity: "INFO" | "WARNING" | "ERROR"
      raw: Record<string, unknown>
    }> = []

    if (typeFilter === "all" || typeFilter === "admin") {
      // Fetch admins map for names
      const { data: admins } = await supabase.from("admin").select("id, nama, role")
      const adminMap = Object.fromEntries(
        (admins ?? []).map((a) => [a.id, { nama: a.nama, role: a.role }]),
      )

      const { data: auditData, error: auditErr } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100)

      if (!auditErr && auditData) {
        for (const log of auditData) {
          const admin = adminMap[log.admin_id]
          const actorName = admin?.nama ?? "System"
          const description = log.description || ""
          
          let severity: "INFO" | "WARNING" | "ERROR" = "INFO"
          if (log.action?.includes("delete")) severity = "WARNING"
          if (log.action?.includes("impersonate")) severity = "WARNING"

          combinedLogs.push({
            id: `audit_${log.id}`,
            timestamp: log.created_at,
            type: "ADMIN_ACTION",
            source: actorName,
            action: String(log.action || "action").toUpperCase(),
            details: description,
            severity,
            raw: { ...log, actor_role: admin?.role ?? "admin" },
          })
        }
      }
    }

    // ─── 2. Fetch Request Metrics if applicable ────────────────────────────────
    if (typeFilter === "all" || typeFilter === "api") {
      const { data: metricData, error: metricErr } = await supabase
        .from("request_metrics")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(100)

      if (!metricErr && metricData) {
        for (const m of metricData) {
          const total = Number(m.total_requests || 0)
          const errs = Number(m.error_count || 0)
          const rt = Number(m.total_response_time || 0)
          const avgRt = total > 0 ? Math.round(rt / total) : 0
          const errorRate = total > 0 ? (errs / total) * 100 : 0

          let severity: "INFO" | "WARNING" | "ERROR" = "INFO"
          if (errs > 0) severity = "ERROR"
          else if (avgRt > 500) severity = "WARNING"

          const details = `${fmtId(total)} requests, ${fmtId(errs)} errors, avg response time ${avgRt}ms`

          // Format timestamp from bucket date and hour
          const dateStr = m.bucket_date
          const hourStr = String(m.bucket_hour).padStart(2, "0")
          const fakeIso = `${dateStr}T${hourStr}:00:00.000Z`

          combinedLogs.push({
            id: `metric_${m.id}`,
            timestamp: m.updated_at || fakeIso,
            type: "API_METRIC",
            source: m.endpoint,
            action: String(m.method || "GET").toUpperCase(),
            details,
            severity,
            raw: { ...m, errorRate, avgResponseTime: avgRt },
          })
        }
      }
    }

    // ─── 3. Sort Chronologically ──────────────────────────────────────────────
    combinedLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // ─── 4. Filter post-load ──────────────────────────────────────────────────
    if (severityFilter !== "all") {
      combinedLogs = combinedLogs.filter((l) => l.severity.toLowerCase() === severityFilter)
    }

    if (search) {
      combinedLogs = combinedLogs.filter(
        (l) =>
          l.source.toLowerCase().includes(search) ||
          l.action.toLowerCase().includes(search) ||
          l.details.toLowerCase().includes(search),
      )
    }

    // ─── 5. Paginate ──────────────────────────────────────────────────────────
    const total = combinedLogs.length
    const totalPages = Math.max(1, Math.ceil(total / limit))
    const safePage = Math.min(page, totalPages)
    const offset = (safePage - 1) * limit
    const pageData = combinedLogs.slice(offset, offset + limit)

    return NextResponse.json({
      data: pageData,
      pagination: {
        page: safePage,
        limit,
        total,
        totalPages,
      },
      filters: {
        type: typeFilter,
        severity: severityFilter,
        search,
      },
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    console.error("[System Monitoring Logs] Error:", error)
    return NextResponse.json(
      {
        error: "Gagal mengambil system logs",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

function fmtId(v: number): string {
  return v.toLocaleString("id-ID")
}
