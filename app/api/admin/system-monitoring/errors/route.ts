import { NextResponse, NextRequest } from "next/server"
import { createClient } from "@/lib/supabaseServer"
import { requireSuperadminSession } from "@/lib/auth-server"

type Range = "today" | "24h" | "7d" | "30d" | "custom"
type SortKey =
  | "total_requests"
  | "success_count"
  | "error_count"
  | "error_rate"
  | "avg_response_time"
  | "endpoint"
type SortDir = "asc" | "desc"

const METHODS_ALLOWED = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"]

function parseDateSafe(v: string | null): Date | null {
  if (!v) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

export async function GET(req: NextRequest) {
  try {
    await requireSuperadminSession()
    const supabase = await createClient()
    const { searchParams } = new URL(req.url)

    const range = (searchParams.get("range") as Range | null) ?? "today"
    const fromStr = searchParams.get("from")
    const toStr = searchParams.get("to")
    const method = searchParams.get("method")?.toUpperCase() || null
    const search = searchParams.get("search")?.trim() || null
    const sortKey = (searchParams.get("sort") as SortKey) ?? "error_count"
    const sortDir = (searchParams.get("dir") as SortDir) ?? "desc"
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "20", 10)))

    // ─── 1. Resolve date range ──────────────────────────────────────────────
    const now = new Date()
    let startDate: Date
    let endDate: Date
    switch (range) {
      case "24h":
        endDate = now
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case "7d":
        endDate = now
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case "30d":
        endDate = now
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case "custom": {
        const f = parseDateSafe(fromStr)
        const t = parseDateSafe(toStr)
        if (!f || !t) {
          return NextResponse.json(
            { error: "Parameter from/to tidak valid untuk custom range" },
            { status: 400 },
          )
        }
        startDate = new Date(f.getFullYear(), f.getMonth(), f.getDate(), 0, 0, 0)
        endDate = new Date(t.getFullYear(), t.getMonth(), t.getDate(), 23, 59, 59, 999)
        break
      }
      case "today":
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
        endDate = now
        break
    }
    const startDateStr = startDate.toISOString().slice(0, 10)
    const endDateStr = endDate.toISOString().slice(0, 10)
    const filterHourStart = startDate.getHours()
    const filterHourEnd = endDate.getHours()
    const isSameDay = startDateStr === endDateStr

    // ─── 2. Validate method filter ─────────────────────────────────────────
    if (method && !METHODS_ALLOWED.includes(method)) {
      return NextResponse.json({ error: "Method tidak valid" }, { status: 400 })
    }

    // ─── 3. Query get_error_metrics RPC ──────────────────────────────────────
    const { data: dbRows, error: dbErr } = await supabase.rpc(
      "get_error_metrics",
      {
        p_start_date: startDateStr,
        p_end_date: endDateStr,
        p_start_hour: filterHourStart,
        p_end_hour: filterHourEnd,
        p_is_same_day: isSameDay,
        p_method: method,
        p_search: search,
        p_sort_key: sortKey,
        p_sort_dir: sortDir,
        p_page: page,
        p_limit: limit,
      }
    )

    if (dbErr) throw dbErr

    // ─── 4. Build response payload from RPC result ──────────────────────────
    interface EnrichedRow {
      endpoint: string
      method: string
      totalRequests: number
      successCount: number
      errorCount: number
      errorRate: number
      averageResponseTime: number
    }

    type DBRow = { endpoint: string; method: string; total_requests?: number; success_count?: number; error_count?: number; error_rate?: number; avg_response_time?: number };
const list: EnrichedRow[] = (dbRows ?? []).map((r: DBRow) => ({
      endpoint: r.endpoint,
      method: r.method,
      totalRequests: Number(r.total_requests || 0),
      successCount: Number(r.success_count || 0),
      errorCount: Number(r.error_count || 0),
      errorRate: Number(r.error_rate || 0),
      averageResponseTime: Number(r.avg_response_time || 0),
    }))

    const total = dbRows && dbRows.length > 0 ? Number(dbRows[0].total_count || 0) : 0
    const totalPages = Math.max(1, Math.ceil(total / limit))
    const safePage = Math.min(page, totalPages)

    return NextResponse.json({
      data: list,
      pagination: {
        page: safePage,
        limit,
        total,
        totalPages,
      },
      filters: {
        range,
        method,
        search,
        sort: sortKey,
        dir: sortDir,
        from: startDate.toISOString(),
        to: endDate.toISOString(),
      },
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    console.error("[System Monitoring Errors] Error:", error)
    return NextResponse.json(
      {
        error: "Gagal mengambil error metrics",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
