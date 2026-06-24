import { clearSessionCookie, clearImpersonationCookie } from "@/lib/auth-server"
import { NextResponse } from "next/server"

export async function POST() {
  await clearSessionCookie()
  await clearImpersonationCookie()
  return NextResponse.json({ success: true })
}
