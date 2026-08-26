import { NextResponse, NextRequest } from "next/server"
import { createClient } from "@/lib/supabaseServer"
import {
  costGuardObserveRequest,
  isFeatureAllowed,
  cronTryClaimLock,
} from "@/lib/cost-guard"

export async function POST(req: NextRequest) {
  costGuardObserveRequest(req)

  if (!isFeatureAllowed("cleanup-job")) {
    return NextResponse.json(
      { success: false, message: "Cleanup cron is disabled during emergency mode." },
      { status: 503 }
    )
  }

  try {
    const authHeader = req.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createClient()

    const lock = await cronTryClaimLock(supabase, "system-monitoring-cleanup")

    // 2. Call cleanup database function with default 90 days retention
    const { data, error } = await supabase.rpc(
      "cleanup_system_monitoring",
      { retention_days: 90 }
    )

    if (error) {
      await lock.release()
      throw error
    }

    await lock.release()

    return NextResponse.json({
      success: true,
      deleted: data,
      executedAt: new Date().toISOString(),
    })
  } catch (error: unknown) {
    console.error("[Cron System Cleanup] Error:", error)
    return NextResponse.json(
      {
        error: "Gagal memproses cron cleanup",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
