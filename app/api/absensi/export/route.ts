import { NextRequest, NextResponse } from "next/server"
import { exportAbsensiExcel, exportAllClassesExcel } from "@/lib/exportAbsensi"
import type {
  UserRecord,
  AbsensiRecord,
  ExportConfig,
} from "@/lib/exportAbsensi"
import type { AbsensiWithUserSummary } from "@/lib/supabase-types"
import fs from "fs"
import path from "path"
import sharp from "sharp"
import { createClient } from "@/lib/supabaseServer"
import { requireAdminSession } from "@/lib/auth-server"
import { withRequestMetrics } from "@/lib/request-metrics"
import {
  checkRateLimitPreset,
  rateLimitErrorResponse,
} from "@/lib/rate-limit"
import {
  emergencyModeResponseIfActive,
  checkExportSafe,
  exportTooLargeResponse,
  circuitBreakerCheck,
  heavyEndpointBusyResponse,
  circuitBreakerReportFailure,
  withSlowQuerySampling,
  costGuardObserveRequest,
  isFeatureAllowed,
  getCostGuardStatus,
} from "@/lib/cost-guard"

const USER_FETCH_COLUMNS = "id, nama, kelas, nis, jenis_kelamin"
const ABSENSI_FETCH_COLUMNS = `
  id, user_id, status, tanggal, waktu, users (nama, nis, kelas, jenis_kelamin)
`
const LOGO_CACHE = new Map<
  string,
  { base64: string; width?: number; height?: number }
>()

async function getCachedLogo(
  key: "left" | "right",
  cwd: string
): Promise<{ base64: string; width?: number; height?: number } | undefined> {
  const cacheKey = `${cwd}:${key}`
  const cached = LOGO_CACHE.get(cacheKey)
  if (cached) return cached
  try {
    const fileName =
      key === "left" ? "LOGO GRAFIKA.png" : "LOGO ROHIS.png"
    const logoPath = path.join(cwd, "public", "images", fileName)
    if (!fs.existsSync(logoPath)) return undefined
    const buf = fs.readFileSync(logoPath)
    const base64 = buf.toString("base64")
    const meta = await sharp(buf).metadata()
    const width: number | undefined = meta.width
    const height: number | undefined = meta.height
    // Only call sharp once per logo (cache width/height)
    const result = { base64, width, height }
    LOGO_CACHE.set(cacheKey, result)
    return result
  } catch {
    return undefined
  }
}

export const GET = withRequestMetrics(async function GET(req: NextRequest) {
  costGuardObserveRequest(req)

  try {
    const emergencyResp = emergencyModeResponseIfActive(req)
    if (emergencyResp) return emergencyResp
    if (!isFeatureAllowed("export-large")) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Export data sementara tidak tersedia. Silakan coba beberapa saat lagi.",
        },
        { status: 503 }
      )
    }

    // ──────── Heavy endpoint rate limit & circuit breaker ────────
    const rl = await checkRateLimitPreset({
      req,
      scope: "sensitive",
      failClosed: true,
    })
    if (!rl.allowed) return rateLimitErrorResponse(rl.resetAt)

    const cb = circuitBreakerCheck("export-absensi")
    if (cb.open && cb.retryAt) {
      const retrySeconds = Math.max(
        5,
        Math.ceil((cb.retryAt.getTime() - Date.now()) / 1000)
      )
      return heavyEndpointBusyResponse(retrySeconds)
    }

    await requireAdminSession()
    const { searchParams } = new URL(req.url)
    const kelas =
      searchParams.get("kelas") ?? "X TEKNIK LOGISTIK (TL) - A"
    const tahun = searchParams.get("tahun") ?? "2025/2026"
    const bulan = searchParams.get("bulan")
      ? Number(searchParams.get("bulan"))
      : undefined
    const tahunBulan = searchParams.get("tahun_bulan")
      ? Number(searchParams.get("tahun_bulan"))
      : undefined
    const semuaKelas = searchParams.get("semua_kelas") === "true"
    const exportAllDates = searchParams.get("export_all_dates") === "true"

    // ──────── Export Safety Checks ────────
    let dateStart: Date | undefined
    let dateEnd: Date | undefined
    if (bulan && tahunBulan) {
      dateStart = new Date(tahunBulan, bulan - 1, 1)
      dateEnd = new Date(tahunBulan, bulan, 0, 23, 59, 59, 999)
    } else if (!exportAllDates) {
      // Default export: bulan sekarang (cap)
      const now = new Date()
      dateStart = new Date(now.getFullYear(), now.getMonth(), 1)
      dateEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    } else {
      // exportAllDates: tetap cap 90 hari default (safety)
      const now = new Date()
      dateEnd = now
      dateStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    }
    const safety = checkExportSafe({
      startDate: dateStart,
      endDate: dateEnd,
    })
    if (!safety.ok) {
      return exportTooLargeResponse(safety.message)
    }

    const supabase = await createClient()
    const cwd = process.cwd()

    const leftLogo = await getCachedLogo("left", cwd)
    const rightLogo = await getCachedLogo("right", cwd)

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
      leftLogoBase64: leftLogo?.base64,
      leftLogoWidth: leftLogo?.width,
      leftLogoHeight: leftLogo?.height,
      rightLogoBase64: rightLogo?.base64,
      rightLogoWidth: rightLogo?.width,
      rightLogoHeight: rightLogo?.height,
      bulan,
      tahunBulan,
      exportAllDates,
    }

    let buffer: Buffer
    try {
      if (semuaKelas) {
        const allClassesData = await withSlowQuerySampling(
          "absensi-export",
          "select",
          () => fetchAllClassesData(bulan, tahunBulan, supabase)
        )

        // Validate total absensi rows cap across all classes
        const totalRows = allClassesData.reduce(
          (s, c) => s + c.absensi.length,
          0
        )
        const rowSafety = checkExportSafe({ totalRows })
        if (!rowSafety.ok) return exportTooLargeResponse(rowSafety.message)

        const status = getCostGuardStatus()
        if (status === "protected" && allClassesData.length > 5) {
          return NextResponse.json(
            {
              success: false,
              message:
                "Export semua kelas sementara dibatasi selama proteksi aktif. Silakan export per kelas atau coba lagi nanti.",
            },
            { status: 503 }
          )
        }

        buffer = await withSlowQuerySampling(
          "absensi-export",
          "export",
          () => exportAllClassesExcel(allClassesData, baseConfig)
        )
      } else {
        // NOTE: Fix N+1 duplicate user fetch — fetch once, reuse.
        const usersData = await withSlowQuerySampling(
          "absensi-export",
          "select",
          () => fetchUsersByClass(kelas, supabase)
        )
        const absensiData = await withSlowQuerySampling(
          "absensi-export",
          "select",
          () =>
            fetchAbsensiByClass(
              kelas,
              bulan,
              tahunBulan,
              supabase,
              usersData
            )
        )

        const rowSafety = checkExportSafe({
          totalRows: absensiData.length,
        })
        if (!rowSafety.ok) return exportTooLargeResponse(rowSafety.message)

        buffer = await withSlowQuerySampling(
          "absensi-export",
          "export",
          () =>
            exportAbsensiExcel(usersData, absensiData, {
              ...baseConfig,
              kelas,
            })
        )
      }
    } catch (err) {
      circuitBreakerReportFailure("export-absensi")
      throw err
    }

    // Safety cap response buffer size: >10MB suggests something wrong
    if (buffer.length > 25 * 1024 * 1024) {
      return exportTooLargeResponse(
        `File hasil export terlalu besar (${Math.round(buffer.length / (1024 * 1024))}MB). Persempit filter tanggal atau pecah per kelas.`
      )
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
        "X-Cost-Guard-Status": getCostGuardStatus(),
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
        success: false,
        error: "Export gagal",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
})

async function fetchUsersByClass(
  kelas: string,
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never
): Promise<UserRecord[]> {
  const { data, error } = await supabase
    .from("users")
    .select(USER_FETCH_COLUMNS)
    .eq("kelas", kelas)

  if (error) {
    console.error("[export-absensi] Error fetching users:", error)
    throw error
  }

  return (data as Array<UserRecord>) ?? []
}

async function fetchAbsensiByClass(
  kelas: string,
  bulan: number | undefined,
  tahunBulan: number | undefined,
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  // Accept already-fetched users to avoid duplicate queries (fix N+1)
  prefetchedUsers?: UserRecord[]
): Promise<AbsensiRecord[]> {
  if (!supabase) return []

  const users = prefetchedUsers ?? (await fetchUsersByClass(kelas, supabase))
  const userIds = users.map((u) => u.id)
  if (userIds.length === 0) return []

  let query = supabase
    .from("absensi")
    .select(ABSENSI_FETCH_COLUMNS)
    .in("user_id", userIds)

  if (bulan && tahunBulan) {
    const firstDay = `${tahunBulan}-${String(bulan).padStart(2, "0")}-01`
    const lastDay = new Date(tahunBulan, bulan, 0)
      .toISOString()
      .split("T")[0]
    query = query.gte("tanggal", firstDay).lte("tanggal", lastDay)
  }

  const { data, error } = await query

  if (error) {
    console.error("Supabase error:", error)
    return []
  }

  const typedData = data as unknown as Array<AbsensiWithUserSummary>

  return typedData
    .filter((item) => item.users)
    .map((item) => {
      const userData = Array.isArray(item.users)
        ? item.users[0]
        : item.users
      return {
        user_id: item.user_id,
        status: item.status,
        nis: userData?.nis ?? "",
        nama: userData?.nama ?? "",
        jenis_kelamin: userData?.jenis_kelamin ?? "L",
        waktu: item.waktu ?? "",
        tanggal: item.tanggal ?? "",
        kelas: userData?.kelas ?? "",
      }
    })
}

async function fetchAllClassesData(
  bulan: number | undefined,
  tahunBulan: number | undefined,
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never
): Promise<{ kelas: string; users: UserRecord[]; absensi: AbsensiRecord[] }[]> {
  if (!supabase) return []

  const { data: allUsers, error: usersError } = await supabase
    .from("users")
    .select(USER_FETCH_COLUMNS)

  if (usersError) throw usersError

  const typedAllUsers = allUsers as unknown as Array<UserRecord>

  const uniqueClasses = [
    ...new Set(typedAllUsers.map((u) => u.kelas as string)),
  ].sort()

  let absensiQuery = supabase
    .from("absensi")
    .select(ABSENSI_FETCH_COLUMNS)

  if (bulan && tahunBulan) {
    const firstDay = `${tahunBulan}-${String(bulan).padStart(2, "0")}-01`
    const lastDay = new Date(tahunBulan, bulan, 0)
      .toISOString()
      .split("T")[0]
    absensiQuery = absensiQuery.gte("tanggal", firstDay).lte("tanggal", lastDay)
  } else {
    // Jika tanpa filter tanggal exportAllDates, cap 90 hari BACK dari hari ini.
    const threshold = new Date()
    threshold.setDate(threshold.getDate() - 90)
    absensiQuery = absensiQuery.gte(
      "tanggal",
      threshold.toISOString().split("T")[0]
    )
  }

  const { data: allAbsensi, error: absensiError } = await absensiQuery
  if (absensiError) {
    console.error("Supabase absensi error:", absensiError)
  }

  const typedAllAbsensi = allAbsensi as unknown as Array<AbsensiWithUserSummary>

  // Index absensi by user_id for fast lookup
  const absensiByUserIdMap = new Map<
    string | number,
    Array<(typeof typedAllAbsensi)[number]>
  >()
  for (const row of typedAllAbsensi ?? []) {
    const list = absensiByUserIdMap.get(row.user_id) ?? []
    list.push(row)
    absensiByUserIdMap.set(row.user_id, list)
  }
  void absensiByUserIdMap

  const result: {
    kelas: string
    users: UserRecord[]
    absensi: AbsensiRecord[]
  }[] = []

  for (const k of uniqueClasses) {
    const classUsers = typedAllUsers.filter((u) => u.kelas === k)
    const userIdsInClass = new Set(classUsers.map((u) => u.id))
    const classAbsensi: AbsensiRecord[] = []
    for (const item of typedAllAbsensi ?? []) {
      if (!userIdsInClass.has(item.user_id)) continue
      if (!item.users) continue
      const userData = Array.isArray(item.users) ? item.users[0] : item.users
      classAbsensi.push({
        user_id: item.user_id,
        status: item.status,
        nis: userData?.nis ?? "",
        nama: userData?.nama ?? "",
        jenis_kelamin: userData?.jenis_kelamin ?? "L",
        waktu: item.waktu ?? "",
        tanggal: item.tanggal ?? "",
      })
    }
    result.push({ kelas: k, users: classUsers, absensi: classAbsensi })
  }

  return result
}
