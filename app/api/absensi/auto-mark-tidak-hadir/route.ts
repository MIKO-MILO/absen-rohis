import { supabase } from "../../../../lib/supabaseClient"
import { TEST_CONFIG, isPastAbsensiTime } from "@/lib/test-config"

export async function POST() {
  try {
    // Cek apakah fitur ini diaktifkan dan waktu sudah lewat
    if (!TEST_CONFIG.ENABLE_FORGOT_SIGN_IN) {
      return Response.json(
        { error: "Fitur auto mark tidak hadir dinonaktifkan" },
        { status: 400 }
      )
    }

    if (!isPastAbsensiTime()) {
      return Response.json(
        { error: "Waktu belum lewat 14:00 pada hari Jumat" },
        { status: 400 }
      )
    }

    const today = new Date().toISOString().split("T")[0]

    // 1. Ambil semua user
    const { data: allUsers, error: usersError } = await supabase
      .from("users")
      .select("id")

    if (usersError) throw usersError

    if (!allUsers || allUsers.length === 0) {
      return Response.json({ message: "Tidak ada user ditemukan" })
    }

    // 2. Ambil semua absensi hari ini
    const { data: absensiHariIni, error: absensiError } = await supabase
      .from("absensi")
      .select("user_id")
      .eq("tanggal", today)

    if (absensiError) throw absensiError

    // 3. Filter user yang belum absen
    const userIdsAbsenHariIni = new Set(
      absensiHariIni?.map((a) => a.user_id) || []
    )
    const usersBelumAbsen = allUsers.filter(
      (u) => !userIdsAbsenHariIni.has(u.id)
    )

    if (usersBelumAbsen.length === 0) {
      return Response.json({ message: "Semua user sudah absen hari ini" })
    }

    // 4. Insert absensi dengan status "tidak_hadir"
    const absensiToInsert = usersBelumAbsen.map((user) => ({
      user_id: user.id,
      tanggal: today,
      waktu: "14:00:00",
      status: "tidak_hadir",
      panitia_id: null,
    }))

    const { error: insertError } = await supabase
      .from("absensi")
      .insert(absensiToInsert)

    if (insertError) throw insertError

    return Response.json({
      success: true,
      message: `Berhasil menandai ${usersBelumAbsen.length} user sebagai tidak hadir`,
      count: usersBelumAbsen.length,
    })
  } catch (err) {
    console.error("Auto mark tidak hadir error:", err)
    return Response.json(
      { error: "Gagal menandai user sebagai tidak hadir" },
      { status: 500 }
    )
  }
}
