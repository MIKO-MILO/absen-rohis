import { clearSessionCookie, clearImpersonationCookie } from "@/lib/auth-server"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    await clearSessionCookie()
    await clearImpersonationCookie()
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[API /api/auth/logout] Unhandled error:", err)
    return NextResponse.json({ success: false })
  }
}
