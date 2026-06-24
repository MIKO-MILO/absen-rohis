import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabaseServer"
import { requireAdminSession } from "@/lib/auth-server"
import type { Database } from "@/lib/supabase-types"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminSession()
    const { id } = await params
    const targetId = isNaN(Number(id)) ? id : Number(id)
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("absensi")
      .select("*")
      .eq("id", targetId)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json(
        { error: "Absensi tidak ditemukan" },
        { status: 404 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    console.error("GET error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminSession()
    const { id } = await params
    const body = await req.json()
    const { status } = body as Partial<
      Database["public"]["Tables"]["absensi"]["Update"]
    >

    if (!status) {
      return NextResponse.json({ error: "Status wajib diisi" }, { status: 400 })
    }

    const targetId = isNaN(Number(id)) ? id : Number(id)
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("absensi")
      .update({ status })
      .eq("id", targetId)
      .select()
      .maybeSingle()

    if (error) {
      const errorMessage =
        (error as { message?: string }).message || "Terjadi kesalahan"
      return NextResponse.json({ error: errorMessage }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json(
        { error: "Absensi tidak ditemukan" },
        { status: 404 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    console.error("PUT error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminSession()
    const { id } = await params
    const targetId = isNaN(Number(id)) ? id : Number(id)
    const supabase = await createClient()

    const { error } = await supabase.from("absensi").delete().eq("id", targetId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    console.error("DELETE error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
