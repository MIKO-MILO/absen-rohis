import { supabase } from "@/lib/supabaseClient"
import { getGlobalConfig } from "@/lib/server-config"
import { isWithinTimeRestriction } from "@/lib/client-config"
import {
  requireAdminSession,
  requireAuthenticatedSession,
} from "@/lib/auth-server"

function isValidDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

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
    const { token, status, user_id, qr_token, tanggal } = body

    // Ambil config global dari DB
    const config = await getGlobalConfig()

    // Flag untuk update manual oleh admin
    const isAdminUpdate = qr_token === "MANUAL_UPDATE"
    const targetUserId = Number(user_id)
    let adminSessionId: number | null = null

    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      return Response.json({ error: "User ID tidak valid" }, { status: 400 })
    }

    if (isAdminUpdate) {
      // Update manual hanya boleh dilakukan oleh admin yang sudah terautentikasi.
      // ID admin selalu diambil dari sesi server, bukan dari request client.
      const adminSession = await requireAdminSession()
      if (!isValidDate(tanggal)) {
        return Response.json(
          { error: "Tanggal absensi tidak valid" },
          { status: 400 }
        )
      }
      if (
        status !== "hadir" &&
        status !== "berhalangan" &&
        status !== "tidak_hadir"
      ) {
        return Response.json({ error: "Status tidak valid" }, { status: 400 })
      }

      // Simpan nilai tepercaya untuk dipakai saat insert atau update.
      adminSessionId = adminSession.id
    } else {
      const session = await requireAuthenticatedSession()
      if (session.role !== "siswa" || session.id !== targetUserId) {
        return Response.json({ error: "Forbidden" }, { status: 403 })
      }
      if (!token || (status !== "hadir" && status !== "berhalangan")) {
        return Response.json(
          { error: "Token atau status tidak valid" },
          { status: 400 }
        )
      }
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
    } else if (token === "ROHIS-DZUHUR-SIMULASI-TOKEN") {
      if (!config.ENABLE_SIMULATION) {
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
        .eq("token", token)
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
    if (!isAdminUpdate && !isWithinTimeRestriction(now, config)) {
      const day = now.getDay()
      const hour = now.getHours()

      if (!config.ALLOW_ANY_DAY && day !== 5) {
        return Response.json(
          { error: "Absensi hanya tersedia di hari Jumat" },
          { status: 403 }
        )
      }

      if (!config.ALLOW_ANY_TIME && (hour < 12 || hour >= 14)) {
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
    const mappedStatus =
      status === "berhalangan"
        ? "haid"
        : status === "tidak_hadir"
          ? "tidak_hadir"
          : "hadir"

    // 🔍 Cek apakah sudah ada data absensi untuk user ini di tanggal tersebut
    const { data: existingAbsensi } = await supabase
      .from("absensi")
      .select("id")
      .eq("user_id", targetUserId)
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
        updatePayload.admin_id = adminSessionId
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
        user_id: targetUserId,
        tanggal: targetDate,
        waktu,
        status: mappedStatus,
        panitia_id: qr.panitia_id,
      }

      // Jika admin yang merubah, tambahkan admin_id
      if (isAdminUpdate) {
        insertPayload.admin_id = adminSessionId
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
    if (err instanceof Error && err.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (err instanceof Error && err.message === "Forbidden") {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }
    console.error("Scan QR Route Error:", err)
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan server"
    return Response.json({ error: msg }, { status: 500 })
  }
}
