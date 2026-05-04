import { supabase } from "@/lib/supabaseClient"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { actor_id, panitia_id } = body

    const final_panitia_id = panitia_id || actor_id

    if (!final_panitia_id) {
      return Response.json(
        { error: "Unauthorized: ID tidak ditemukan" },
        { status: 401 }
      )
    }

    const rawToken = crypto.randomUUID()
    const token = `ROHIS-DZUHUR-${rawToken}`

    const { data: newToken, error: tokenError } = await supabase
      .from("qr_token")
      .insert({
        token: rawToken, // Simpan UUID murni di DB agar pencarian EQ lancar
        aktif: true,
        panitia_id: final_panitia_id,
      })
      .select()
      .single()

    if (tokenError) {
      console.error("DB ERROR:", tokenError)
      return Response.json({ error: tokenError.message }, { status: 500 })
    }

    return Response.json({
      token,
      id: newToken.id, // Mengembalikan ID record untuk referensi frontend admin
    })
  } catch (err: any) {
    console.error("SERVER ERROR:", err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
