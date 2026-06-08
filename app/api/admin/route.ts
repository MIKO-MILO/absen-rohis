import { supabase } from "../../../lib/supabaseClient"

export async function GET() {
  const { data, error } = await supabase.from("admin").select("*")

  if (error) {
    console.error("SUPABASE ERROR:", error)
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { username, password, nama, role } = body

    if (!username || !password || !nama || !role) {
      return Response.json(
        { error: "Username, password, nama, and role are required" },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from("admin")
      .insert([{ username, password, nama, role }])
      .select()

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json(data[0])
  } catch (error) {
    console.error(error)
    return Response.json({ error: "Invalid request" }, { status: 400 })
  }
}
