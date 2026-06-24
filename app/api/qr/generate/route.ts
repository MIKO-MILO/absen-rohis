import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabaseServer"
import { requireRole } from "@/lib/auth-server"
import { v4 as uuidv4 } from "uuid"
import QRCode from "qrcode"
import type { Database } from "@/lib/supabase-types"

export async function POST(req: Request) {
  try {
    await requireRole(["admin", "superadmin", "panitia"] as const)
    const body = await req.json()
    const { panitia_id, is_simulation, expired_at } = body as Partial<
      Database["public"]["Tables"]["qr_token"]["Insert"]
    >
    const token = uuidv4()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("qr_token")
      .insert({
        token,
        panitia_id,
        aktif: true,
        expired_at,
        is_simulation: is_simulation || false,
      })
      .select()
      .single()

    if (error) throw error

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
      { error: "Gagal generate QR Code" },
      { status: 500 }
    )
  }
}
