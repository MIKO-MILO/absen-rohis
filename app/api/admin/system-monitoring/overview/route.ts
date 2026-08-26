import { NextResponse, NextRequest } from "next/server"
import { createClient } from "@/lib/supabaseServer"
import { requireSuperadminSession } from "@/lib/auth-server"

type TrendRange = "today" | "24h" | "7d" | "30d"

interface TrendBucket {
  bucketLabel: string
  totalRequests: number
  successCount: number
  errorCount: number
  totalResponseTime: number
}

interface TopEndpoint {
  endpoint: string
  method: string
  totalRequests: number
  successCount: number
  errorCount: number
  errorRate: number
  averageResponseTime: number
}

function getRangeConfig(range: TrendRange): {
  fromStartOfDay: boolean
  lookbackHours: number
  labelMode: "hour" | "day"
} {
  switch (range) {
    case "today":
      return { fromStartOfDay: true, lookbackHours: 24, labelMode: "hour" }
    case "24h":
      return { fromStartOfDay: false, lookbackHours: 24, labelMode: "hour" }
    case "7d":
      return { fromStartOfDay: false, lookbackHours: 7 * 24, labelMode: "day" }
    case "30d":
      return { fromStartOfDay: false, lookbackHours: 30 * 24, labelMode: "day" }
    default:
      return { fromStartOfDay: true, lookbackHours: 24, labelMode: "hour" }
  }
}

export async function GET(req: NextRequest) {
  try {
    await requireSuperadminSession()
    const supabase = await createClient()

    const { searchParams } = new URL(req.url)
    const range = (searchParams.get("range") as TrendRange | null) ?? "today"
    const cfg = getRangeConfig(range)

    const now = new Date()
    let startTs: Date
    if (cfg.fromStartOfDay) {
      startTs = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0,
        0,
        0
      )
    } else {
      startTs = new Date(now.getTime() - cfg.lookbackHours * 60 * 60 * 1000)
    }
    const startDateStr = startTs.toISOString().slice(0, 10)
    const endDateStr = now.toISOString().slice(0, 10)

    // ─── 1. Aggregate stats (total, success, error, avg RT) ────────────────
    const { data: aggRows, error: aggErr } = await supabase
      .from("request_metrics")
      .select(
        "total_requests, success_count, error_count, total_response_time, bucket_date, bucket_hour"
      )
      .gte("bucket_date", startDateStr)
      .lte("bucket_date", endDateStr)

    if (aggErr) throw aggErr

    let totalRequests = 0
    let successCount = 0
    let errorCount = 0
    let totalResponseTime = 0
    for (const r of aggRows ?? []) {
      if (!cfg.fromStartOfDay) {
        // Filter bucket_hour juga agar sesuai lookback jam (untuk 24h rolling).
        const bucketTs = new Date(
          `${r.bucket_date}T${String(r.bucket_hour).padStart(2, "0")}:00:00`
        )
        if (bucketTs < startTs) continue
      }
      totalRequests += Number(r.total_requests || 0)
      successCount += Number(r.success_count || 0)
      errorCount += Number(r.error_count || 0)
      totalResponseTime += Number(r.total_response_time || 0)
    }

    const successRate =
      totalRequests > 0 ? (successCount / totalRequests) * 100 : 100
    const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0
    const averageResponseTime =
      totalRequests > 0 ? Math.round(totalResponseTime / totalRequests) : 0

    // ─── 2. Yesterday comparison (hitung dari aggRows untuk hemat query) ───
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const yesterdayStr = yesterday.toISOString().slice(0, 10)
    const todayStr = now.toISOString().slice(0, 10)
    let yesterdayRequests = 0
    let todayRequests = 0
    for (const r of aggRows ?? []) {
      const val = Number(r.total_requests || 0)
      if (r.bucket_date === yesterdayStr) yesterdayRequests += val
      if (r.bucket_date === todayStr) todayRequests += val
    }
    const changePct =
      yesterdayRequests > 0
        ? ((todayRequests - yesterdayRequests) / yesterdayRequests) * 100
        : todayRequests > 0
          ? 100
          : 0

    // ─── 3. Trend buckets (array per jam / per hari) ───────────────────────
    const trendMap = new Map<string, TrendBucket>()
    if (cfg.labelMode === "hour") {
      // 24 jam: 00..23 (jika today) atau rolling 24 jam
      if (cfg.fromStartOfDay) {
        for (let h = 0; h < 24; h++) {
          const label = `${String(h).padStart(2, "0")}:00`
          trendMap.set(label, {
            bucketLabel: label,
            totalRequests: 0,
            successCount: 0,
            errorCount: 0,
            totalResponseTime: 0,
          })
        }
      } else {
        for (let i = 23; i >= 0; i--) {
          const t = new Date(now.getTime() - i * 60 * 60 * 1000)
          const label = `${String(t.getHours()).padStart(2, "0")}:00`
          trendMap.set(`${t.toISOString().slice(0, 10)}_${t.getHours()}`, {
            bucketLabel: label,
            totalRequests: 0,
            successCount: 0,
            errorCount: 0,
            totalResponseTime: 0,
          })
        }
      }
    } else {
      // 7d atau 30d: per hari
      const days = cfg.lookbackHours / 24
      for (let i = days - 1; i >= 0; i--) {
        const t = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        const label = t.toISOString().slice(5, 10) // MM-DD
        trendMap.set(t.toISOString().slice(0, 10), {
          bucketLabel: label,
          totalRequests: 0,
          successCount: 0,
          errorCount: 0,
          totalResponseTime: 0,
        })
      }
    }

    for (const r of aggRows ?? []) {
      if (!cfg.fromStartOfDay) {
        const bucketTs = new Date(
          `${r.bucket_date}T${String(r.bucket_hour).padStart(2, "0")}:00:00`
        )
        if (bucketTs < startTs) continue
      }
      let key: string
      if (cfg.labelMode === "hour") {
        if (cfg.fromStartOfDay) {
          key = `${String(r.bucket_hour).padStart(2, "0")}:00`
        } else {
          key = `${r.bucket_date}_${r.bucket_hour}`
        }
      } else {
        key = r.bucket_date
      }
      const bucket = trendMap.get(key)
      if (!bucket) continue
      bucket.totalRequests += Number(r.total_requests || 0)
      bucket.successCount += Number(r.success_count || 0)
      bucket.errorCount += Number(r.error_count || 0)
      bucket.totalResponseTime += Number(r.total_response_time || 0)
    }

    const requestTrend = Array.from(trendMap.values())

    // ─── 4. Top endpoints (by requests, by errors) ─────────────────────────
    const { data: epAgg, error: epErr } = await supabase
      .from("request_metrics")
      .select(
        "endpoint, method, bucket_date, bucket_hour, total_requests, success_count, error_count, total_response_time"
      )
      .gte("bucket_date", startDateStr)
      .lte("bucket_date", endDateStr)
    if (epErr) throw epErr

    const byEp = new Map<string, TopEndpoint & { key: string }>()
    for (const r of epAgg ?? []) {
      if (!cfg.fromStartOfDay) {
        const bucketTs = new Date(
          `${r.bucket_date}T${String(r.bucket_hour).padStart(2, "0")}:00:00`
        )
        if (bucketTs < startTs) continue
      }
      const key = `${r.endpoint}__${r.method}`
      let cur = byEp.get(key)
      if (!cur) {
        cur = {
          key,
          endpoint: r.endpoint,
          method: r.method,
          totalRequests: 0,
          successCount: 0,
          errorCount: 0,
          errorRate: 0,
          averageResponseTime: 0,
        }
        byEp.set(key, cur)
      }
      cur.totalRequests += Number(r.total_requests || 0)
      cur.successCount += Number(r.success_count || 0)
      cur.errorCount += Number(r.error_count || 0)
      cur.averageResponseTime += Number(r.total_response_time || 0) // temporary, div later
    }
    const endpointsList = Array.from(byEp.values()).map((e) => {
      const totalRt = e.averageResponseTime
      e.averageResponseTime =
        e.totalRequests > 0 ? Math.round(totalRt / e.totalRequests) : 0
      e.errorRate =
        e.totalRequests > 0 ? (e.errorCount / e.totalRequests) * 100 : 0
      return e
    })
    const topEndpoints = [...endpointsList]
      .sort((a, b) => b.totalRequests - a.totalRequests)
      .slice(0, 10)
    const mostErrorEndpoints = [...endpointsList]
      .sort((a, b) => b.errorCount - a.errorCount || b.errorRate - a.errorRate)
      .slice(0, 5)

    // ─── 5. System Status ──────────────────────────────────────────────────
    let systemStatus: "HEALTHY" | "DEGRADED" | "CRITICAL" = "HEALTHY"
    if (errorRate >= 15) systemStatus = "CRITICAL"
    else if (errorRate >= 5) systemStatus = "DEGRADED"
    else if (averageResponseTime > 800) systemStatus = "DEGRADED"
    else if (averageResponseTime > 300) {
      // tetap HEALTHY tapi catat
    }

    return NextResponse.json({
      range,
      stats: {
        totalRequests,
        successCount,
        errorCount,
        successRate: Math.round(successRate * 10) / 10,
        errorRate: Math.round(errorRate * 10) / 10,
        averageResponseTime,
      },
      comparison: {
        todayRequests,
        yesterdayRequests,
        changePct: Math.round(changePct * 10) / 10,
      },
      topEndpoints,
      mostErrorEndpoints,
      requestTrend,
      systemStatus,
      generatedAt: new Date().toISOString(),
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    console.error("[System Monitoring Overview] Error:", error)
    return NextResponse.json(
      {
        error: "Gagal mengambil overview monitoring",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
