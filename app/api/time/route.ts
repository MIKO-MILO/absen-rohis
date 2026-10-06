import { NextResponse } from "next/server"
import { getWIBDetails } from "@/lib/client-config"

export const dynamic = "force-dynamic"
export const fetchCache = "force-no-store"
export const revalidate = 0

export async function GET() {
  const serverNow = new Date()
  const wib = getWIBDetails(serverNow)

  return NextResponse.json(
    {
      serverIso: serverNow.toISOString(),
      serverEpochMs: serverNow.getTime(),
      wibDay: wib.day,
      wibHour: wib.hour,
      wibMinute: wib.minute,
      wibSecond: wib.second,
      wibLabel:
        ["Ahad", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][wib.day] +
        ` ${String(wib.hour).padStart(2, "0")}:${String(wib.minute).padStart(2, "0")}:${String(wib.second).padStart(2, "0")} WIB`,
      note: "Gunakan ini sebagai sumber waktu otoritatif. Selisih > 60 detik antara serverEpochMs vs device Date.now() = indikasi device dimanipulasi.",
    },
    {
      headers: {
        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  )
}
