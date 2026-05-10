import { supabase } from "@/lib/supabaseClient"
import { TEST_CONFIG, isWithinTimeRestriction } from "@/lib/test-config"

export async function POST(req: Request) {
  interface QRToken {
    id: string | number
    token?: string
    aktif: boolean
    panitia_id: string | number | null
    expired_at?: string
    is_simulation?: boolean
  }

  interface AbsensiInsertResponse {
    id: number
    users: {
      nama: string
    } | null
  }

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

    let qr: QRToken

    if (cleanToken === "SIMULASI-TOKEN") {
      if (!TEST_CONFIG.ENABLE_SIMULATION) {
        return Response.json(
          { error: "Mode simulasi sedang dinonaktifkan" },
          { status: 403 }
        )
      }

      // 🛠️ Bypass untuk mode simulasi pengembangan
      // Cari satu panitia ID yang ada di DB agar insert absensi tidak gagal (foreign key)
      const { data: dummyPanitia } = await supabase
        .from("panitia")
        .select("id")
        .limit(1)
        .maybeSingle()

      qr = {
        id: "simulasi",
        aktif: true,
        panitia_id: dummyPanitia?.id || null,
        is_simulation: true,
      }
    } else {
      // 🔍 cek QR asli di DB
      const { data, error: qrError } = await supabase
        .from("qr_token")
        .select("*")
        .eq("token", cleanToken)
        .maybeSingle()

      if (qrError || !data) {
        return Response.json(
          { error: "QR Code tidak valid atau sudah dihapus" },
          { status: 400 }
        )
      }
      qr = data
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

    // 🕒 Cek Batasan Waktu (Jumat 12:00 - 14:00)
    const now = new Date()
    if (!isWithinTimeRestriction(now)) {
      const day = now.getDay()
      const hour = now.getHours()

      if (day !== 5) {
        return Response.json(
          { error: "Absensi hanya tersedia di hari Jumat" },
          { status: 403 }
        )
      }

      if (hour < 12 || hour >= 14) {
        return Response.json(
          { error: "Absensi hanya tersedia pukul 12:00 - 14:00 WIB" },
          { status: 403 }
        )
      }
    }

    const today = now.toISOString().split("T")[0]

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
    const waktu = [
      now.getHours().toString().padStart(2, "0"),
      now.getMinutes().toString().padStart(2, "0"),
      now.getSeconds().toString().padStart(2, "0"),
    ].join(":")

    // Map "berhalangan" ke "haid" (sesuai ENUM database kita)
    const mappedStatus = status === "berhalangan" ? "haid" : "hadir"

    // ✅ insert absensi
    const { data, error: insertError } = await supabase
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
      .select(
        `
        *,
        users (
          nama
        )
      `
      )
      .single()

    if (insertError) {
      console.error("Insert Absensi Error:", insertError)
      throw new Error("Gagal menyimpan data absensi")
    }

    const insertedData = data as AbsensiInsertResponse

    // 🔒 Nonaktifkan QR setelah digunakan (1 kali scan saja)
    if (!qr.is_simulation && TEST_CONFIG.ENABLE_ONE_TIME_SCAN) {
      await supabase.from("qr_token").update({ aktif: false }).eq("id", qr.id)
    }

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
