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

  interface AbsensiPayload {
    user_id?: string | number
    tanggal?: string
    waktu: string
    status: string
    panitia_id?: string | number | null
    admin_id?: string | number | null
  }

  try {
    const body = await req.json()
    const { token, status, user_id, qr_token, tanggal, admin_id } = body // token, status (hadir/berhalangan), user_id dari session

    // Flag untuk update manual oleh admin
    const isAdminUpdate = qr_token === "MANUAL_UPDATE"
    const cleanToken = token?.replace("ROHIS-DZUHUR-", "") || ""

    if (!isAdminUpdate && (!token || !user_id)) {
      return Response.json(
        { error: "Token atau User ID kosong" },
        { status: 400 }
      )
    }

    let qr: QRToken

    if (isAdminUpdate) {
      // 🛠️ Bypass untuk update manual oleh admin
      qr = {
        id: "admin-update",
        aktif: true,
        panitia_id: null,
        is_simulation: true,
      }
    } else if (cleanToken === "SIMULASI-TOKEN") {
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
    if (!isAdminUpdate && !isWithinTimeRestriction(now)) {
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

    const targetDate =
      isAdminUpdate && tanggal ? tanggal : now.toISOString().split("T")[0]

    // Format waktu ke HH:mm:ss (Postgres TIME format)
    const waktu = [
      now.getHours().toString().padStart(2, "0"),
      now.getMinutes().toString().padStart(2, "0"),
      now.getSeconds().toString().padStart(2, "0"),
    ].join(":")

    // Map "berhalangan" ke "haid" (sesuai ENUM database kita)
    const mappedStatus = status === "berhalangan" ? "haid" : "hadir"

    // 🔍 Cek apakah sudah ada data absensi untuk user ini di tanggal tersebut
    const { data: existingAbsensi } = await supabase
      .from("absensi")
      .select("id")
      .eq("user_id", user_id)
      .eq("tanggal", targetDate)
      .maybeSingle()

    let resultData, resultError

    if (existingAbsensi) {
      // 📝 Jika sudah ada, lakukan UPDATE
      const updatePayload: AbsensiPayload = {
        waktu,
        status: mappedStatus,
      }

      // Jika admin yang merubah, tambahkan admin_id
      if (isAdminUpdate) {
        updatePayload.admin_id = admin_id
        // Jangan merubah panitia_id jika sudah ada (sesuai request user)
      } else {
        // Jika scan normal, update panitia_id dari QR
        updatePayload.panitia_id = qr.panitia_id
      }

      const { data: updateData, error: updateError } = await supabase
        .from("absensi")
        .update(updatePayload)
        .eq("id", existingAbsensi.id)
        .select(
          `
          *,
          users (
            nama
          )
        `
        )
        .single()
      resultData = updateData
      resultError = updateError
    } else {
      // ➕ Jika belum ada, lakukan INSERT
      const insertPayload: AbsensiPayload = {
        user_id: user_id,
        tanggal: targetDate,
        waktu,
        status: mappedStatus,
        panitia_id: qr.panitia_id,
      }

      // Jika admin yang merubah, tambahkan admin_id
      if (isAdminUpdate) {
        insertPayload.admin_id = admin_id
      }

      const { data: insertData, error: insertError } = await supabase
        .from("absensi")
        .insert([insertPayload])
        .select(
          `
          *,
          users (
            nama
          )
        `
        )
        .single()
      resultData = insertData
      resultError = insertError
    }

    if (resultError) {
      console.error("Database Operation Error:", resultError)
      throw new Error(`Gagal menyimpan data: ${resultError.message}`)
    }

    const finalData = resultData as AbsensiInsertResponse

    // 🔒 Nonaktifkan QR setelah digunakan (1 orang 1 QR)
    if (!qr.is_simulation) {
      await supabase.from("qr_token").update({ aktif: false }).eq("id", qr.id)
    }

    return Response.json({
      success: true,
      message: "Absensi berhasil dicatat",
      nama: finalData?.users?.nama || "Siswa",
    })
  } catch (err: unknown) {
    console.error("Scan QR Route Error:", err)
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan server"
    return Response.json({ error: msg }, { status: 500 })
  }
}
