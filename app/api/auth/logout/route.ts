import { clearSessionCookie, clearImpersonationCookie, getSession } from "@/lib/auth-server"
import { NextResponse } from "next/server"
import { withRequestMetrics } from "@/lib/request-metrics"
import { createAuditLog } from "@/lib/audit-log"

export const POST = withRequestMetrics(async function POST() {
  try {
    const session = await getSession()
    await clearSessionCookie()
    await clearImpersonationCookie()

    if (session) {
      await createAuditLog({
        actor: session,
        action: "logout",
        description: `${session.nama} logged out as ${session.role}`,
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[API /api/auth/logout] Unhandled error:", err)
    return NextResponse.json({ success: false })
  }
})
