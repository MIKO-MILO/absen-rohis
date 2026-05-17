/**
 * lib/exportAbsensi.ts
 * Export Daftar Hadir Siswa — ExcelJS + Next.js + TypeScript
 * Layout: Format administrasi sekolah Indonesia, siap print portrait F4
 *
 * Struktur kolom (mengikuti file XLSX asli):
 *   A=NO  B=NAMA  C=L/P  D=NIS1  E="/"  F=NIS2  G="."  H=NIS3
 *   I..?=kehadiran (dinamis)  ?=S  ?=I  ?=A
 *
 * NIS ditampilkan sebagai: 25335 / 00506 . 0242
 * Contoh NIS "2533500506.0242" → split dengan pemisah "/" dan "."
 */

import ExcelJS from "exceljs"
import { TEST_CONFIG } from "./test-config"

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface UserRecord {
  id: number
  nama: string
  kelas: string
  nis: string
  jenis_kelamin?: string
}

export interface AbsensiRecord {
  user_id: number
  status: string // hadir | izin | sakit | alpha
  nis: string
  nama: string
  jenis_kelamin: string
  waktu: string
  tanggal: string // YYYY-MM-DD
}

export interface ExportConfig {
  namaSekolah: string
  namaInstansi: string
  dinas: string
  alamat: string
  telepon: string
  kelas: string
  tahunPelajaran: string
  waliKelas: string
  nipWaliKelas: string
  kota: string
  leftLogoBase64?: string
  leftLogoWidth?: number
  leftLogoHeight?: number
  rightLogoBase64?: string
  rightLogoWidth?: number
  rightLogoHeight?: number
  bulan?: number
  tahunBulan?: number
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const STATUS_MAP: Record<string, string> = {
  hadir: "H",
  Hadir: "H",
  H: "H",
  haid: "I",
  Haid: "I",
  izin: "I",
  Izin: "I",
  I: "I",
  tidak_hadir: "A",
  "tidak hadir": "A",
  "Tidak Hadir": "A",
  sakit: "A",
  Sakit: "A",
  alpha: "A",
  Alpha: "A",
  alfa: "A",
  Alfa: "A",
  A: "A",
}

/**
 * Kolom layout (1-based, mirip kode XLSX asli yang 0-based tapi +1):
 *
 *  1=NO  2=NAMA  3=L/P  4=NIS1  5="/"  6=NIS2  7="."  8=NIS3
 *  9..9+n-1 = kehadiran per tanggal
 *  9+n = S, 9+n+1 = I, 9+n+2 = A
 */
const COL = {
  NO: 1,
  NAMA: 2,
  LP: 3,
  NIS1: 4, // bagian pertama NIS (misal: 25335)
  SEP1: 5, // "/"
  NIS2: 6, // bagian kedua  (misal: 00506)
  SEP2: 7, // "."
  NIS3: 8, // bagian ketiga (misal: 0242)
  ABS: 9, // kolom pertama kehadiran (dinamis)
} as const

// Lebar kolom (Excel units) — diambil dari ws["!cols"] kode asli
const COL_W = {
  NO: 4.0,
  NAMA: 42.9,
  LP: 4.1,
  NIS1: 6.7,
  SEP1: 2.0,
  NIS2: 6.7,
  SEP2: 1.4,
  NIS3: 5.7,
  ABS: 4.7,
  S: 4.3,
  I: 4.3,
  A: 4.3,
}

const ROW_H = {
  KOP: 16,
  NAMA_SEKOLAH: 22,
  ALAMAT: 13,
  JUDUL: 16,
  TH1: 20, // table header row 1
  TH2: 18, // table header row 2 (hari)
  TH3: 14, // table header row 3 (tanggal)
  DATA: 15,
  FOOTER: 14,
  BLANK: 10,
}

// ─────────────────────────────────────────────
// NIS parser
// ─────────────────────────────────────────────

/** Split NIS "25335/00506.0242" atau "25335 00506 0242" menjadi 3 bagian */
function splitNis(
  nis: string | number | null | undefined
): [string, string, string] {
  // Pastikan nis adalah string
  const nisStr = String(nis || "")

  // Coba split pakai "/" dan "."
  const bySlashDot = nisStr.match(/^(\d+)\s*[\/]\s*(\d+)\s*[.]\s*(\d+)$/)
  if (bySlashDot) return [bySlashDot[1], bySlashDot[2], bySlashDot[3]]

  // Coba split pakai spasi saja
  const parts = nisStr.trim().split(/\s+/)
  if (parts.length === 3) return [parts[0], parts[1], parts[2]]

  // Fallback: bagi rata atau return kosong jika terlalu pendek
  const third = Math.ceil(nisStr.length / 3)
  return [
    nisStr.slice(0, third) || "",
    nisStr.slice(third, third * 2) || "",
    nisStr.slice(third * 2) || "",
  ]
}

// ─────────────────────────────────────────────
// Style helpers (reusable)
// ─────────────────────────────────────────────

function fnt(
  size = 10,
  bold = false,
  name = "Times New Roman"
): Partial<ExcelJS.Font> {
  return { name, size, bold }
}

function aln(
  h: ExcelJS.Alignment["horizontal"] = "center",
  v: ExcelJS.Alignment["vertical"] = "middle",
  wrap = false
): Partial<ExcelJS.Alignment> {
  return { horizontal: h, vertical: v, wrapText: wrap }
}

function bdr(style: ExcelJS.BorderStyle = "thin"): Partial<ExcelJS.Borders> {
  return {
    top: { style },
    left: { style },
    bottom: { style },
    right: { style },
  }
}

function setCell(
  ws: ExcelJS.Worksheet,
  row: number,
  col: number,
  value: ExcelJS.CellValue,
  opts: {
    font?: Partial<ExcelJS.Font>
    align?: Partial<ExcelJS.Alignment>
    border?: Partial<ExcelJS.Borders>
  } = {}
) {
  const c = ws.getCell(row, col)
  c.value = value
  if (opts.font) c.font = opts.font as ExcelJS.Font
  if (opts.align) c.alignment = opts.align as ExcelJS.Alignment
  if (opts.border) c.border = opts.border as ExcelJS.Borders
}

/**
 * Merge cells + style top-left.
 * safeMerge: skip jika r1===r2 && c1===c2 (sel tunggal tidak perlu merge)
 */
function mc(
  ws: ExcelJS.Worksheet,
  r1: number,
  c1: number,
  r2: number,
  c2: number,
  value: ExcelJS.CellValue,
  opts: {
    font?: Partial<ExcelJS.Font>
    align?: Partial<ExcelJS.Alignment>
    border?: Partial<ExcelJS.Borders>
  } = {}
) {
  if (!(r1 === r2 && c1 === c2)) {
    try {
      ws.mergeCells(r1, c1, r2, c2)
    } catch {
      /* already merged */
    }
  }
  const tl = ws.getCell(r1, c1)
  tl.value = value
  if (opts.font) tl.font = opts.font as ExcelJS.Font
  if (opts.align) tl.alignment = opts.align as ExcelJS.Alignment
  if (opts.border) tl.border = opts.border as ExcelJS.Borders

  // Propagate border ke seluruh area merge agar semua sisi terlihat
  if (opts.border) {
    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        if (r === r1 && c === c1) continue
        ws.getCell(r, c).border = opts.border as ExcelJS.Borders
      }
    }
  }
}

// ─────────────────────────────────────────────
// Data processor
// ─────────────────────────────────────────────

interface DateInfo {
  date: string
  abbr: string
  dd: string
}

interface SiswaRow {
  no: number
  nama: string
  lp: string
  nis1: string
  nis2: string
  nis3: string
  absen: Record<string, string>
  jml: { H: number; I: number; A: number }
}

// Fungsi untuk mendapatkan semua tanggal dalam bulan dan tahun tertentu
function getAllDatesInMonth(bulan: number, tahun: number): string[] {
  const dates: string[] = []
  const firstDay = new Date(tahun, bulan - 1, 1)
  const lastDay = new Date(tahun, bulan, 0)

  const currentDay = new Date(firstDay)
  while (currentDay <= lastDay) {
    dates.push(currentDay.toISOString().split("T")[0])
    currentDay.setDate(currentDay.getDate() + 1)
  }

  return dates
}

// Fungsi untuk mendapatkan semua Jumat dalam bulan dan tahun tertentu
function getFridaysInMonth(bulan: number, tahun: number): string[] {
  const fridays: string[] = []
  const firstDay = new Date(tahun, bulan - 1, 1)
  const lastDay = new Date(tahun, bulan, 0)

  // Cari Jumat pertama
  const currentDay = new Date(firstDay)
  while (currentDay.getDay() !== 5) {
    // 5 = Jumat
    currentDay.setDate(currentDay.getDate() + 1)
  }

  // Tambahkan semua Jumat sampai akhir bulan
  while (currentDay <= lastDay) {
    fridays.push(currentDay.toISOString().split("T")[0])
    currentDay.setDate(currentDay.getDate() + 7)
  }

  return fridays
}

function processData(
  users: UserRecord[],
  absensi: AbsensiRecord[],
  bulan?: number,
  tahunBulan?: number
) {
  let dates: DateInfo[]

  const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"]

  // Jika EXPORT_ALL_DATES true, ambil semua tanggal di bulan tersebut (tidak hanya Jumat)
  if (TEST_CONFIG.EXPORT_ALL_DATES && bulan && tahunBulan) {
    const allDates = getAllDatesInMonth(bulan, tahunBulan)
    dates = allDates.map((d) => {
      const dt = new Date(d + "T00:00:00")
      const day = dt.getDate()
      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "Mei",
        "Jun",
        "Jul",
        "Agu",
        "Sep",
        "Okt",
        "Nov",
        "Des",
      ]
      const month = monthNames[dt.getMonth()]
      const dayName = dayNames[dt.getDay()]
      return {
        date: d,
        abbr: dayName,
        dd: `${day}-${month}`,
      }
    })
  }
  // Jika bulan dan tahun ditentukan, generate semua Jumat di bulan tersebut (default)
  else if (bulan && tahunBulan) {
    const fridays = getFridaysInMonth(bulan, tahunBulan)
    dates = fridays.map((d) => {
      const dt = new Date(d + "T00:00:00")
      const day = dt.getDate()
      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "Mei",
        "Jun",
        "Jul",
        "Agu",
        "Sep",
        "Okt",
        "Nov",
        "Des",
      ]
      const month = monthNames[dt.getMonth()]
      return {
        date: d,
        abbr: "Jum",
        dd: `${day}-${month}`,
      }
    })
  } else {
    // Jika tidak, gunakan tanggal dari absensi
    const dateSet = new Set(absensi.map((a) => a.tanggal))

    // Jika tidak ada tanggal, tambahkan contoh tanggal Jumat
    if (dateSet.size === 0) {
      const today = new Date()
      const dayOfWeek = today.getDay()
      const diffToFriday = (5 - dayOfWeek + 7) % 7
      const thisFriday = new Date(today)
      thisFriday.setDate(today.getDate() + diffToFriday)

      for (let i = 0; i < 4; i++) {
        const d = new Date(thisFriday)
        d.setDate(thisFriday.getDate() + i * 7)
        dateSet.add(d.toISOString().split("T")[0])
      }
    }

    dates = [...dateSet].sort().map((d) => {
      const dt = new Date(d + "T00:00:00")
      const day = dt.getDate()
      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "Mei",
        "Jun",
        "Jul",
        "Agu",
        "Sep",
        "Okt",
        "Nov",
        "Des",
      ]
      const month = monthNames[dt.getMonth()]
      const dayName = TEST_CONFIG.EXPORT_ALL_DATES
        ? dayNames[dt.getDay()]
        : "Jum"
      return {
        date: d,
        abbr: dayName,
        dd: `${day}-${month}`,
      }
    })
  }

  // Absensi per user
  const byUser: Record<number, Record<string, string>> = {}
  for (const rec of absensi) {
    if (!byUser[rec.user_id]) byUser[rec.user_id] = {}
    byUser[rec.user_id][rec.tanggal] =
      STATUS_MAP[rec.status.toLowerCase()] ?? rec.status
  }

  let laki = 0,
    perempuan = 0

  const rows: SiswaRow[] = users.map((u, i) => {
    const absen: Record<string, string> = {}
    const originalAbsen = byUser[u.id] ?? {}
    for (const d of dates) {
      let s = originalAbsen[d.date] ?? ""
      if (s !== "H" && s !== "I") {
        s = "A"
      }
      absen[d.date] = s
    }
    const jml = { H: 0, I: 0, A: 0 }
    for (const d of dates) {
      const s = absen[d.date]
      if (s === "H") jml.H++
      else if (s === "I") jml.I++
      else jml.A++
    }

    // Ambil jenis_kelamin dari user record, bukan dari absensi
    const lp = u.jenis_kelamin?.toLowerCase().startsWith("p") ? "P" : "L"
    if (lp === "L") {
      laki++
    } else {
      perempuan++
    }

    const [nis1, nis2, nis3] = splitNis(u.nis)
    return {
      no: i + 1,
      nama: u.nama.toUpperCase(),
      lp,
      nis1,
      nis2,
      nis3,
      absen,
      jml,
    }
  })

  return { dates, rows, laki, perempuan }
}

// ─────────────────────────────────────────────
// Main export functions
// ─────────────────────────────────────────────

function createWorksheet(
  wb: ExcelJS.Workbook,
  users: UserRecord[],
  absensi: AbsensiRecord[],
  config: ExportConfig
) {
  const ws = wb.addWorksheet(config.kelas, {
    pageSetup: {
      paperSize: 13, // F4
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.3,
        right: 0.3,
        top: 0.5,
        bottom: 0.5,
        header: 0.3,
        footer: 0.3,
      },
    },
  })

  const { dates, rows, laki, perempuan } = processData(
    users,
    absensi,
    config.bulan,
    config.tahunBulan
  )

  // Kolom dinamis
  const ABS_START = COL.ABS // kolom pertama kehadiran
  const ABS_END = ABS_START + Math.max(dates.length, 1) - 1
  const S_COL = ABS_END + 1
  const I_COL = S_COL + 1
  const A_COL = I_COL + 1
  const LAST = A_COL

  // ── Column widths ──────────────────────────────────────────────
  ws.getColumn(COL.NO).width = COL_W.NO
  ws.getColumn(COL.NAMA).width = COL_W.NAMA
  ws.getColumn(COL.LP).width = COL_W.LP
  ws.getColumn(COL.NIS1).width = COL_W.NIS1
  ws.getColumn(COL.SEP1).width = COL_W.SEP1
  ws.getColumn(COL.NIS2).width = COL_W.NIS2
  ws.getColumn(COL.SEP2).width = COL_W.SEP2
  ws.getColumn(COL.NIS3).width = COL_W.NIS3
  for (let c = ABS_START; c <= ABS_END; c++) ws.getColumn(c).width = COL_W.ABS
  // Kembalikan lebar kolom jumlah ke normal
  ws.getColumn(S_COL).width = COL_W.S
  ws.getColumn(I_COL).width = COL_W.I
  ws.getColumn(A_COL).width = COL_W.A

  const thin = bdr("thin")
  const hFont = fnt(9, true)
  const hAlign = aln("center", "middle", true)
  const dFont = fnt(9)

  let R = 1 // ← current row (1-based)

  // ════════════════════════════════════════════
  // SECTION 1 — KOP SURAT (rows 1-5)
  // ════════════════════════════════════════════

  const kopRows: [string, number, number, boolean][] = [
    [config.namaInstansi.toUpperCase(), ROW_H.KOP, 11, true],
    [config.dinas.toUpperCase(), ROW_H.KOP, 11, true],
    [config.namaSekolah.toUpperCase(), ROW_H.NAMA_SEKOLAH, 15, true],
    [config.alamat, ROW_H.ALAMAT, 8, false],
    [config.telepon, ROW_H.ALAMAT, 8, false],
  ]

  let lastKopRow: number | null = null
  for (let i = 0; i < kopRows.length; i++) {
    const [text, height, size, bold] = kopRows[i]
    ws.getRow(R).height = height
    // Merge semua kolom dari A (1) sampai LAST
    mc(ws, R, 1, R, LAST, text, {
      font: fnt(size, bold),
      align: aln("center", "middle"),
    })
    if (i === kopRows.length - 1) {
      lastKopRow = R
    }
    R++
  }

  // Tambahkan border bawah pada baris terakhir kop surat
  if (lastKopRow !== null) {
    for (let c = 1; c <= LAST; c++) {
      const cell = ws.getCell(lastKopRow, c)
      cell.border = {
        bottom: { style: "thin" },
      }
    }
  }

  // Logo opsional kiri dan kanan (antara baris 2-4)
  if (config.leftLogoBase64) {
    try {
      const imgId = wb.addImage({
        base64: config.leftLogoBase64,
        extension: "png",
      })
      // Portrait logo: taller than wide (1288w x 1600h)
      // Use ext with even smaller pixel dimensions to fit within kop surat
      ws.addImage(imgId, {
        tl: { col: 1.3, row: 1.1 },
        ext: { width: 53, height: 65 },
      } as unknown as any) // eslint-disable-line
    } catch {
      /* logo optional */
    }
  }
  if (config.rightLogoBase64) {
    try {
      const imgId = wb.addImage({
        base64: config.rightLogoBase64,
        extension: "png",
      })
      // Square logo (3375x3375)
      // Use ext with exact square pixel dimensions
      ws.addImage(imgId, {
        tl: { col: LAST - 3, row: 0.9 },
        ext: { width: 75, height: 75 },
      } as unknown as any) // eslint-disable-line
    } catch {
      /* logo optional */
    }
  }

  // ════════════════════════════════════════════
  // SECTION 2 — BLANK SEPARATOR
  // ════════════════════════════════════════════
  ws.getRow(R).height = ROW_H.BLANK
  mc(ws, R, 1, R, LAST, "", {})
  R++

  // ════════════════════════════════════════════
  // SECTION 3 — JUDUL
  // ════════════════════════════════════════════
  for (const text of [
    "DAFTAR HADIR SISWA",
    `KELAS ${config.kelas}`,
    `TAHUN PELAJARAN : ${config.tahunPelajaran}`,
  ]) {
    ws.getRow(R).height = ROW_H.JUDUL
    mc(ws, R, 1, R, LAST, text, {
      font: fnt(12, true),
      align: aln("center", "middle"),
    })
    R++
  }

  // ════════════════════════════════════════════
  // SECTION 3.1 — BLANK SEPARATOR
  // ════════════════════════════════════════════
  ws.getRow(R).height = ROW_H.BLANK
  mc(ws, R, 1, R, LAST, "", {})
  R++

  // ════════════════════════════════════════════
  // SECTION 4 — TABLE HEADER (3 baris)
  //
  // Merge mirip kode XLSX asli:
  //  TH1: NO(3baris) NAMA(3baris) LP(3baris) NIS(D-H, 3baris)
  //       KEHADIRAN(1baris, span dates) JUMLAH(2baris, S..A)
  //  TH2: hari per tanggal | S(2baris) I(2baris) A(2baris)
  //  TH3: tanggal per tanggal
  // ════════════════════════════════════════════

  const TH1 = R
  const TH2 = R + 1
  const TH3 = R + 2

  ws.getRow(TH1).height = ROW_H.TH1
  ws.getRow(TH2).height = ROW_H.TH2
  ws.getRow(TH3).height = ROW_H.TH3

  // NO — merge TH1:TH3
  mc(ws, TH1, COL.NO, TH3, COL.NO, "NO", {
    font: hFont,
    align: hAlign,
    border: thin,
  })

  // NAMA — merge TH1:TH3
  mc(ws, TH1, COL.NAMA, TH3, COL.NAMA, "NAMA", {
    font: hFont,
    align: hAlign,
    border: thin,
  })

  // L/P — merge TH1:TH3
  mc(ws, TH1, COL.LP, TH3, COL.LP, "L/P", {
    font: hFont,
    align: hAlign,
    border: thin,
  })

  // No. INDUK SISWA — merge D..H (NIS1..NIS3) × TH1:TH3 (sama persis kode asli)
  mc(ws, TH1, COL.NIS1, TH3, COL.NIS3, "No. INDUK SISWA", {
    font: hFont,
    align: hAlign,
    border: thin,
  })

  // KEHADIRAN — merge TH1 saja, span ABS_START..ABS_END
  if (dates.length > 0) {
    mc(ws, TH1, ABS_START, TH1, ABS_END, "KEHADIRAN", {
      font: hFont,
      align: hAlign,
      border: thin,
    })
  } else {
    mc(ws, TH1, ABS_START, TH3, ABS_START, "-", {
      font: hFont,
      align: hAlign,
      border: thin,
    })
  }

  // JUMLAH — merge TH1:TH2, span S..A (pakai fungsi mc)
  mc(ws, TH1, S_COL, TH2, A_COL, "JUMLAH", {
    font: hFont,
    align: hAlign,
    border: thin,
  })

  // TH2: nama hari per tanggal
  for (let i = 0; i < dates.length; i++) {
    setCell(ws, TH2, ABS_START + i, dates[i].abbr, {
      font: hFont,
      align: hAlign,
      border: thin,
    })
  }

  // H I A — tulis di TH3 saja (tanpa merge)
  setCell(ws, TH3, S_COL, "H", {
    font: hFont,
    align: hAlign,
    border: thin,
  })
  setCell(ws, TH3, I_COL, "I", {
    font: hFont,
    align: hAlign,
    border: thin,
  })
  setCell(ws, TH3, A_COL, "A", {
    font: hFont,
    align: hAlign,
    border: thin,
  })

  // TH3: tanggal (dd)
  for (let i = 0; i < dates.length; i++) {
    setCell(ws, TH3, ABS_START + i, dates[i].dd, {
      font: fnt(8),
      align: hAlign,
      border: thin,
    })
  }

  // Freeze panes
  ws.views = [
    { state: "frozen", xSplit: 0, ySplit: TH3, topLeftCell: `A${TH3 + 1}` },
  ]

  R = TH3 + 1

  // ════════════════════════════════════════════
  // SECTION 5 — DATA SISWA
  // ════════════════════════════════════════════

  for (const s of rows) {
    ws.getRow(R).height = ROW_H.DATA

    setCell(ws, R, COL.NO, s.no, {
      font: dFont,
      align: aln("center", "middle"),
      border: thin,
    })
    setCell(ws, R, COL.NAMA, s.nama, {
      font: dFont,
      align: aln("left", "middle"),
      border: thin,
    })
    setCell(ws, R, COL.LP, s.lp, {
      font: dFont,
      align: aln("center", "middle"),
      border: thin,
    })

    // NIS split: NIS1 "/" NIS2 "." NIS3
    setCell(ws, R, COL.NIS1, s.nis1, {
      font: dFont,
      align: aln("right", "middle"),
      border: thin,
    })
    setCell(ws, R, COL.SEP1, "/", {
      font: dFont,
      align: aln("center", "middle"),
      border: thin,
    })
    setCell(ws, R, COL.NIS2, s.nis2, {
      font: dFont,
      align: aln("center", "middle"),
      border: thin,
    })
    setCell(ws, R, COL.SEP2, ".", {
      font: dFont,
      align: aln("center", "middle"),
      border: thin,
    })
    setCell(ws, R, COL.NIS3, s.nis3, {
      font: dFont,
      align: aln("left", "middle"),
      border: thin,
    })

    // Kehadiran per tanggal
    for (let i = 0; i < dates.length; i++) {
      let code = s.absen[dates[i].date] ?? ""
      if (code !== "H" && code !== "I") {
        code = "A"
      }
      setCell(ws, R, ABS_START + i, code, {
        font: dFont,
        align: aln("center", "middle"),
        border: thin,
      })
    }

    // Jumlah H I A
    setCell(ws, R, S_COL, s.jml.H.toString(), {
      font: dFont,
      align: aln("center", "middle"),
      border: thin,
    })
    setCell(ws, R, I_COL, s.jml.I.toString(), {
      font: dFont,
      align: aln("center", "middle"),
      border: thin,
    })
    setCell(ws, R, A_COL, s.jml.A.toString(), {
      font: dFont,
      align: aln("center", "middle"),
      border: thin,
    })

    R++
  }

  // ════════════════════════════════════════════
  // SECTION 6 — FOOTER
  // ════════════════════════════════════════════

  R += 2 // 2 baris gap
  const footerStartRow = R

  // Kiri: rekapitulasi L/P
  const recap: [string, number][] = [
    ["Laki - Laki", laki],
    ["Perempuan", perempuan],
    ["Jumlah", laki + perempuan],
  ]

  for (const [label, val] of recap) {
    ws.getRow(R).height = ROW_H.FOOTER
    setCell(ws, R, COL.NAMA, label, {
      font: dFont,
      align: aln("left", "middle"),
      border: thin,
    })
    setCell(ws, R, COL.LP, val, {
      font: dFont,
      align: aln("center", "middle"),
      border: thin,
    })
    R++
  }

  // Kanan: tanda tangan
  const sigCol = Math.max(S_COL, A_COL)
  const sigLines = [
    `${config.kota}, ___________________ ${new Date().getFullYear()}`,
    "Wali Kelas",
    "",
    "",
    "",
    config.waliKelas,
    `NIP ${config.nipWaliKelas}`,
  ]

  let sigRow = footerStartRow
  for (const text of sigLines) {
    ws.getRow(sigRow).height = ROW_H.FOOTER
    mc(ws, sigRow, sigCol, sigRow, LAST, text, {
      font: text === config.waliKelas ? fnt(9, true) : fnt(9),
      align: aln("center", "middle"),
    })
    sigRow++
  }
}

// Export untuk satu kelas saja
export async function exportAbsensiExcel(
  users: UserRecord[],
  absensi: AbsensiRecord[],
  config: ExportConfig
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = "Sistem Absensi Sekolah"
  wb.created = new Date()

  createWorksheet(wb, users, absensi, config)

  const buf = await wb.xlsx.writeBuffer()
  return Buffer.from(buf)
}

// Export untuk semua kelas di sheet yang berbeda
export async function exportAllClassesExcel(
  allData: {
    kelas: string
    users: UserRecord[]
    absensi: AbsensiRecord[]
  }[],
  baseConfig: Omit<ExportConfig, "kelas">
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = "Sistem Absensi Sekolah"
  wb.created = new Date()

  for (const data of allData) {
    createWorksheet(wb, data.users, data.absensi, {
      ...baseConfig,
      kelas: data.kelas,
    })
  }

  const buf = await wb.xlsx.writeBuffer()
  return Buffer.from(buf)
}
