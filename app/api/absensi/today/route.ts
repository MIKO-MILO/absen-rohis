import { supabase } from "@/lib/supabaseClient"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const user_id = searchParams.get("user_id")

  if (!user_id) {
    return Response.json({ error: "user_id wajib" }, { status: 400 })
  }

  const today = new Date().toLocaleDateString("sv-SE")

  const { data, error } = await supabase
    .from("absensi")
    .select("id")
    .eq("user_id", user_id)
    .eq("tanggal", today)
    .in("status", ["hadir", "haid"])
    .limit(1)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  const sudahAbsen = data.length > 0

  return Response.json({ sudahAbsen })
}
