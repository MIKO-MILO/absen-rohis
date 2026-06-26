import { createClient } from "@/lib/supabaseServer"
import { getOriginalSession, setImpersonationCookie } from "@/lib/auth-server"
import { createAuditLog } from "@/lib/audit-log"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { targetUserId, targetRole } = body

    if (!targetUserId || !targetRole) {
      return Response.json(
        { error: "targetUserId and targetRole are required" },
        { status: 400 }
      )
    }

    if (targetRole !== "siswa" && targetRole !== "panitia") {
      return Response.json(
        { error: "targetRole must be 'siswa' or 'panitia'" },
        { status: 400 }
      )
    }

    // 1. Verify requester is superadmin
    const originalSession = await getOriginalSession()
    if (!originalSession || originalSession.role !== "superadmin") {
      return Response.json(
        { error: "Unauthorized - Only superadmin can use impersonation" },
        { status: 401 }
      )
    }

    const supabase = await createClient()
    let targetUser: Record<string, unknown> | null = null
    let redirectUrl: string

    // 2. Fetch target user
    if (targetRole === "siswa") {
      const { data: userData } = await supabase
        .from("users")
        .select("*")
        .eq("id", targetUserId)
        .maybeSingle()

      if (!userData) {
        return Response.json({ error: "Siswa not found" }, { status: 404 })
      }

      targetUser = userData
      redirectUrl = "/user/home"
    } else if (targetRole === "panitia") {
      const { data: panitiaData } = await supabase
        .from("panitia")
        .select("*")
        .eq("id", targetUserId)
        .maybeSingle()

      if (!panitiaData) {
        return Response.json({ error: "Panitia not found" }, { status: 404 })
      }

      targetUser = panitiaData
      redirectUrl = "/rohis/home"
    } else {
      return Response.json({ error: "Invalid target role" }, { status: 400 })
    }

    // 3. Create impersonation session in DB
    const { data: impersonationSessionData, error: impersonationError } =
      await supabase
        .from("impersonation_sessions")
        .insert({
          admin_id: originalSession.id,
          target_user_id: targetUserId,
          target_role: targetRole,
          active: true,
        })
        .select()
        .maybeSingle()

    if (impersonationError) {
      console.error("Impersonation session insert error:", impersonationError)
      return Response.json(
        { error: "Failed to create impersonation session" },
        { status: 500 }
      )
    }

    // 4. Create audit log
    await createAuditLog({
      actor: originalSession,
      action: "start_impersonation",
      targetType: targetRole,
      targetId: targetUserId,
      description: `${originalSession.nama} started impersonating ${(targetUser as Record<string, unknown>).nama as string} (${targetRole})`,
    })

    // 5. Set impersonation cookie
    await setImpersonationCookie({
      adminId: originalSession.id,
      adminNama: originalSession.nama,
      targetUserId: targetUserId,
      targetRole: targetRole,
    })

    return Response.json({
      success: true,
      redirect: redirectUrl,
      targetUser: targetUser,
      impersonationSessionId: impersonationSessionData?.id,
    })
  } catch (error: unknown) {
    console.error("Impersonate error:", error)
    return Response.json({ error: "Terjadi kesalahan server" }, { status: 500 })
  }
}
