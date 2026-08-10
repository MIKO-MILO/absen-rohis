"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { getActiveConfig } from "@/lib/client-config"
import { CalendarDays, FileSpreadsheet, Users } from "lucide-react"

const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
]

interface AbsensiExportButtonProps {
  kelas: string
  tahunPelajaran: string
  className?: string
  exportAllClasses?: boolean
  onExportAllClassesChange?: (value: boolean) => void
  onSelectedKelasChange?: (value: string) => void
}

export function AbsensiExportButton({
  kelas: initialKelas,
  tahunPelajaran,
  className,
  exportAllClasses,
  onExportAllClassesChange,
  onSelectedKelasChange,
}: AbsensiExportButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [classes, setClasses] = useState<string[]>([])
  const [internalSelectedKelas, setInternalSelectedKelas] =
    useState(initialKelas)
  const [internalExportAll, setInternalExportAll] = useState(false)
  const isAllClasses = exportAllClasses ?? internalExportAll

  const selectedKelas = onSelectedKelasChange
    ? initialKelas
    : internalSelectedKelas
  const effectiveKelas =
    classes.length > 0 && !classes.includes(selectedKelas)
      ? classes[0]
      : selectedKelas

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await fetch("/api/classes")
        const data = await res.json()
        if (data.classes) {
          setClasses(data.classes)
        }
      } catch (err) {
        console.error("Error fetching classes:", err)
      }
    }
    fetchClasses()
  }, [])

  const setExportScope = (value: boolean) => {
    setInternalExportAll(value)
    onExportAllClassesChange?.(value)
  }

  const handleExport = async () => {
    setLoading(true)
    setError(null)

    try {
      const config = getActiveConfig()
      const params = new URLSearchParams({
        kelas: effectiveKelas,
        tahun: tahunPelajaran,
        bulan: String(selectedMonth + 1),
        tahun_bulan: String(selectedYear),
        ...(isAllClasses && { semua_kelas: "true" }),
        ...(config.EXPORT_ALL_DATES && { export_all_dates: "true" }),
      })
      const res = await fetch(`/api/absensi/export?${params}`)
      if (!res.ok) throw new Error(`Export gagal: ${res.statusText}`)

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = isAllClasses
        ? `Daftar_Hadir_Semua_Kelas_${MONTHS[selectedMonth]}_${selectedYear}.xlsx`
        : `Daftar_Hadir_${effectiveKelas}_${MONTHS[selectedMonth]}_${selectedYear}.xlsx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setLoading(false)
    }
  }

  const years = Array.from(
    { length: 7 },
    (_, index) => new Date().getFullYear() - 5 + index
  )
  const selectClassName =
    "h-10 w-full appearance-none rounded-xl border border-border bg-card px-3 pr-9 text-xs font-semibold text-foreground outline-none transition-shadow focus:border-[#009775] focus:ring-2 focus:ring-[#009775]/15"

  return (
    <div className={`flex flex-col gap-4 ${className || ""}`}>
      <div>
        <p className="mb-2 text-xs font-bold text-foreground">Cakupan Data</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              value: false,
              title: "Kelas Terpilih",
              description: "Ekspor data sesuai kelas yang dipilih",
            },
            {
              value: true,
              title: "Semua Kelas",
              description: "Ekspor data dari semua kelas",
            },
          ].map((option) => (
            <button
              key={option.title}
              type="button"
              onClick={() => setExportScope(option.value)}
              className={`flex min-h-16 items-start gap-2 rounded-xl border p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm ${
                isAllClasses === option.value
                  ? "border-[#009775] bg-[#009775]/5"
                  : "border-border bg-card"
              }`}
            >
              <span
                className={`mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border ${
                  isAllClasses === option.value
                    ? "border-[#009775] bg-[#009775]"
                    : "border-border"
                }`}
              >
                {isAllClasses === option.value && (
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                )}
              </span>
              <span>
                <span className="block text-[11px] font-bold text-foreground">
                  {option.title}
                </span>
                <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground">
                  {option.description}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {!isAllClasses && classes.length > 0 && (
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-foreground">Kelas</span>
            <div className="relative">
              <Users className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[#009775]" />
              <select
                value={effectiveKelas}
                onChange={(event) => {
                  const nextKelas = event.target.value
                  onSelectedKelasChange?.(nextKelas)
                  if (!onSelectedKelasChange)
                    setInternalSelectedKelas(nextKelas)
                }}
                className={`${selectClassName} pl-9`}
              >
                {classes.map((kelas) => (
                  <option key={kelas} value={kelas}>
                    {kelas}
                  </option>
                ))}
              </select>
            </div>
          </label>
        )}

        <label className="block space-y-1.5">
          <span className="text-xs font-bold text-foreground">Tahun</span>
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[#009775]" />
            <select
              value={selectedYear}
              onChange={(event) => setSelectedYear(Number(event.target.value))}
              className={`${selectClassName} pl-9`}
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-bold text-foreground">Bulan</span>
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[#009775]" />
            <select
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(Number(event.target.value))}
              className={`${selectClassName} pl-9`}
            >
              {MONTHS.map((month, index) => (
                <option key={month} value={index}>
                  {month}
                </option>
              ))}
            </select>
          </div>
        </label>
      </div>

      <Button
        onClick={handleExport}
        disabled={loading}
        className="h-11 w-full rounded-xl bg-[#009775] text-xs font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#008468] hover:shadow-md active:translate-y-0"
      >
        <FileSpreadsheet className="mr-2 h-4 w-4" />
        {loading ? "Mengekspor..." : "Export ke Excel"}
      </Button>
      {error && (
        <p className="text-center text-xs font-medium text-red-500">{error}</p>
      )}
    </div>
  )
}
