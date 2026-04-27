// ✅ sesuai posisi file kamu
import { supabase } from "../../../lib/supabaseClient"

export async function GET() {
  const { data, error } = await supabase.from("users").select("*")

  if (error) {
    console.error("SUPABASE ERROR:", error)
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const { nama, kelas, jenis_kelamin, nis, email, password } = body

    const { data, error } = await supabase
      .from("users")
      .insert([
        {
          nama,
          kelas,
          jenis_kelamin,
          nis,
          email,
          password,
        },
      ])
      .select()

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json(data)
  } catch (err) {
    return Response.json({ error: "Invalid request" }, { status: 400 })
  }
}
