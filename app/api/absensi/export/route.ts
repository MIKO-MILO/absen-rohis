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
import { createClient } from "@/lib/supabaseServer"
import { requireAdminSession } from "@/lib/auth-server"
import type { AbsensiWithUserSummary } from "@/lib/supabase-types"

export async function GET(req: NextRequest) {
  try {
    await requireAdminSession()
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

    const supabase = await createClient()

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

    if (semuaKelas) {
      const allClassesData = await fetchAllClassesData(
        bulan,
        tahunBulan,
        supabase
      )
      buffer = await exportAllClassesExcel(allClassesData, baseConfig)
    } else {
      const [usersData, absensiData] = await Promise.all([
        fetchUsersByClass(kelas, supabase),
        fetchAbsensiByClass(kelas, bulan, tahunBulan, supabase),
      ])
      buffer = await exportAbsensiExcel(usersData, absensiData, {
        ...baseConfig,
        kelas,
      })
    }

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
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    console.error("[export-absensi] Error:", error)
    return NextResponse.json(
      {
        error: "Export gagal",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

async function fetchUsersByClass(
  kelas: string,
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never
): Promise<UserRecord[]> {
  const { data, error } = await supabase
    .from("users")
    .select("id, nama, kelas, nis, jenis_kelamin")
    .eq("kelas", kelas)

  if (error) {
    console.error("[export-absensi] Error fetching users:", error)
    throw error
  }

  const typedData = data as Array<UserRecord>

  return typedData ?? []
}

async function fetchAbsensiByClass(
  kelas: string,
  bulan?: number,
  tahunBulan?: number,
  supabase?: ReturnType<typeof createClient> extends Promise<infer T>
    ? T
    : never
): Promise<AbsensiRecord[]> {
  if (!supabase) return []

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

  const typedData = data as unknown as Array<AbsensiWithUserSummary>

  return typedData.map((item) => ({
    user_id: item.user_id,
    status: item.status,
    nis: item.users[0]?.nis ?? "",
    nama: item.users[0]?.nama ?? "",
    jenis_kelamin: item.users[0]?.jenis_kelamin ?? "L",
    waktu: item.waktu ?? "",
    tanggal: item.tanggal ?? "",
  }))
}

async function fetchAllClassesData(
  bulan?: number,
  tahunBulan?: number,
  supabase?: ReturnType<typeof createClient> extends Promise<infer T>
    ? T
    : never
): Promise<{ kelas: string; users: UserRecord[]; absensi: AbsensiRecord[] }[]> {
  if (!supabase) return []

  const { data: allUsers, error: usersError } = await supabase
    .from("users")
    .select("id, nama, kelas, nis, jenis_kelamin")

  if (usersError) throw usersError

  const typedAllUsers = allUsers as unknown as Array<UserRecord>

  const uniqueClasses = [
    ...new Set(typedAllUsers.map((u) => u.kelas as string)),
  ].sort()

  let absensiQuery = supabase.from("absensi").select(
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

  if (bulan && tahunBulan) {
    const firstDay = `${tahunBulan}-${String(bulan).padStart(2, "0")}-01`
    const lastDay = new Date(tahunBulan, bulan, 0).toISOString().split("T")[0]
    absensiQuery = absensiQuery.gte("tanggal", firstDay).lte("tanggal", lastDay)
  }

  const { data: allAbsensi, error: absensiError } = await absensiQuery

  if (absensiError) {
    console.error("Supabase absensi error:", absensiError)
  }

  const typedAllAbsensi = allAbsensi as unknown as Array<AbsensiWithUserSummary>

  const result: {
    kelas: string
    users: UserRecord[]
    absensi: AbsensiRecord[]
  }[] = []

  for (const k of uniqueClasses) {
    const classUsers = typedAllUsers.filter((u) => u.kelas === k)
    const classAbsensi = typedAllAbsensi
      .filter((item) => item.users[0]?.kelas === k)
      .map((item) => ({
        user_id: item.user_id,
        status: item.status,
        nis: item.users[0]?.nis ?? "",
        nama: item.users[0]?.nama ?? "",
        jenis_kelamin: item.users[0]?.jenis_kelamin ?? "L",
        waktu: item.waktu ?? "",
        tanggal: item.tanggal ?? "",
      }))

    result.push({ kelas: k, users: classUsers, absensi: classAbsensi })
  }

  return result
}
