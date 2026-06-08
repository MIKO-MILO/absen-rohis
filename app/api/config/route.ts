import { supabase } from "@/lib/supabaseClient"
import { DEFAULT_CONFIG, type TestConfig } from "@/lib/test-config"

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("system_settings")
      .select("config")
      .eq("id", 1)
      .single()

    if (error) {
      // Jika tabel belum ada, kembalikan default
      console.warn(
        "Config table not found or error, using default:",
        error.message
      )
      return Response.json(DEFAULT_CONFIG)
    }
    return Response.json({ ...DEFAULT_CONFIG, ...data.config })
  } catch {
    return Response.json(DEFAULT_CONFIG)
  }
}

export async function POST(req: Request) {
  try {
    const config: TestConfig = await req.json()

    // 1. Cek apakah row ID 1 sudah ada
    const { data: existing, error: checkError } = await supabase
      .from("system_settings")
      .select("id")
      .eq("id", 1)
      .maybeSingle() // Gunakan maybeSingle agar tidak error jika kosong

    if (checkError) {
      // Jika errornya adalah tabel tidak ditemukan (42P01)
      if (checkError.code === "42P01") {
        return Response.json(
          {
            error:
              "Tabel 'system_settings' belum dibuat di Supabase. Silakan jalankan perintah SQL yang diberikan.",
          },
          { status: 500 }
        )
      }
      return Response.json({ error: checkError.message }, { status: 500 })
    }

    let result
    if (existing) {
      result = await supabase
        .from("system_settings")
        .update({ config, updated_at: new Date().toISOString() })
        .eq("id", 1)
    } else {
      result = await supabase
        .from("system_settings")
        .insert([{ id: 1, config, updated_at: new Date().toISOString() }])
    }

    if (result.error) {
      return Response.json({ error: result.error.message }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch {
    return Response.json({ error: "Permintaan tidak valid" }, { status: 400 })
  }
}
