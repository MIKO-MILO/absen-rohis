import { supabase } from "@/lib/supabaseClient"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { token, status, user_id } = body // token, status (hadir/berhalangan), user_id dari session

    if (!token || !user_id) {
      return Response.json(
        { error: "Token atau User ID kosong" },
        { status: 400 }
      )
    }

    // 🔍 ambil token murni (buang prefix ROHIS-DZUHUR-)
    const cleanToken = token.replace("ROHIS-DZUHUR-", "")

    // 🔍 cek QR
    const { data: qr, error: qrError } = await supabase
      .from("qr_token")
      .select("*")
      .eq("token", cleanToken)
      .maybeSingle()

    if (qrError || !qr) {
      return Response.json(
        { error: "QR Code tidak valid atau sudah dihapus" },
        { status: 400 }
      )
    }

    if (!qr.aktif) {
      return Response.json(
        { error: "QR Code ini sudah dinonaktifkan" },
        { status: 400 }
      )
    }

    if (qr.expired_at && new Date() > new Date(qr.expired_at)) {
      return Response.json(
        { error: "QR Code sudah kadaluarsa" },
        { status: 400 }
      )
    }

    const today = new Date().toISOString().split("T")[0]

    // 🔁 cek sudah absen (untuk tanggal hari ini)
    const { data: existing } = await supabase
      .from("absensi")
      .select("*")
      .eq("user_id", user_id)
      .eq("tanggal", today)
      .maybeSingle()

    if (existing) {
      return Response.json(
        { error: "Anda sudah melakukan absensi hari ini" },
        { status: 400 }
      )
    }

    // Format waktu ke HH:mm:ss (Postgres TIME format)
    const now = new Date()
    const waktu = [
      now.getHours().toString().padStart(2, "0"),
      now.getMinutes().toString().padStart(2, "0"),
      now.getSeconds().toString().padStart(2, "0"),
    ].join(":")

    // Map "berhalangan" ke "haid" (sesuai ENUM database kita)
    const mappedStatus = status === "berhalangan" ? "haid" : "hadir"

    // ✅ insert absensi
    const { data: insertedData, error: insertError } = await supabase
      .from("absensi")
      .insert([
        {
          user_id: user_id,
          tanggal: today,
          waktu,
          status: mappedStatus,
          panitia_id: qr.panitia_id,
        },
      ])
      .select(`
        *,
        users (
          nama
        )
      `)
      .single()

    if (insertError) {
      console.error("Insert Absensi Error:", insertError)
      throw new Error("Gagal menyimpan data absensi")
    }

    // 🔒 Nonaktifkan QR setelah digunakan (1 kali scan saja)
    await supabase
      .from("qr_token")
      .update({ aktif: false })
      .eq("id", qr.id)

    return Response.json({
      success: true,
      message: "Absensi berhasil dicatat",
      nama: insertedData?.users?.nama || "Siswa",
    })
  } catch (err: unknown) {
    console.error("Scan QR Route Error:", err)
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan server"
    return Response.json({ error: msg }, { status: 500 })
  }
}
