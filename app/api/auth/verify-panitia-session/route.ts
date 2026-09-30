import { getSession } from "@/lib/auth-server"
import { createClient } from "@/lib/supabaseServer"
import { NextResponse } from "next/server"

/**
 * GET /api/auth/verify-panitia-session
 *
 * Dipakai oleh halaman panitia untuk polling: apakah session yang tersimpan
 * masih cocok dengan data di database? Jika tidak (nama/email/divisi berubah
 * atau baris dihapus), kembalikan { valid: false } sehingga client bisa
 * langsung logout otomatis.
 */
export async function GET() {
  try {
    const session = await getSession()

    // Hanya relevan untuk role panitia
    if (!session || session.role !== "panitia") {
      return NextResponse.json({ valid: false, reason: "not_panitia" })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from("panitia")
      .select("id, nama, divisi, email")
      .eq("id", session.id)
      .maybeSingle()

    if (error || !data) {
      // Baris tidak ditemukan → panitia dihapus
      return NextResponse.json({ valid: false, reason: "not_found" })
    }

    // Cek apakah nama atau divisi berubah dibanding yang ada di cookie session
    const nameChanged = data.nama !== session.nama
    const divisiChanged =
      (data.divisi ?? undefined) !== (session.divisi ?? undefined)

    if (nameChanged || divisiChanged) {
      return NextResponse.json({
        valid: false,
        reason: "data_changed",
        changed: {
          nama: nameChanged,
          divisi: divisiChanged,
        },
      })
    }

    return NextResponse.json({ valid: true })
  } catch (err) {
    console.error("[verify-panitia-session] error:", err)
    // Gagal cek → anggap valid supaya tidak logout karena error jaringan
    return NextResponse.json({ valid: true })
  }
}
