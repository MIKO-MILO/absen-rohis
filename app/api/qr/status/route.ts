import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabaseServer"
import { getSession, requireRole } from "@/lib/auth-server"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const idRaw = searchParams.get("id")
    const id = Number(idRaw)

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 })
    }

    await requireRole(["admin", "superadmin", "panitia"] as const)
    const session = await getSession()

    const serviceSupabase = await createServiceClient()
    const { data, error } = await serviceSupabase
      .from("qr_token")
      .select("id, aktif, expired_at, panitia_id, created_at")
      .eq("id", id)
      .maybeSingle()

    if (error) throw error

    if (!data) {
      console.warn(`[QR STATUS] QR id=${id} tidak ditemukan di database`)
      return NextResponse.json(
        { error: "QR tidak ditemukan", aktif: false, used: true },
        { status: 404 }
      )
    }

    if (
      session?.role === "panitia" &&
      data.panitia_id !== null &&
      data.panitia_id !== undefined &&
      Number(data.panitia_id) !== Number(session.id)
    ) {
      console.warn(
        `[QR STATUS] Panitia id=${session?.id} mencoba akses QR id=${id} milik panitia id=${data.panitia_id}`
      )
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const aktifDB = data.aktif ?? false
    let absensiCount = 0
    let absensiCountTodayByPanitia = 0
    const qrCreatedAt = data.created_at ? new Date(data.created_at) : null

    // Fallback utama: hitung absensi yang dibuat SETELAH QR ini dibuat oleh panitia yang sama
    if (
      data.panitia_id !== null &&
      data.panitia_id !== undefined &&
      qrCreatedAt &&
      !Number.isNaN(qrCreatedAt.getTime())
    ) {
      const { count, error: cntErr } = await serviceSupabase
        .from("absensi")
        .select("*", { count: "exact", head: true })
        .eq("panitia_id", Number(data.panitia_id))
        .gte("created_at", new Date(qrCreatedAt.getTime() - 1000).toISOString())

      if (!cntErr && count !== null) absensiCount = count
      console.log(
        `[QR STATUS] Absensi count after QR created_at (${qrCreatedAt.toISOString()}) oleh panitia_id=${
          data.panitia_id
        }: ${absensiCount}`
      )

      // Fallback KEDUA: total absensi panitia tsb HARI INI.
      // ⚠️ JANGAN pakai ini sebagai penentu `used_by_absensi` (akan false-positive
      //    jika panitia generate QR KEDUA di hari yg sama). Cukup untuk logging debug.
      const todayStr = new Date().toISOString().split("T")[0]
      const { count: cntToday, error: cntTodayErr } = await serviceSupabase
        .from("absensi")
        .select("*", { count: "exact", head: true })
        .eq("panitia_id", Number(data.panitia_id))
        .eq("tanggal", todayStr)

      if (!cntTodayErr && cntToday !== null)
        absensiCountTodayByPanitia = cntToday
      console.log(
        `[QR STATUS] Absensi panitia_id=${data.panitia_id} HARI INI (${todayStr}): ${absensiCountTodayByPanitia}  (hanya untuk debug, TIDAK jadi trigger)`
      )
    }

    // ✅ HANYA `absensiCount` (per-QR) yang dijadikan acuan — TIDAK menggunakan total_today
    const isUsed = absensiCount > 0
    const aktifFinal = aktifDB && !isUsed

    console.log(
      `[QR STATUS] id=${id}  panitia_id=${String(
        data.panitia_id
      )}  db.aktif=${JSON.stringify(aktifDB)}  absensiCountAfterQR=${absensiCount}  absensiCountToday=${absensiCountTodayByPanitia}  → aktifFinal=${aktifFinal}`
    )

    return NextResponse.json({
      id: data.id,
      aktif: aktifFinal,
      db_aktif: aktifDB,
      used_by_absensi: isUsed,
      absensi_count_after_qr: absensiCount,
      absensi_count_today: absensiCountTodayByPanitia,
      expired_at: data.expired_at,
      created_at: data.created_at,
    })
  } catch (error) {
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("QR status error:", error)
    return NextResponse.json(
      { error: "Gagal memeriksa status QR", aktif: false },
      { status: 500 }
    )
  }
}
