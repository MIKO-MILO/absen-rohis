import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabaseServer"
import {
  requireAdminSession,
  requireAdminOrPanitiaSession,
} from "@/lib/auth-server"
import type { Database } from "@/lib/supabase-types"
import { withRequestMetrics } from "@/lib/request-metrics"
import { createAuditLog } from "@/lib/audit-log"

export const GET = withRequestMetrics(async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminOrPanitiaSession()
    const { id } = await params
    const targetId = Number(id)
    if (!Number.isInteger(targetId)) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 })
    }
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("panitia")
      .select("*")
      .eq("id", targetId)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json(
        { error: "Panitia tidak ditemukan" },
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
})

export const PUT = withRequestMetrics(async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireAdminSession()
    const { id } = await params
    const targetId = Number(id)
    if (!Number.isInteger(targetId)) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 })
    }
    const body = await req.json()
    const { nama, divisi, jenis_kelamin, email, password } = body as Partial<
      Database["public"]["Tables"]["panitia"]["Update"]
    >
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("panitia")
      .update({ nama, divisi, jenis_kelamin, email, password })
      .eq("id", targetId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json(
        { error: "Panitia tidak ditemukan" },
        { status: 404 }
      )
    }

    await createAuditLog({
      actor,
      action: "update_panitia",
      targetType: "panitia",
      targetId,
      description: `${actor.nama} updated panitia ${nama ?? data.nama ?? ""} (${divisi ?? data.divisi ?? ""})`,
    })

    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    console.error("PUT error:", error)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
})

export const DELETE = withRequestMetrics(async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireAdminSession()
    const { id } = await params
    const targetId = Number(id)
    if (!Number.isInteger(targetId)) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 })
    }
    const supabase = await createClient()

    const { data: existingData } = await supabase
      .from("panitia")
      .select("nama, divisi")
      .eq("id", targetId)
      .maybeSingle()

    const { error } = await supabase.from("panitia").delete().eq("id", targetId)

    if (error) {
      console.error("Supabase delete error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await createAuditLog({
      actor,
      action: "delete_panitia",
      targetType: "panitia",
      targetId,
      description: `${actor.nama} deleted panitia ${existingData?.nama ?? `id:${targetId}`} (${existingData?.divisi ?? "unknown"})`,
    })

    return NextResponse.json({ message: "Panitia deleted successfully" })
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
})
