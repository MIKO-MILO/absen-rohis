import { getFullSessionData } from "@/lib/auth-server"
import { NextResponse } from "next/server"

export async function GET() {
  const fullSession = await getFullSessionData()
  if (!fullSession) {
    return NextResponse.json({ user: null })
  }
  return NextResponse.json(fullSession)
}
