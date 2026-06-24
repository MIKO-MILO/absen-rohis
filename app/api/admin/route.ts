import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabaseServer"
import { requireAdminSession } from "@/lib/auth-server"
import type { Database } from "@/lib/supabase-types"

export async function GET() {
  try {
    await requireAdminSession()
    const supabase = await createClient()
    const { data, error } = await supabase.from("admin").select("*")

    if (error) {
      console.error("SUPABASE ERROR:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    await requireAdminSession()
    const body = await req.json()
    const { username, password, nama, role } = body as Partial<
      Database["public"]["Tables"]["admin"]["Insert"]
    >

    if (!username || !password || !nama || !role) {
      return NextResponse.json(
        { error: "Username, password, nama, and role are required" },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from("admin")
      .insert({ username, password, nama, role })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    console.error(error)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
