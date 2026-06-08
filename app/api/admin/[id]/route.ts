import { supabase } from "../../../../lib/supabaseClient"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const targetId = isNaN(Number(id)) ? id : Number(id)
    const { data, error } = await supabase
      .from("admin")
      .select("*")
      .eq("id", targetId)
      .maybeSingle()

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return Response.json({ error: "Admin tidak ditemukan" }, { status: 404 })
    }

    return Response.json(data)
  } catch (err) {
    console.error("GET Admin error:", err)
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
    const { username, password, nama, role } = body

    const targetId = isNaN(Number(id)) ? id : Number(id)
    const updateData: {
      username: string
      nama: string
      role: string
      password?: string
    } = {
      username,
      nama,
      role,
    }
    if (password) {
      updateData.password = password
    }

    const { data, error } = await supabase
      .from("admin")
      .update(updateData)
      .eq("id", targetId)
      .select()

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return Response.json({ error: "Admin tidak ditemukan" }, { status: 404 })
    }

    return Response.json(data[0])
  } catch (err) {
    console.error("PUT Admin error:", err)
    return Response.json({ error: "Invalid request" }, { status: 400 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const targetId = isNaN(Number(id)) ? id : Number(id)
    const { error } = await supabase.from("admin").delete().eq("id", targetId)

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ message: "Admin deleted successfully" })
  } catch (err) {
    console.error("DELETE Admin error:", err)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
