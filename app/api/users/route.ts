import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabaseServer"
import {
  requireAdminSession,
  requireAdminOrPanitiaSession,
} from "@/lib/auth-server"
import type { Database } from "@/lib/supabase-types"

export async function GET() {
  try {
    await requireAdminOrPanitiaSession()
    const supabase = await createClient()
    const { data, error } = await supabase.from("users").select("*")

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

    let users: Array<Partial<Database["public"]["Tables"]["users"]["Insert"]>> =
      []

    if (Array.isArray(body.users)) {
      users = body.users as Array<
        Partial<Database["public"]["Tables"]["users"]["Insert"]>
      >
    } else {
      users = [body as Partial<Database["public"]["Tables"]["users"]["Insert"]>]
    }

    const supabase = await createClient()
    const { data, error } = await supabase.from("users").insert(users).select()

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
