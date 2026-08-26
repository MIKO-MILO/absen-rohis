import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/auth-server"
import { createClient } from "@/lib/supabaseServer"
import { withRequestMetrics } from "@/lib/request-metrics"
import { safePagination, COST_SAFETY } from "@/lib/cost-safety"
import { checkRateLimitPreset, rateLimitErrorResponse } from "@/lib/rate-limit"

const AUDIT_WITH_ADMIN_SELECT = `
  id, admin_id, action, description, status_code, ip_address, user_agent, created_at,
  admin:admin_id ( nama, role )
`

export const GET = withRequestMetrics(async function GET(req: NextRequest) {
  try {
    const rl = await checkRateLimitPreset({ req, scope: "system-monitoring" })
    if (!rl.allowed) return rateLimitErrorResponse(rl.resetAt)

    await requireAdminSession()

    const { searchParams } = new URL(req.url)
    const { page, pageSize, offset } = safePagination(searchParams)
    const search = searchParams.get("search") || ""
    const roleFilter = searchParams.get("role") || ""
    const actionFilter = searchParams.get("action") || ""
    const statusCodeFilter = searchParams.get("statusCode") || ""
    const dateFrom = searchParams.get("dateFrom") || ""
    const dateTo = searchParams.get("dateTo") || ""

    const supabase = await createClient()

    let query = supabase
      .from("audit_logs")
      .select(AUDIT_WITH_ADMIN_SELECT, { count: "exact" })
      .order("created_at", { ascending: false })

    if (dateFrom) query = query.gte("created_at", dateFrom)
    if (dateTo) query = query.lte("created_at", `${dateTo}T23:59:59`)
    if (actionFilter) query = query.ilike("action", actionFilter)
    if (statusCodeFilter) {
      const sc = Number(statusCodeFilter)
      if (Number.isFinite(sc)) query = query.eq("status_code", sc)
    }
    if (roleFilter) {
      query = query.eq("admin.role", roleFilter)
    }

    if (search) {
      const pattern = `%${search}%`
      query = query.or(
        `admin.nama.ilike.${pattern},action.ilike.${pattern},description.ilike.${pattern}`
      )
    }

    const { data, error, count } = await query.range(
      offset,
      offset + pageSize - 1
    )

    if (error) {
      console.error("Failed to fetch audit logs:", error)
      return NextResponse.json(
        { error: "Failed to fetch audit logs", detail: error.message },
        { status: 500 }
      )
    }

    const finalData = (data ?? []).map((row) => {
      const adminArr = (row as unknown as { admin?: Array<{ nama: string; role: string }> | null })
        .admin
      const adminObj = Array.isArray(adminArr) ? adminArr[0] : undefined
      return {
        ...row,
        actor_id: row.admin_id,
        actor_name: adminObj?.nama ?? "—",
        actor_role: adminObj?.role ?? "admin",
      }
    })

    return NextResponse.json({
      data: finalData,
      total: count ?? finalData.length,
      page,
      limit: pageSize,
      maxPageSize: COST_SAFETY.pagination.maxPageSize,
    })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    console.error("Audit logs API error:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
})
