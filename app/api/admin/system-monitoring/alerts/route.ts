import { NextResponse, NextRequest } from "next/server"
import { createClient } from "@/lib/supabaseServer"
import { requireSuperadminSession } from "@/lib/auth-server"

interface AlertRule {
  id: string
  name: string
  metric: "error_rate" | "avg_response_time"
  operator: "gte"
  threshold: number
  severity: "WARNING" | "CRITICAL"
  minRequests: number
}

const STATIC_RULES: AlertRule[] = [
  {
    id: "rule_critical_error",
    name: "Tingkat Error Kritis",
    metric: "error_rate",
    operator: "gte",
    threshold: 10,
    severity: "CRITICAL",
    minRequests: 5,
  },
  {
    id: "rule_warning_error",
    name: "Tingkat Error Tinggi",
    metric: "error_rate",
    operator: "gte",
    threshold: 5,
    severity: "WARNING",
    minRequests: 5,
  },
  {
    id: "rule_slow_response",
    name: "Respon API Lambat",
    metric: "avg_response_time",
    operator: "gte",
    threshold: 800,
    severity: "WARNING",
    minRequests: 5,
  },
]

export async function GET(req: NextRequest) {
  try {
    await requireSuperadminSession()
    const supabase = await createClient()

    const { searchParams } = new URL(req.url)
    const range = searchParams.get("range") || "24h"

    const now = new Date()
    let startDate: Date
    if (range === "today") {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
    } else if (range === "7d") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    } else {
      // default 24h
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    }
    const startDateStr = startDate.toISOString().slice(0, 10)
    const endDateStr = now.toISOString().slice(0, 10)
    const filterHourStart = startDate.getHours()
    const filterHourEnd = now.getHours()
    const isSameDay = startDateStr === endDateStr

    // Fetch metrics using RPC
    const { data: dbRows, error: dbErr } = await supabase.rpc(
      "get_active_alerts_metrics",
      {
        p_start_date: startDateStr,
        p_end_date: endDateStr,
        p_start_hour: filterHourStart,
        p_end_hour: filterHourEnd,
        p_is_same_day: isSameDay,
      }
    )

    if (dbErr) throw dbErr

    interface TriggeredAlert {
      id: string
      ruleName: string
      endpoint: string
      method: string
      metric: string
      thresholdValue: number
      currentValue: number
      severity: "WARNING" | "CRITICAL"
      triggeredAt: string
    }

    const activeAlerts: TriggeredAlert[] = []

    for (const r of dbRows ?? []) {
      const totalRequests = Number(r.total_requests || 0)
      const errorRate = Number(r.error_rate || 0)
      const avgRt = Number(r.avg_response_time || 0)

      // Evaluate rules
      for (const rule of STATIC_RULES) {
        if (totalRequests < rule.minRequests) continue

        let triggered = false
        let currentValue = 0

        if (rule.metric === "error_rate") {
          triggered = errorRate >= rule.threshold
          currentValue = parseFloat(errorRate.toFixed(1))
        } else if (rule.metric === "avg_response_time") {
          triggered = avgRt >= rule.threshold
          currentValue = avgRt
        }

        if (triggered) {
          // Check if an alert for this endpoint and rule already exists.
          // If a critical rule triggers, we skip the warning rule of the same metric type to avoid noise.
          const isRedundant = activeAlerts.some(
            (a) =>
              a.endpoint === r.endpoint &&
              a.method === r.method &&
              a.metric === rule.metric &&
              a.severity === "CRITICAL",
          )
          if (rule.severity === "WARNING" && isRedundant) continue

          activeAlerts.push({
            id: `${rule.id}_${r.endpoint}_${r.method}`,
            ruleName: rule.name,
            endpoint: r.endpoint,
            method: r.method,
            metric: rule.metric,
            thresholdValue: rule.threshold,
            currentValue,
            severity: rule.severity,
            triggeredAt: new Date().toISOString(),
          })
        }
      }
    }

    // Determine system status
    let systemStatus: "HEALTHY" | "DEGRADED" | "CRITICAL" = "HEALTHY"
    if (activeAlerts.some((a) => a.severity === "CRITICAL")) {
      systemStatus = "CRITICAL"
    } else if (activeAlerts.some((a) => a.severity === "WARNING")) {
      systemStatus = "DEGRADED"
    }

    return NextResponse.json({
      activeAlerts,
      rules: STATIC_RULES,
      systemStatus,
      range,
      generatedAt: new Date().toISOString(),
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    console.error("[System Monitoring Alerts] Error:", error)
    return NextResponse.json(
      {
        error: "Gagal mengambil alerts data",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
