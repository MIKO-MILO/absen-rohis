import { supabase } from "../../../../lib/supabaseClient"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log(id)

    const targetId = isNaN(Number(id)) ? id : Number(id)

    const { data, error } = await supabase
      .from("absensi")
      .select("*")
      .eq("id", targetId)
      .maybeSingle()

    console.log("Supabase response - data:", data, "error:", error)

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return Response.json(
        { error: "Absensi tidak ditemukan" },
        { status: 404 }
      )
    }
    return Response.json(data)
  } catch (err) {
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
    const { status } = body

    if (!status) {
      return Response.json({ error: "Status wajib diisi" }, { status: 400 })
    }

    const targetId = isNaN(Number(id)) ? id : Number(id)

    const { data, error } = await supabase
      .from("absensi")
      .update({
        status: status.toLowerCase(),
      })
      .eq("id", targetId)
      .select()
      .maybeSingle()

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }
    if (!data) {
      return Response.json(
        { error: "Absensi tidak ditemukan" },
        { status: 404 }
      )
    }
    return Response.json(data)
  } catch (err) {
    console.error("PUT error:", err)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
