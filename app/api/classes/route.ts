/**
 * app/api/classes/route.ts
 * Mendapatkan daftar semua kelas yang tersedia di database
 */

import { NextResponse } from "next/server"
import { supabase } from "../../../lib/supabaseClient"

export async function GET() {
  try {
    const { data: users, error } = await supabase
      .from("users")
      .select("kelas")

    if (error) throw error

    // Dapatkan semua kelas unik dan sort
    const uniqueClasses = [...new Set((users || []).map(u => u.kelas))].sort()

    return NextResponse.json({ classes: uniqueClasses })
  } catch (err) {
    console.error("[api-classes] Error:", err)
    return NextResponse.json(
      { error: "Gagal mengambil daftar kelas" },
      { status: 500 }
    )
  }
}
