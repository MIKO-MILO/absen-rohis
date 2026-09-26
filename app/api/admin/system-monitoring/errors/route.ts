import { NextResponse, NextRequest } from "next/server"
import { createServiceClient } from "@/lib/supabaseServer"
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

const METHODS_ALLOWED = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
  "HEAD",
]

function parseDateSafe(v: string | null): Date | null {
  if (!v) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

type AggRow = {
  endpoint: string
  method: string
  totalRequests: number
  successCount: number
  errorCount: number
  errorRate: number
  averageResponseTime: number
}

export async function GET(req: NextRequest) {
  try {
    await requireSuperadminSession()
    const serviceSupabase = await createServiceClient()
    const { searchParams } = new URL(req.url)

    const range = (searchParams.get("range") as Range | null) ?? "today"
    const fromStr = searchParams.get("from")
    const toStr = searchParams.get("to")
    const method = searchParams.get("method")?.toUpperCase() || null
    const search = searchParams.get("search")?.trim() || null
    const sortKey = (searchParams.get("sort") as SortKey) ?? "error_count"
    const sortDir = (searchParams.get("dir") as SortDir) ?? "desc"
    const rawIncludeAll = searchParams.get("include_all")
    // ⚠️ DEFAULT: include_all = true (tampilkan endpoint dengan error_count=0
    //    juga jika tidak ada endpoint dengan error sama sekali). Dengan ini
    //    halaman TIDAK PERNAH tampil "Tidak ada data" kalau tabel ada isi.
    const includeAll =
      rawIncludeAll === null ? true : ["1", "true", "yes"].includes(rawIncludeAll)
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.max(
      1,
      Math.min(100, parseInt(searchParams.get("limit") || "20", 10))
    )

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
            { status: 400 }
          )
        }
        startDate = new Date(
          f.getFullYear(),
          f.getMonth(),
          f.getDate(),
          0,
          0,
          0
        )
        endDate = new Date(
          t.getFullYear(),
          t.getMonth(),
          t.getDate(),
          23,
          59,
          59,
          999
        )
        break
      }
      case "today":
      default:
        startDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          0,
          0,
          0
        )
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

    // ─── 3. Query langsung ke request_metrics via service client (bypass RLS)
    //        ini LEBIH andal dari RPC get_error_metrics yang kadang gagal
    //        apply ke user environment (RLS / migration order).
    let query = serviceSupabase
      .from("request_metrics")
      .select(
        "endpoint, method, total_requests, success_count, error_count, total_response_time, bucket_date, bucket_hour",
        { count: "exact" }
      )
      .gte("bucket_date", startDateStr)
      .lte("bucket_date", endDateStr)

    if (isSameDay) {
      query = query
        .gte("bucket_hour", filterHourStart)
        .lte("bucket_hour", filterHourEnd)
    }
    if (method) query = query.eq("method", method)
    if (search) query = query.ilike("endpoint", `%${search}%`)

    const { data: raw, error: rawErr, count: rawCount } = await query

    if (rawErr) {
      console.error("[System Monitoring Errors] raw query error:", rawErr)
      throw rawErr
    }

    console.log(
      `[System Monitoring Errors] raw rows in range: ${rawCount} (include_all=${String(includeAll)})`
    )

    // ─── 4. Agregasi per endpoint+method di memori (lebih fleksibel) ───────
    const map = new Map<string, AggRow>()
    for (const r of raw ?? []) {
      const tr = Number(r.total_requests || 0)
      const sc = Number(r.success_count || 0)
      const ec = Number(r.error_count || 0)
      const trt = Number(r.total_response_time || 0)
      const key = `${r.endpoint}::${r.method}`
      const prev = map.get(key)
      if (prev) {
        prev.totalRequests += tr
        prev.successCount += sc
        prev.errorCount += ec
        prev.averageResponseTime =
          prev.averageResponseTime * (prev.totalRequests - tr) + trt
        prev.averageResponseTime =
          prev.totalRequests > 0
            ? Math.round(prev.averageResponseTime / prev.totalRequests)
            : 0
      } else {
        map.set(key, {
          endpoint: r.endpoint,
          method: r.method,
          totalRequests: tr,
          successCount: sc,
          errorCount: ec,
          errorRate: tr > 0 ? (ec / tr) * 100 : 0,
          averageResponseTime: tr > 0 ? Math.round(trt / tr) : 0,
        })
      }
    }

    // Recalculate error rate setelah semua row tergabung
    for (const row of map.values()) {
      row.errorRate =
        row.totalRequests > 0
          ? (row.errorCount / row.totalRequests) * 100
          : 0
    }

    // ─── 5. Filter by error_count (kecuali `include_all = true`) ───────────
    let rows = Array.from(map.values())
    let filterApplied = ""
    if (includeAll) {
      filterApplied =
        "Tidak ada endpoint error → menampilkan SEMUA endpoint dengan request."
      rows.sort((a, b) => b.totalRequests - a.totalRequests)
    } else {
      rows = rows.filter((r) => r.errorCount > 0)
      filterApplied = "Hanya menampilkan endpoint dengan error > 0."
    }

    // ─── 6. Sorting + pagination ────────────────────────────────────────────
    const dirMul = sortDir === "asc" ? 1 : -1
    rows.sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case "endpoint":
          cmp = a.endpoint.localeCompare(b.endpoint)
          break
        case "total_requests":
          cmp = a.totalRequests - b.totalRequests
          break
        case "success_count":
          cmp = a.successCount - b.successCount
          break
        case "error_count":
          cmp = a.errorCount - b.errorCount
          break
        case "error_rate":
          cmp = a.errorRate - b.errorRate
          break
        case "avg_response_time":
          cmp = a.averageResponseTime - b.averageResponseTime
          break
        default:
          cmp = a.errorCount - b.errorCount
      }
      return cmp * dirMul
    })

    const total = rows.length
    const totalPages = Math.max(1, Math.ceil(total / limit))
    const safePage = Math.min(page, totalPages)
    const offset = (safePage - 1) * limit
    const pageRows = rows.slice(offset, offset + limit)

    return NextResponse.json({
      data: pageRows,
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
      meta: {
        include_all: includeAll,
        raw_rows_count: rawCount ?? 0,
        hint: filterApplied,
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
      { status: 500 }
    )
  }
}
