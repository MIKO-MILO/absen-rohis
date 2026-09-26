import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabaseServer"
import {
  requireAdminSession,
  requireAuthenticatedSession,
} from "@/lib/auth-server"
import type { Database } from "@/lib/supabase-types"
import { createAuditLog } from "@/lib/audit-log"

type PanitiaInsert =
  Database["public"]["Tables"]["panitia"]["Insert"]

type PanitiaRow =
  Database["public"]["Tables"]["panitia"]["Row"]

export const dynamic = "force-dynamic"

/**
 * ============================================
 * GET
 * Mengambil daftar divisi unik dari tabel panitia
 * ============================================
 */
export async function GET(_req: NextRequest) {
  void _req

  try {
    await requireAuthenticatedSession()

    const supabase = await createServiceClient()

    const { data: panitia, error } = await supabase
      .from("panitia")
      .select("divisi")

    if (error) {
      throw error
    }

    const typedPanitia = (panitia ?? []) as PanitiaRow[]

    const uniqueDivisi = [
      ...new Set(
        typedPanitia.map((p) => p.divisi)
      ),
    ]
      .filter(
        (divisi): divisi is string =>
          typeof divisi === "string" &&
          divisi.trim().length > 0
      )
      .sort((a, b) => a.localeCompare(b))

    return NextResponse.json({
      divisi: uniqueDivisi,
    })
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Unauthorized"
    ) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    if (
      error instanceof Error &&
      error.message === "Forbidden"
    ) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      )
    }

    console.error("[api-divisi] GET Error:", error)

    return NextResponse.json(
      {
        error: "Gagal mengambil daftar divisi",
        divisi: [],
      },
      { status: 500 }
    )
  }
}

/**
 * ============================================
 * POST
 * Menambahkan divisi baru
 * ============================================
 */
export async function POST(req: NextRequest) {
  try {
    const actor = await requireAdminSession()

    const body = (await req.json()) as {
      divisi?: string
    }

    const divisi = body.divisi?.trim()

    if (!divisi) {
      return NextResponse.json(
        {
          error: "Nama divisi wajib diisi",
        },
        { status: 400 }
      )
    }

    const supabaseAdmin = await createServiceClient()

    const payload: PanitiaInsert = {
      nama: divisi,
      divisi: divisi,
      email: `divisi_${divisi
        .toLowerCase()
        .replace(/\s+/g, "_")}@rohis.id`,
      password: "divisi_default",
      jenis_kelamin: "L",
    }

    const { data, error } = await supabaseAdmin
      .from("panitia")
      .insert(payload)
      .select()

    if (error) {
      console.error(
        "[api-divisi] Supabase INSERT Error:",
        error
      )

      throw error
    }

    const inserted = (data ?? []) as PanitiaRow[]
    const targetId = inserted[0]?.id ?? undefined

    await createAuditLog({
      actor,
      action: "create_divisi",
      targetType: "panitia",
      targetId: typeof targetId === "number" ? targetId : undefined,
      description: `${actor.nama} membuat divisi baru: ${divisi}`,
    })

    return NextResponse.json({
      message: "Divisi berhasil ditambahkan",
      data: inserted,
    })
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Unauthorized"
    ) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    if (
      error instanceof Error &&
      error.message === "Forbidden"
    ) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      )
    }

    console.error("[api-divisi] POST Error:", error)

    return NextResponse.json(
      {
        error: "Gagal menambahkan divisi",
      },
      { status: 500 }
    )
  }
}