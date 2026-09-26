import { createClient } from "@/lib/supabaseServer"
import { getOriginalSession, clearImpersonationCookie } from "@/lib/auth-server"
import { createAuditLog, type AuditTargetType } from "@/lib/audit-log"
import { withRequestMetrics } from "@/lib/request-metrics"

export const POST = withRequestMetrics(async function POST() {
  try {
    const originalSession = await getOriginalSession()

    if (!originalSession || originalSession.role !== "superadmin") {
      return Response.json(
        { error: "Unauthorized - Only superadmin can use impersonation" },
        { status: 401 }
      )
    }

    const supabase = await createClient()

    const { data: activeSessions } = await supabase
      .from("impersonation_sessions")
      .select("*")
      .eq("admin_id", originalSession.id)
      .eq("active", true)

    if (activeSessions && activeSessions.length > 0) {
      const sessionIds = activeSessions.map((s) => s.id)
      await supabase
        .from("impersonation_sessions")
        .update({
          active: false,
          ended_at: new Date().toISOString(),
        })
        .in("id", sessionIds)

      for (const session of activeSessions) {
        const rawRole = session.target_role
        const mappedType: AuditTargetType =
          rawRole === "siswa" ? "siswa" : rawRole === "panitia" ? "panitia" : null
        await createAuditLog({
          actor: originalSession,
          action: "stop_impersonation",
          targetType: mappedType,
          targetId: session.target_user_id,
          description: `${originalSession.nama} stopped impersonating`,
        })
      }
    }

    await clearImpersonationCookie()

    return Response.json({
      success: true,
      redirect: "/admin/dashboard",
    })
  } catch (error: unknown) {
    console.error("Stop impersonation error:", error)
    return Response.json({ error: "Terjadi kesalahan server" }, { status: 500 })
  }
})
