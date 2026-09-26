import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabaseServer"
import {
  requireAdminSession,
  requireAdminOrPanitiaSession,
} from "@/lib/auth-server"
import type { Database } from "@/lib/supabase-types"
import { withRequestMetrics } from "@/lib/request-metrics"
import { checkRateLimitPreset, rateLimitErrorResponse } from "@/lib/rate-limit"
import { createAuditLog } from "@/lib/audit-log"

type ClassesRow = Database["public"]["Tables"]["classes"]["Row"]
type ClassesInsert = Database["public"]["Tables"]["classes"]["Insert"]

export const dynamic = "force-dynamic"

export const GET = withRequestMetrics(async function GET(req: NextRequest) {
  try {
    const rl = await checkRateLimitPreset({ req, scope: "auth" })
    if (!rl.allowed) return rateLimitErrorResponse(rl.resetAt)

    await requireAdminOrPanitiaSession()

    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from("classes")
      .select("id, nama, created_at")
      .order("nama", { ascending: true })

    if (error) {
      console.error("[api/classes GET] Supabase error:", error)
      return NextResponse.json(
        { error: "Gagal mengambil data kelas" },
        { status: 500 }
      )
    }

    const rows = (data ?? []) as ClassesRow[]
    const classNames = rows.map((r) => r.nama)

    return NextResponse.json({
      classes: classNames,
      rows,
      total: rows.length,
    })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    console.error("[api/classes GET]", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
})

export const POST = withRequestMetrics(async function POST(req: NextRequest) {
  try {
    const rl = await checkRateLimitPreset({ req, scope: "sensitive" })
    if (!rl.allowed) return rateLimitErrorResponse(rl.resetAt)

    const actor = await requireAdminSession()

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== "object" || !("nama" in body)) {
      return NextResponse.json(
        { error: "Body harus berisi { nama: string }" },
        { status: 400 }
      )
    }

    const namaRaw = String(body.nama).trim()
    if (!namaRaw) {
      return NextResponse.json(
        { error: "Nama kelas tidak boleh kosong" },
        { status: 400 }
      )
    }

    const supabase = await createServiceClient()

    const { data: existing } = await supabase
      .from("classes")
      .select("id")
      .eq("nama", namaRaw)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: `Kelas ${namaRaw} sudah ada` },
        { status: 409 }
      )
    }

    const payload: ClassesInsert = { nama: namaRaw }
    const { data, error } = await supabase
      .from("classes")
      .insert(payload)
      .select("id, nama, created_at")
      .single()

    if (error) {
      console.error("[api/classes POST] Supabase error:", error)
      return NextResponse.json(
        { error: "Gagal menambahkan kelas: " + error.message },
        { status: 500 }
      )
    }

    await createAuditLog({
      actor,
      action: "create_kelas",
      targetType: "config",
      targetId: (data as ClassesRow).id,
      description: `${actor.nama} menambahkan kelas ${namaRaw}`,
    }).catch(() => {})

    return NextResponse.json(
      { success: true, message: `Kelas ${namaRaw} berhasil ditambahkan`, data },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    console.error("[api/classes POST]", error)
    return NextResponse.json(
      { error: "Terjadi kesalahan sistem" },
      { status: 400 }
    )
  }
})

export const DELETE = withRequestMetrics(async function DELETE(
  req: NextRequest
) {
  try {
    const rl = await checkRateLimitPreset({ req, scope: "sensitive" })
    if (!rl.allowed) return rateLimitErrorResponse(rl.resetAt)

    const actor = await requireAdminSession()

    const { searchParams } = new URL(req.url)
    const nama = searchParams.get("nama")?.trim() ?? ""

    if (!nama) {
      return NextResponse.json(
        { error: "Parameter ?nama= wajib disertakan" },
        { status: 400 }
      )
    }

    const supabase = await createServiceClient()

    const { data: targetRow } = await supabase
      .from("classes")
      .select("id, nama")
      .eq("nama", nama)
      .maybeSingle()

    if (!targetRow) {
      return NextResponse.json(
        { error: `Kelas ${nama} tidak ditemukan` },
        { status: 404 }
      )
    }

    const { error } = await supabase
      .from("classes")
      .delete()
      .eq("id", (targetRow as ClassesRow).id)

    if (error) {
      console.error("[api/classes DELETE] Supabase error:", error)
      return NextResponse.json(
        { error: "Gagal menghapus kelas: " + error.message },
        { status: 500 }
      )
    }

    await createAuditLog({
      actor,
      action: "delete_kelas",
      targetType: "config",
      targetId: (targetRow as ClassesRow).id,
      description: `${actor.nama} menghapus kelas ${nama}`,
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      message: `Kelas ${nama} berhasil dihapus`,
    })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    console.error("[api/classes DELETE]", error)
    return NextResponse.json(
      { error: "Terjadi kesalahan sistem" },
      { status: 400 }
    )
  }
})
