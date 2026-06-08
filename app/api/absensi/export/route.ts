/**
 * app/api/absensi/export/route.ts
 * Next.js 13+ App Router API Route
 * GET /api/absensi/export?kelas=X-TL-A&tahun=2025/2026&semua_kelas=true
 */

import { NextRequest, NextResponse } from "next/server"
import { exportAbsensiExcel, exportAllClassesExcel } from "@/lib/exportAbsensi"
import type {
  UserRecord,
  AbsensiRecord,
  ExportConfig,
} from "@/lib/exportAbsensi"
import fs from "fs"
import path from "path"
import sharp from "sharp"
import { supabase } from "../../../../lib/supabaseClient"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const kelas = searchParams.get("kelas") ?? "X TEKNIK LOGISTIK (TL) - A"
    const tahun = searchParams.get("tahun") ?? "2025/2026"
    const bulan = searchParams.get("bulan")
      ? Number(searchParams.get("bulan"))
      : undefined
    const tahunBulan = searchParams.get("tahun_bulan")
      ? Number(searchParams.get("tahun_bulan"))
      : undefined
    const semuaKelas = searchParams.get("semua_kelas") === "true"
    const exportAllDates = searchParams.get("export_all_dates") === "true"

    console.log(
      "[export-absensi] Starting export for kelas:",
      kelas,
      "bulan:",
      bulan,
      "tahun:",
      tahunBulan,
      "semua_kelas:",
      semuaKelas,
      "export_all_dates:",
      exportAllDates
    )

    // ── Optional: load logos from public folder ──
    let leftLogoBase64: string | undefined
    let leftLogoWidth: number | undefined
    let leftLogoHeight: number | undefined
    let rightLogoBase64: string | undefined
    let rightLogoWidth: number | undefined
    let rightLogoHeight: number | undefined
    try {
      const leftLogoPath = path.join(
        process.cwd(),
        "public",
        "images",
        "LOGO GRAFIKA.png"
      )
      if (fs.existsSync(leftLogoPath)) {
        const leftLogoBuffer = fs.readFileSync(leftLogoPath)
        leftLogoBase64 = leftLogoBuffer.toString("base64")
        const leftMeta = await sharp(leftLogoBuffer).metadata()
        leftLogoWidth = leftMeta.width
        leftLogoHeight = leftMeta.height
      }
      const rightLogoPath = path.join(
        process.cwd(),
        "public",
        "images",
        "LOGO ROHIS.png"
      )
      if (fs.existsSync(rightLogoPath)) {
        const rightLogoBuffer = fs.readFileSync(rightLogoPath)
        rightLogoBase64 = rightLogoBuffer.toString("base64")
        const rightMeta = await sharp(rightLogoBuffer).metadata()
        rightLogoWidth = rightMeta.width
        rightLogoHeight = rightMeta.height
      }
    } catch {
      // Logos are optional
    }

    const baseConfig: Omit<ExportConfig, "kelas"> = {
      namaInstansi: "PEMERINTAH PROVINSI JAWA TIMUR",
      dinas: "DINAS PENDIDIKAN",
      namaSekolah: "SMK NEGERI 4 KOTA MALANG",
      alamat:
        "Jalan Tanimbar Nomor 22, Kasin, Klojen, Malang, Jawa Timur 65117",
      telepon:
        "Telepon (0341) 353798, Faksimile (0341) 363099, Laman www.smkn4malang.sch.id, Pos-el mail@smkn4malang.sch.id",
      tahunPelajaran: tahun,
      waliKelas: "Oktavia Eko Susanti, S.Pd.",
      nipWaliKelas: "19781005 201001 2 014",
      kota: "Malang",
      leftLogoBase64,
      leftLogoWidth,
      leftLogoHeight,
      rightLogoBase64,
      rightLogoWidth,
      rightLogoHeight,
      bulan,
      tahunBulan,
      exportAllDates,
    }

    let buffer: Buffer

    // Cek semua kelas yang ada di database
    const { data: allUsersTest } = await supabase
      .from("users")
      .select("id, nama, kelas, nis")
    const uniqueClassesTest = [
      ...new Set((allUsersTest || []).map((u: any) => u.kelas)), // eslint-disable-line
    ]
    console.log("[export-absensi] All classes in DB:", uniqueClassesTest)
    console.log("[export-absensi] Searching for class:", kelas)

    if (semuaKelas) {
      // Export semua kelas di sheet yang berbeda
      const allClassesData = await fetchAllClassesData(bulan, tahunBulan)
      buffer = await exportAllClassesExcel(allClassesData, baseConfig)
    } else {
      // Export satu kelas saja
      const [usersData, absensiData] = await Promise.all([
        fetchUsersByClass(kelas),
        fetchAbsensiByClass(kelas, bulan, tahunBulan),
      ])

      console.log("[export-absensi] Users fetched:", usersData.length)
      console.log("[export-absensi] Absensi fetched:", absensiData.length)

      buffer = await exportAbsensiExcel(usersData, absensiData, {
        ...baseConfig,
        kelas,
      })
    }

    console.log("[export-absensi] Excel generated successfully")

    const filename = semuaKelas
      ? `Daftar_Hadir_Semua_Kelas_${tahun.replace("/", "-")}.xlsx`
      : `Daftar_Hadir_${kelas.replace(/\s+/g, "_")}_${tahun.replace("/", "-")}.xlsx`

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        "Content-Length": buffer.length.toString(),
      },
    })
  } catch (err) {
    console.error("[export-absensi] Error:", err)
    return NextResponse.json(
      {
        error: "Export gagal",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    )
  }
}

// ── Fetch functions ──
async function fetchUsersByClass(kelas: string): Promise<UserRecord[]> {
  console.log("[export-absensi] Fetching users for class:", kelas)
  const { data, error } = await supabase
    .from("users")
    .select("id, nama, kelas, nis, jenis_kelamin")
    .eq("kelas", kelas)

  if (error) {
    console.error("[export-absensi] Error fetching users:", error)
    throw error
  }
  console.log("[export-absensi] Users found:", data?.length || 0)
  return data || []
}

async function fetchAbsensiByClass(
  kelas: string,
  bulan?: number,
  tahunBulan?: number
): Promise<AbsensiRecord[]> {
  let query = supabase
    .from("absensi")
    .select(
      `
      id,
      user_id,
      status,
      tanggal,
      waktu,
      users (
        nama,
        nis,
        kelas,
        jenis_kelamin
      )
    `
    )
    .eq("users.kelas", kelas)

  // Filter absensi sesuai bulan dan tahun jika ditentukan
  if (bulan && tahunBulan) {
    const firstDay = `${tahunBulan}-${String(bulan).padStart(2, "0")}-01`
    const lastDay = new Date(tahunBulan, bulan, 0).toISOString().split("T")[0]
    query = query.gte("tanggal", firstDay).lte("tanggal", lastDay)
  }

  const { data, error } = await query

  if (error) {
    console.error("Supabase error:", error)
    return []
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || ([] as any[])).map((item: any) => ({
    user_id: item.user_id,
    status: item.status,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    nis: (item.users as any)?.nis || "",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    nama: (item.users as any)?.nama || "",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jenis_kelamin: (item.users as any)?.jenis_kelamin || "L",
    waktu: item.waktu || "",
    tanggal: item.tanggal || "",
  }))
}

async function fetchAllClassesData(
  bulan?: number,
  tahunBulan?: number
): Promise<{ kelas: string; users: UserRecord[]; absensi: AbsensiRecord[] }[]> {
  // Dapatkan semua kelas unik
  const { data: allUsers, error: usersError } = await supabase
    .from("users")
    .select("id, nama, kelas, nis, jenis_kelamin")

  if (usersError) throw usersError

  // Dapatkan semua kelas unik
  const uniqueClasses = [
    ...new Set((allUsers || []).map((u: UserRecord) => u.kelas)),
  ].sort()

  // Ambil semua absensi
  let absensiQuery = supabase.from("absensi").select(`
      id,
      user_id,
      status,
      tanggal,
      waktu,
      users (
        nama,
        nis,
        kelas,
        jenis_kelamin
      )
    `)

  // Filter absensi sesuai bulan dan tahun jika ditentukan
  if (bulan && tahunBulan) {
    const firstDay = `${tahunBulan}-${String(bulan).padStart(2, "0")}-01`
    const lastDay = new Date(tahunBulan, bulan, 0).toISOString().split("T")[0]
    absensiQuery = absensiQuery.gte("tanggal", firstDay).lte("tanggal", lastDay)
  }

  const { data: allAbsensi, error: absensiError } = await absensiQuery

  if (absensiError) {
    console.error("Supabase absensi error:", absensiError)
  }

  // Kelompokkan users dan absensi per kelas
  const result: {
    kelas: string
    users: UserRecord[]
    absensi: AbsensiRecord[]
  }[] = []

  for (const kelas of uniqueClasses) {
    const classUsers = (allUsers || []).filter(
      (u: UserRecord) => u.kelas === kelas
    )
    // eslint-disable-next-line
    const classAbsensi = (allAbsensi || ([] as any[]))
      // eslint-disable-next-line
      .filter((item: any) => item.users?.kelas === kelas)
      // eslint-disable-next-line
      .map((item: any) => ({
        user_id: item.user_id,
        status: item.status,
        // eslint-disable-next-line
        nis: (item.users as any)?.nis || "",
        // eslint-disable-next-line
        nama: (item.users as any)?.nama || "",
        // eslint-disable-next-line
        jenis_kelamin: (item.users as any)?.jenis_kelamin || "L",
        waktu: item.waktu || "",
        tanggal: item.tanggal || "",
      }))

    result.push({
      kelas,
      users: classUsers,
      absensi: classAbsensi,
    })
  }

  return result
}
