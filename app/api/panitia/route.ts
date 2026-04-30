// ✅ sesuai posisi file kamu
import { supabase } from "../../../lib/supabaseClient"

export async function GET() {
  const { data, error } = await supabase.from("panitia").select("*")

  if (error) {
    console.error("SUPABASE ERROR:", error)
    return Response.json({ error: error.message }, { status: 500 })
  }
  
  return Response.json(data)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    let panitia = []

    if (Array.isArray(body.panitia)) {
      panitia = body.panitia
    } else {
      panitia = [body] // dari form manual
    }

    const { data, error } = await supabase
      .from("panitia")
      .insert(panitia)
      .select()

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json(data)
  } catch (error) {
    console.error(error)
    return Response.json({ error: "Invalid request" }, { status: 400 })
  }
}
