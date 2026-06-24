import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabaseServer"
import {
  requireAdminSession,
  requireAuthenticatedSession,
} from "@/lib/auth-server"
import type { Database } from "@/lib/supabase-types"

export async function GET() {
  try {
    await requireAuthenticatedSession()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("system_settings")
      .select("*")
      .single()

    if (error && error.code !== "PGRST116") {
      throw error
    }

    const defaultConfig = {
      PAKSA_REALTIME: true,
      CEK_GPS: false,
      MAX_JARAK_GPS: 500,
      ZOOM_GPS: 16,
      LOGIN_OTP: false,
      AUTO_SIGN_OUT: 20000,
      SIMULASI_HARI: 5,
      SIMULASI_TANGGAL: "2025-04-04",
      KODE_OTP: "123456",
      PANITIA_NAMA: "Aditya Dimas Pratama",
      PANITIA_DIVISI: "Divisi Kerohanian",
      ENABLE_SIMULATION: false,
      ENABLE_OTP: false,
      ENABLE_FORGOT_SIGN_IN: true,
      SEKOLAH_NAMA: "SMK NEGERI 4 KOTA MALANG",
      SEKOLAH_KOTA: "Malang",
      APP_VERSION: "1.0.0",
    }

    if (!data) {
      return NextResponse.json(defaultConfig)
    }

    const config = { ...defaultConfig, ...data.config }

    return NextResponse.json(config)
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    console.error(error)
    return NextResponse.json(
      {
        PAKSA_REALTIME: true,
        CEK_GPS: false,
        MAX_JARAK_GPS: 500,
        ZOOM_GPS: 16,
        LOGIN_OTP: false,
        AUTO_SIGN_OUT: 20000,
        SIMULASI_HARI: 5,
        SIMULASI_TANGGAL: "2025-04-04",
        KODE_OTP: "123456",
        PANITIA_NAMA: "Aditya Dimas Pratama",
        PANITIA_DIVISI: "Divisi Kerohanian",
        ENABLE_SIMULATION: false,
        ENABLE_OTP: false,
        ENABLE_FORGOT_SIGN_IN: true,
        SEKOLAH_NAMA: "SMK NEGERI 4 KOTA MALANG",
        SEKOLAH_KOTA: "Malang",
        APP_VERSION: "1.0.0",
      },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    await requireAdminSession()
    const body = await req.json()
    const supabase = await createClient()

    const { data: existing, error: fetchError } = await supabase
      .from("system_settings")
      .select("*")
      .single()

    if (fetchError && fetchError.code !== "PGRST116") {
      throw fetchError
    }

    const configData: Database["public"]["Tables"]["system_settings"]["Row"] = {
      id: existing?.id ?? 1,
      config: { ...existing?.config, ...body },
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from("system_settings")
      .upsert(configData)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    console.error(error)
    return NextResponse.json(
      { error: "Failed to save config" },
      { status: 500 }
    )
  }
}
