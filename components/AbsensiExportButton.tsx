/**
 * components/AbsensiExportButton.tsx
 * Tombol download export absensi Excel dengan pilihan bulan, kelas, dan export semua kelas
 */

"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { getActiveConfig } from "@/lib/client-config"

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
}

export function AbsensiExportButton({
  kelas: initialKelas,
  tahunPelajaran,
  className,
}: AbsensiExportButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [classes, setClasses] = useState<string[]>([])
  const [selectedKelas, setSelectedKelas] = useState(initialKelas)

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await fetch("/api/classes")
        const data = await res.json()
        if (data.classes) {
          setClasses(data.classes)
          if (!data.classes.includes(initialKelas) && data.classes.length > 0) {
            setSelectedKelas(data.classes[0])
          }
        }
      } catch (err) {
        console.error("Error fetching classes:", err)
      }
    }

    fetchClasses()
  }, [initialKelas])

  const handleExport = async (semuaKelas: boolean = false) => {
    setLoading(true)
    setError(null)

    try {
      const config = getActiveConfig()
      const params = new URLSearchParams({
        kelas: selectedKelas,
        tahun: tahunPelajaran,
        bulan: String(selectedMonth + 1),
        tahun_bulan: String(selectedYear),
        ...(semuaKelas && { semua_kelas: "true" }),
        ...(config.EXPORT_ALL_DATES && { export_all_dates: "true" }),
      })
      const res = await fetch(`/api/absensi/export?${params}`)

      if (!res.ok) {
        throw new Error(`Export gagal: ${res.statusText}`)
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const monthName = MONTHS[selectedMonth]
      a.download = semuaKelas
        ? `Daftar_Hadir_Semua_Kelas_${monthName}_${selectedYear}.xlsx`
        : `Daftar_Hadir_${selectedKelas}_${monthName}_${selectedYear}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setLoading(false)
    }
  }

  // Generate list tahun (5 tahun ke belakang dan 1 tahun ke depan)
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 7 }, (_, i) => currentYear - 5 + i)

  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-4 ${className || ""}`}
    >
      {classes.length > 0 && (
        <div className="relative">
          <select
            value={selectedKelas}
            onChange={(e) => setSelectedKelas(e.target.value)}
            className="h-9 appearance-none rounded-lg border border-border bg-muted/50 pr-8 pl-4 text-xs font-semibold text-muted-foreground outline-none"
          >
            {classes.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <svg
            className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted-foreground/70"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      )}
      <div className="flex items-center gap-2">
        <div className="relative">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="h-9 appearance-none rounded-lg border border-border bg-muted/50 pr-8 pl-4 text-xs font-semibold text-muted-foreground outline-none"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <svg
            className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted-foreground/70"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
        <div className="relative">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            style={{ width: `${MONTHS[selectedMonth].length + 5.5}ch` }}
            className="h-9 appearance-none rounded-lg border border-border bg-muted/50 pr-8 pl-4 text-xs font-semibold text-muted-foreground transition-all outline-none"
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i}>
                {m}
              </option>
            ))}
          </select>
          <svg
            className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted-foreground/70"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          onClick={() => handleExport(false)}
          disabled={loading}
          variant="outline"
          className="h-9 rounded-lg border-muted-foreground/20 text-muted-foreground hover:bg-muted/50"
        >
          <svg
            className="mr-2 h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          {loading ? "Mengekspor..." : "Export Kelas Ini"}
        </Button>
        <Button
          onClick={() => handleExport(true)}
          disabled={loading}
          variant="outline"
          className="h-9 rounded-lg border-muted-foreground/20 text-muted-foreground hover:bg-muted/50"
        >
          <svg
            className="mr-2 h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          {loading ? "Mengekspor..." : "Export Semua Kelas"}
        </Button>
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}
