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
    const sortKey = (searchParams.get("sort") as SortKey) ?? "total_requests"
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

    // ─── 3. Ambil semua rows di range (agregasi per endpoint di-memory) ─────
    // Skala project ini kecil, jadi fetch rows di range lalu aggregate per endpoint.
    // Phase berikutnya bisa pakai materialized view untuk skala besar.
    let query = supabase
      .from("request_metrics")
      .select("endpoint, method, bucket_date, bucket_hour, total_requests, success_count, error_count, total_response_time")
      .gte("bucket_date", startDateStr)
      .lte("bucket_date", endDateStr)

    if (isSameDay) {
      query = query.gte("bucket_hour", filterHourStart).lte("bucket_hour", filterHourEnd)
    }
    if (method) {
      query = query.eq("method", method)
    }

    // NOTE: search endpoint ILIKELY bisa di-filter di sisi Supabase juga,
    // tapi SDK sederhana kita lakukan in-memory saja setelah fetch.

    const { data: rawRows, error } = await query
    if (error) throw error

    // ─── 4. In-memory aggregate per endpoint+method ────────────────────────
    interface AggRow {
      endpoint: string
      method: string
      totalRequests: number
      successCount: number
      errorCount: number
      totalRt: number
    }
    const agg = new Map<string, AggRow>()
    for (const r of rawRows ?? []) {
      // Filter sub-hari presisi jika bukan full day range (mis 24h rolling)
      if (!isSameDay) {
        const bucketTs = new Date(
          `${r.bucket_date}T${String(r.bucket_hour).padStart(2, "0")}:00:00`,
        )
        if (bucketTs < startDate || bucketTs > endDate) continue
      }
      if (search && !(r.endpoint as string).toLowerCase().includes(search.toLowerCase())) {
        continue
      }
      const key = `${r.endpoint}__${r.method}`
      let row = agg.get(key)
      if (!row) {
        row = {
          endpoint: r.endpoint,
          method: r.method,
          totalRequests: 0,
          successCount: 0,
          errorCount: 0,
          totalRt: 0,
        }
        agg.set(key, row)
      }
      row.totalRequests += Number(r.total_requests || 0)
      row.successCount += Number(r.success_count || 0)
      row.errorCount += Number(r.error_count || 0)
      row.totalRt += Number(r.total_response_time || 0)
    }

    // ─── 5. Build enriched list ────────────────────────────────────────────
    interface EnrichedRow {
      endpoint: string
      method: string
      totalRequests: number
      successCount: number
      errorCount: number
      errorRate: number
      averageResponseTime: number
    }
    const list: EnrichedRow[] = Array.from(agg.values()).map((r) => ({
      endpoint: r.endpoint,
      method: r.method,
      totalRequests: r.totalRequests,
      successCount: r.successCount,
      errorCount: r.errorCount,
      errorRate: r.totalRequests > 0 ? (r.errorCount / r.totalRequests) * 100 : 0,
      averageResponseTime: r.totalRequests > 0 ? Math.round(r.totalRt / r.totalRequests) : 0,
    }))

    // ─── 6. Sort ───────────────────────────────────────────────────────────
    const dir = sortDir === "asc" ? 1 : -1
    list.sort((a, b) => {
      switch (sortKey) {
        case "endpoint":
          return a.endpoint.localeCompare(b.endpoint) * dir
        case "success_count":
          return (a.successCount - b.successCount) * dir
        case "error_count":
          return (a.errorCount - b.errorCount) * dir
        case "error_rate":
          return (a.errorRate - b.errorRate) * dir
        case "avg_response_time":
          return (a.averageResponseTime - b.averageResponseTime) * dir
        case "total_requests":
        default:
          return (a.totalRequests - b.totalRequests) * dir
      }
    })

    // ─── 7. Pagination ─────────────────────────────────────────────────────
    const total = list.length
    const totalPages = Math.max(1, Math.ceil(total / limit))
    const safePage = Math.min(page, totalPages)
    const offset = (safePage - 1) * limit
    const pageData = list.slice(offset, offset + limit)

    return NextResponse.json({
      data: pageData,
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
    console.error("[System Monitoring Requests] Error:", error)
    return NextResponse.json(
      {
        error: "Gagal mengambil request metrics",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
