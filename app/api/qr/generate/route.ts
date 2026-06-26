import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabaseServer"
import { requireRole, getSession } from "@/lib/auth-server"
import { v4 as uuidv4 } from "uuid"
import QRCode from "qrcode"
import type { Database } from "@/lib/supabase-types"

export async function POST(req: Request) {
  try {
    console.log("[QR GENERATE API] Starting request...")
    console.log("[QR GENERATE API] Request URL:", req.url)
    console.log(
      "[QR GENERATE API] Request headers:",
      Object.fromEntries(req.headers.entries())
    )

    console.log("[QR GENERATE API] Checking session...")
    const session = await getSession()
    console.log("[QR GENERATE API] Session data:", session)

    console.log("[QR GENERATE API] Calling requireRole...")
    await requireRole(["admin", "superadmin", "panitia"] as const)
    console.log("[QR GENERATE API] requireRole passed")

    const body = await req.json()
    console.log("[QR GENERATE API] Request body:", body)

    const { panitia_id, expired_at } = body as Partial<
      Database["public"]["Tables"]["qr_token"]["Insert"]
    >
    // Default to 10 minutes from now if no expired_at provided
    const finalExpiredAt =
      expired_at || new Date(Date.now() + 10 * 60 * 1000).toISOString()
    const token = `ROHIS-DZUHUR-${uuidv4()}`
    const supabase = await createClient()

    console.log("[QR GENERATE API] Inserting into qr_token table...")
    const insertPayload: Database["public"]["Tables"]["qr_token"]["Insert"] = {
      token,
      aktif: true,
      expired_at: finalExpiredAt,
    }
    if (panitia_id !== null && panitia_id !== undefined) {
      insertPayload.panitia_id = panitia_id
    }
    console.log("[QR GENERATE API] Insert payload:", insertPayload)

    const { data, error } = await supabase
      .from("qr_token")
      .insert([insertPayload])
      .select()
      .single()

    if (error) {
      console.error("[QR GENERATE API] Supabase insert error:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        fullError: JSON.stringify(error),
      })
      throw error
    }

    console.log("[QR GENERATE API] Supabase insert successful, data:", data)

    const qrUrl = `${process.env.NEXT_PUBLIC_APP_URL}/scan?token=${token}`
    const qrCodeDataUrl = await QRCode.toDataURL(qrUrl, {
      width: 512,
      margin: 2,
      color: {
        dark: "#111827",
        light: "#ffffff",
      },
    })

    console.log("[QR GENERATE API] QR code generated successfully")

    return NextResponse.json({
      success: true,
      token,
      qrUrl,
      qrCodeDataUrl,
      qrData: data,
    })
  } catch (error) {
    console.error("[QR GENERATE API] Error caught:", error)
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
}
