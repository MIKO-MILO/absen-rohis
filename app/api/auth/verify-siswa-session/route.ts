import { getSession } from "@/lib/auth-server"
import { createClient } from "@/lib/supabaseServer"
import { NextResponse } from "next/server"

/**
 * GET /api/auth/verify-siswa-session
 *
 * Dipakai oleh halaman siswa untuk polling: apakah session yang tersimpan
 * masih cocok dengan data di database? Jika tidak (nama/kelas berubah
 * atau baris dihapus), kembalikan { valid: false } sehingga client bisa
 * langsung logout otomatis.
 */
export async function GET() {
  try {
    const session = await getSession()

    // Hanya relevan untuk role siswa
    if (!session || session.role !== "siswa") {
      return NextResponse.json({ valid: false, reason: "not_siswa" })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from("users")
      .select("id, nama, kelas, email")
      .eq("id", session.id)
      .maybeSingle()

    if (error || !data) {
      // Baris tidak ditemukan → siswa dihapus
      return NextResponse.json({ valid: false, reason: "not_found" })
    }

    // Cek apakah nama atau kelas berubah dibanding yang ada di cookie session
    const nameChanged = data.nama !== session.nama
    const kelasChanged =
      (data.kelas ?? undefined) !== (session.kelas ?? undefined)

    if (nameChanged || kelasChanged) {
      return NextResponse.json({
        valid: false,
        reason: "data_changed",
        changed: {
          nama: nameChanged,
          kelas: kelasChanged,
        },
      })
    }

    return NextResponse.json({ valid: true })
  } catch (err) {
    console.error("[verify-siswa-session] error:", err)
    // Gagal cek → anggap valid supaya tidak logout karena error jaringan
    return NextResponse.json({ valid: true })
  }
}
