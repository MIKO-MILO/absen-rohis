import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabaseServer"
import { requireRole, getSession } from "@/lib/auth-server"
import { v4 as uuidv4 } from "uuid"
import QRCode from "qrcode"
import type { Database } from "@/lib/supabase-types"
import { withRequestMetrics } from "@/lib/request-metrics"
import { checkRateLimitPreset, rateLimitErrorResponse } from "@/lib/rate-limit"
import { createAuditLog } from "@/lib/audit-log"

export const dynamic = "force-dynamic"

export const POST = withRequestMetrics(async function POST(req: NextRequest) {
  try {
    const rl = await checkRateLimitPreset({ req, scope: "qr-generate" })
    if (!rl.allowed) return rateLimitErrorResponse(rl.resetAt)

    const session = await getSession()
    if (!session?.id) throw new Error("Unauthorized")

    await requireRole(["admin", "superadmin", "panitia"] as const)

    const body = await req.json()
    const { panitia_id, expired_at } = body as Partial<
      Database["public"]["Tables"]["qr_token"]["Insert"]
    >

    const finalExpiredAt =
      expired_at || new Date(Date.now() + 10 * 60 * 1000).toISOString()
    const token = `ROHIS-DZUHUR-${uuidv4()}`
    const supabase = await createClient()

    const insertPayload: Database["public"]["Tables"]["qr_token"]["Insert"] = {
      token,
      aktif: true,
      expired_at: finalExpiredAt,
    }
    if (panitia_id !== null && panitia_id !== undefined) {
      insertPayload.panitia_id = panitia_id
    }

    const { data, error } = await supabase
      .from("qr_token")
      .insert([insertPayload])
      .select()
      .single()

    if (error) throw error

    await createAuditLog({
      actor: session,
      action: "generate_qr",
      targetType: null,
      description: `${session.nama} generated QR token (${token.slice(0, 20)}...)`,
    })

    const qrUrl = `${process.env.NEXT_PUBLIC_APP_URL}/scan?token=${token}`
    const qrCodeDataUrl = await QRCode.toDataURL(qrUrl, {
      width: 512,
      margin: 2,
      color: {
        dark: "#111827",
        light: "#ffffff",
      },
    })

    return NextResponse.json({
      success: true,
      token,
      qrUrl,
      qrCodeDataUrl,
      qrData: data,
    })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    console.error("Generate QR error:", error)
    return NextResponse.json(
      {
        error: "Gagal generate QR Code",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
})
