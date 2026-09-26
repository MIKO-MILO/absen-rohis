import { NextResponse, NextRequest } from "next/server"
import { createClient } from "@/lib/supabaseServer"
import { requireSuperadminSession } from "@/lib/auth-server"
import { createAuditLog } from "@/lib/audit-log"

export async function POST(req: NextRequest) {
  try {
    // 1. Authorization: Superadmin-only
    const actor = await requireSuperadminSession()
    const supabase = await createClient()

    // 2. Parse & Validate retentionDays
    let retentionDays = 90
    try {
      const body = await req.json().catch(() => ({}))
      if (body.retentionDays !== undefined) {
        retentionDays = Number(body.retentionDays)
      }
    } catch {
      // Fallback to default if body parsing fails
    }

    if (Number.isNaN(retentionDays) || retentionDays < 30 || retentionDays > 365) {
      return NextResponse.json(
        { error: "Retention period harus berupa angka antara 30 dan 365 hari." },
        { status: 400 }
      )
    }

    // 3. Call database function
    const { data, error } = await supabase.rpc(
      "cleanup_system_monitoring",
      { retention_days: retentionDays }
    )

    if (error) throw error

    const deletedCount = typeof data === "number" ? data : 0

    await createAuditLog({
      actor,
      action: "system_cleanup",
      targetType: null,
      description: `${actor.nama} menjalankan system monitoring cleanup (retention=${retentionDays}d, deleted=${deletedCount})`,
    })

    return NextResponse.json({
      success: true,
      retentionDays,
      deleted: data,
      executedAt: new Date().toISOString(),
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    console.error("[System Monitoring Cleanup] Error:", error)
    return NextResponse.json(
      {
        error: "Gagal menjalankan cleanup database",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
