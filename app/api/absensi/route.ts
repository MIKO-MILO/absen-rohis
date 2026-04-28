import { supabase } from "../../../lib/supabaseClient"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)

  const user_id = searchParams.get("user_id")
  const panitia_id = searchParams.get("panitia_id")

  let query = supabase.from("absensi").select(`
      *,
      users (
        nama,
        nis,
        kelas
      )
    `)

  if (user_id) {
    query = query.eq("user_id", user_id)
  }

  if (panitia_id) {
    query = query.eq("panitia_id", panitia_id)
  }

  const { data, error } = await query

  if (error) {
    console.error("SUPABASE ERROR:", error)
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data)
}
