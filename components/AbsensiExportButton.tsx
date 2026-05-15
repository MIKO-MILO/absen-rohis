/**
 * components/AbsensiExportButton.tsx
 * Tombol download export absensi Excel
 */

"use client"

import { useState } from "react"

interface AbsensiExportButtonProps {
  kelas: string
  tahunPelajaran: string
}

export function AbsensiExportButton({
  kelas,
  tahunPelajaran,
}: AbsensiExportButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExport = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({ kelas, tahun: tahunPelajaran })
      const res = await fetch(`/api/absensi/export?${params}`)

      if (!res.ok) {
        throw new Error(`Export gagal: ${res.statusText}`)
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `Daftar_Hadir_${kelas}_${tahunPelajaran.replace("/", "-")}.xlsx`
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

  return (
    <div>
      <button
        onClick={handleExport}
        disabled={loading}
        style={{
          padding: "8px 16px",
          backgroundColor: loading ? "#ccc" : "#1a6b3a",
          color: "white",
          border: "none",
          borderRadius: 4,
          cursor: loading ? "not-allowed" : "pointer",
          fontFamily: "inherit",
          fontSize: 14,
        }}
      >
        {loading ? "Mengekspor..." : "📥 Export Excel Absensi"}
      </button>
      {error && (
        <p style={{ color: "red", marginTop: 4, fontSize: 13 }}>{error}</p>
      )}
    </div>
  )
}

// ── Usage example ─────────────────────────────────────────
// import { AbsensiExportButton } from "@/components/AbsensiExportButton";
//
// export default function AbsensiPage() {
//   return (
//     <AbsensiExportButton
//       kelas="X TEKNIK LOGISTIK (TL) - A"
//       tahunPelajaran="2025/2026"
//     />
//   );
// }
