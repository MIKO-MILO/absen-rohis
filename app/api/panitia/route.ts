import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabaseServer"
import { requireAdminSession, requireRole } from "@/lib/auth-server"
import type { Database } from "@/lib/supabase-types"
import { withRequestMetrics } from "@/lib/request-metrics"
import { safePagination, COST_SAFETY } from "@/lib/cost-safety"
import { checkRateLimitPreset, rateLimitErrorResponse } from "@/lib/rate-limit"

type PanitiaRow = Database["public"]["Tables"]["panitia"]["Row"]

const PUBLIC_PANITIA_COLUMNS = `id, nama, divisi, jenis_kelamin, email, password`
const HARD_LIST_LIMIT = 2000

export const GET = withRequestMetrics(async function GET(req: NextRequest) {
  try {
    const rl = await checkRateLimitPreset({ req, scope: "auth" })
    if (!rl.allowed) return rateLimitErrorResponse(rl.resetAt)

    await requireRole(["admin", "superadmin", "panitia"] as const)
    const { searchParams } = new URL(req.url)

    const wantsPagination =
      searchParams.has("page") ||
      searchParams.has("limit") ||
      searchParams.has("perPage") ||
      searchParams.has("pageSize")

    const search = searchParams.get("search")?.toString().trim() ?? ""

    const supabase = await createClient()

    let countQuery = supabase
      .from("panitia")
      .select("id", { count: "exact", head: true })
    let listQuery = supabase.from("panitia").select(PUBLIC_PANITIA_COLUMNS)

    if (search) {
      const pattern = `%${search}%`
      const clause = `nama.ilike.${pattern},divisi.ilike.${pattern}`
      countQuery = countQuery.or(clause)
      listQuery = listQuery.or(clause)
    }

    listQuery = listQuery.order("nama", { ascending: true })

    if (wantsPagination) {
      const { page, pageSize, offset } = safePagination(searchParams)
      listQuery = listQuery.range(offset, offset + pageSize - 1)
      const { count, error: countErr } = await countQuery
      if (countErr) throw countErr
      const { data, error: listErr } = await listQuery
      if (listErr) throw listErr
      return NextResponse.json({
        data: (data ?? []) as unknown as PanitiaRow[],
        total: count ?? 0,
        page,
        pageSize,
        maxPageSize: COST_SAFETY.pagination.maxPageSize,
      })
    }

    listQuery = listQuery.limit(HARD_LIST_LIMIT)
    const { data, error } = await listQuery
    if (error) throw error
    return NextResponse.json(data as unknown as PanitiaRow[])
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    console.error("[api/panitia GET]", error)
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

    await requireAdminSession()
    const body = await req.json()

    let panitia: Array<
      Partial<Database["public"]["Tables"]["panitia"]["Insert"]>
    > = []

    if (Array.isArray(body.panitia)) {
      panitia = body.panitia as Array<
        Partial<Database["public"]["Tables"]["panitia"]["Insert"]>
      >
      if (panitia.length > 200) {
        return NextResponse.json(
          { error: "Maksimal 200 data per request bulk insert" },
          { status: 413 }
        )
      }
    } else {
      panitia = [
        body as Partial<Database["public"]["Tables"]["panitia"]["Insert"]>,
      ]
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from("panitia")
      .insert(panitia)
      .select(PUBLIC_PANITIA_COLUMNS)

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
    console.error("[api/panitia POST]", error)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
})
