import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabaseServer"
import { requireAdminSession } from "@/lib/auth-server"
import type { AdminRow, AdminUpdate } from "@/lib/app-types"
import { withRequestMetrics } from "@/lib/request-metrics"
import { createAuditLog } from "@/lib/audit-log"
import type { Database } from "@/lib/supabase-types"

export const GET = withRequestMetrics(async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminSession()
    const { id } = await params
    const targetId = Number(id)
    if (!Number.isInteger(targetId)) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 })
    }
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("admin")
      .select("*")
      .eq("id", targetId)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json(
        { error: "Admin tidak ditemukan" },
        { status: 404 }
      )
    }

    return NextResponse.json(data as AdminRow)
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    console.error("GET Admin error:", error)
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
    const { username, password, nama, role } = body as Partial<AdminUpdate>

    if (!username || !nama || !role) {
      return NextResponse.json(
        { error: "Username, nama, and role are required" },
        { status: 400 }
      )
    }

    const roleEnum = role as Database["public"]["Enums"]["role admin"]

    const supabase = await createClient()
    const updateData: AdminUpdate = { username, nama, role: roleEnum }
    if (password) {
      updateData.password = password
    }

    const { data, error } = await supabase
      .from("admin")
      .update(updateData)
      .eq("id", targetId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json(
        { error: "Admin tidak ditemukan" },
        { status: 404 }
      )
    }

    await createAuditLog({
      actor,
      action: "update_admin",
      targetType: "admin",
      targetId: data.id,
      description: `${actor.nama} updated admin ${nama ?? ""} (${role ?? ""})`,
    })

    return NextResponse.json(data as AdminRow)
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    console.error("PUT Admin error:", error)
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
      .from("admin")
      .select("nama, role")
      .eq("id", targetId)
      .maybeSingle()

    const { error } = await supabase.from("admin").delete().eq("id", targetId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await createAuditLog({
      actor,
      action: "delete_admin",
      targetType: "admin",
      targetId,
      description: `${actor.nama} deleted admin ${existingData?.nama ?? `id:${targetId}`} (${existingData?.role ?? "unknown"})`,
    })

    return NextResponse.json({ message: "Admin deleted successfully" })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    console.error("DELETE Admin error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
})
