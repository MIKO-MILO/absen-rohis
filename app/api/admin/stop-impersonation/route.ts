import { createClient } from "@/lib/supabaseServer"
import { getOriginalSession, clearImpersonationCookie } from "@/lib/auth-server"
import { createAuditLog } from "@/lib/audit-log"

export async function POST() {
  try {
    const originalSession = await getOriginalSession()

    if (!originalSession || originalSession.role !== "superadmin") {
      return Response.json(
        { error: "Unauthorized - Only superadmin can use impersonation" },
        { status: 401 }
      )
    }

    const supabase = await createClient()

    // 1. Find all active impersonation sessions for this admin
    const { data: activeSessions } = await supabase
      .from("impersonation_sessions")
      .select("*")
      .eq("admin_id", originalSession.id)
      .eq("active", true)

    // 2. Mark them as ended
    if (activeSessions && activeSessions.length > 0) {
      const sessionIds = activeSessions.map((s) => s.id)
      await supabase
        .from("impersonation_sessions")
        .update({
          active: false,
          ended_at: new Date().toISOString(),
        })
        .in("id", sessionIds)

      // 3. Create audit log
      for (const session of activeSessions) {
        await createAuditLog({
          actor: originalSession,
          action: "stop_impersonation",
          targetType: session.target_role,
          targetId: session.target_user_id,
          description: `${originalSession.nama} stopped impersonating`,
        })
      }
    }

    // 4. Clear the impersonation cookie
    await clearImpersonationCookie()

    return Response.json({
      success: true,
      redirect: "/admin/dashboard",
    })
  } catch (error: unknown) {
    console.error("Stop impersonation error:", error)
    return Response.json({ error: "Terjadi kesalahan server" }, { status: 500 })
  }
}
