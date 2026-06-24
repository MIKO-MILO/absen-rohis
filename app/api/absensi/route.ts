import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabaseServer"
import { requireAuthenticatedSession } from "@/lib/auth-server"
import { canAccessUserData } from "@/lib/auth-client"
import type { AbsensiWithUserSummary } from "@/lib/supabase-types"

export async function GET(req: Request) {
  try {
    const session = await requireAuthenticatedSession()
    const { searchParams } = new URL(req.url)
    const user_id = searchParams.get("user_id")
    const panitia_id = searchParams.get("panitia_id")
    const supabase = await createClient()

    // Validate ownership for siswa
    if (user_id && !canAccessUserData(session, user_id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    let query = supabase.from("absensi").select(
      `
      *,
      users (
        nama,
        nis,
        kelas,
        jenis_kelamin
      )
    `
    )

    // For siswa, only show their own data even if no user_id is provided
    if (session.role === "siswa") {
      query = query.eq("user_id", session.id)
    } else if (user_id) {
      const targetUserId = isNaN(Number(user_id)) ? user_id : Number(user_id)
      query = query.eq("user_id", targetUserId)
    }

    if (panitia_id) {
      const targetPanitiaId = isNaN(Number(panitia_id))
        ? panitia_id
        : Number(panitia_id)
      query = query.eq("panitia_id", targetPanitiaId)
    }

    const { data, error } = await query

    if (error) {
      console.error("SUPABASE ERROR:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const typedData = data as unknown as Array<AbsensiWithUserSummary>

    return NextResponse.json(typedData)
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    console.error(error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
