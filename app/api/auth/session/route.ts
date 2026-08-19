import { getFullSessionData } from "@/lib/auth-server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const fullSession = await getFullSessionData()
    if (!fullSession) {
      return NextResponse.json({ user: null })
    }
    return NextResponse.json(fullSession)
  } catch (err) {
    console.error("[API /api/auth/session] Unhandled error:", err)
    return NextResponse.json({ user: null })
  }
}
