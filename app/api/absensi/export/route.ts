/**
 * app/api/absensi/export/route.ts
 * Next.js 13+ App Router API Route
 * GET /api/absensi/export?kelas=X-TL-A&tahun=2025/2026
 */

import { NextRequest, NextResponse } from "next/server"
import { exportAbsensiExcel } from "@/lib/exportAbsensi"
import type {
  UserRecord,
  AbsensiRecord,
  ExportConfig,
} from "@/lib/exportAbsensi"
import fs from "fs"
import path from "path"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const kelas = searchParams.get("kelas") ?? "X TEKNIK LOGISTIK (TL) - A"
    const tahun = searchParams.get("tahun") ?? "2025/2026"

    // ── Fetch data from your DB/service here ──
    // This is example data — replace with your actual data source
    const users: UserRecord[] = await fetchUsersFromDB(kelas)
    const absensi: AbsensiRecord[] = await fetchAbsensiFromDB(kelas)

    // ── Optional: load logo from public folder ──
    let logoBase64: string | undefined
    try {
      const logoPath = path.join(process.cwd(), "public", "logo-sekolah.png")
      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath)
        logoBase64 = logoBuffer.toString("base64")
      }
    } catch (_) {
      // Logo is optional
    }

    const config: ExportConfig = {
      namaInstansi: "PEMERINTAH PROVINSI JAWA TIMUR",
      dinas: "DINAS PENDIDIKAN",
      namaSekolah: "SMK NEGERI 4 KOTA MALANG",
      alamat:
        "Jalan Tanimbar Nomor 22, Kasin, Klojen, Malang, Jawa Timur 65117",
      telepon:
        "Telepon (0341) 353798, Faksimile (0341) 363099, Laman www.smkn4malang.sch.id, Pos-el mail@smkn4malang.sch.id",
      kelas,
      tahunPelajaran: tahun,
      waliKelas: "Oktavia Eko Susanti, S.Pd.",
      nipWaliKelas: "19781005 201001 2 014",
      kota: "Malang",
      logoBase64,
    }

    const buffer = await exportAbsensiExcel(users, absensi, config)

    const filename = `Daftar_Hadir_${kelas.replace(/\s+/g, "_")}_${tahun.replace("/", "-")}.xlsx`

    return new NextResponse(buffer, {
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
    return NextResponse.json({ error: "Export gagal" }, { status: 500 })
  }
}

// ── Placeholder DB functions — replace with your actual implementation ──
async function fetchUsersFromDB(_kelas: string): Promise<UserRecord[]> {
  // Example: return await prisma.user.findMany({ where: { kelas: _kelas } })
  return []
}

async function fetchAbsensiFromDB(_kelas: string): Promise<AbsensiRecord[]> {
  // Example: return await prisma.absensi.findMany({ where: { kelas: _kelas } })
  return []
}
