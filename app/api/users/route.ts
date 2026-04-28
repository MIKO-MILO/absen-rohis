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

    let users = []

    if (Array.isArray(body.users)) {
      users = body.users
    } else {
      users = [body] // dari form manual
    }

    const { data, error } = await supabase.from("users").insert(users).select()

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json(data)
  } catch (error) {
    console.error(error)
    return Response.json({ error: "Invalid request" }, { status: 400 })
  }
}
