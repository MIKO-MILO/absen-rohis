import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabaseServer"
import { requireAdminSession, requireRole } from "@/lib/auth-server"
import type { Database } from "@/lib/supabase-types"

export async function GET() {
  try {
    await requireRole(["admin", "superadmin", "panitia"] as const)
    const supabase = await createClient()
    const { data, error } = await supabase.from("panitia").select("*")

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
    console.error(error)
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

    let panitia: Array<
      Partial<Database["public"]["Tables"]["panitia"]["Insert"]>
    > = []

    if (Array.isArray(body.panitia)) {
      panitia = body.panitia as Array<
        Partial<Database["public"]["Tables"]["panitia"]["Insert"]>
      >
    } else {
      panitia = [
        body as Partial<Database["public"]["Tables"]["panitia"]["Insert"]>,
      ]
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from("panitia")
      .insert(panitia)
      .select()

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
