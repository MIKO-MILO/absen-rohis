import { supabase } from "../../../../lib/supabaseClient"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log("GET /api/panitia/[id] called with id:", id)

    const targetId = isNaN(Number(id)) ? id : Number(id)

    const { data, error } = await supabase
      .from("panitia")
      .select("*")
      .eq("id", targetId)
      .maybeSingle()

    console.log("Supabase response - data:", data, "error:", error)

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return Response.json({ error: "Panitia tidak ditemukan" }, { status: 404 })
    }

    return Response.json(data)
  } catch (err: unknown) {
    console.error("GET error:", err)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { nama, divisi, jenis_kelamin, email, password } = body

    const targetId = isNaN(Number(id)) ? id : Number(id)

    const { data, error } = await supabase
      .from("panitia")
      .update({
        nama,
        divisi,
        jenis_kelamin,
        email,
        password,
      })
      .eq("id", targetId)
      .select()

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return Response.json({ error: "Panitia tidak ditemukan" }, { status: 404 })
    }

    return Response.json(data)
  } catch (err: unknown) {
    console.error("PUT error:", err)
    return Response.json({ error: "Invalid request" }, { status: 400 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log("DELETE /api/panitia/[id] called with id:", id)

    // Cek apakah id adalah angka, jika ya konversi ke number
    const targetId = isNaN(Number(id)) ? id : Number(id)

    const { error } = await supabase.from("panitia").delete().eq("id", targetId)

    if (error) {
      console.error("Supabase delete error:", error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ message: "User deleted successfully" })
  } catch (err: unknown) {
    console.error("DELETE error:", err)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
