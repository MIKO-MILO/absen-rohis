import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabaseServer"
import { requireAuthenticatedSession } from "@/lib/auth-server"
import { canAccessUserData } from "@/lib/auth-client"
import type { AbsensiWithUserSummary } from "@/lib/supabase-types"
import { withRequestMetrics } from "@/lib/request-metrics"
import { safePagination, COST_SAFETY } from "@/lib/cost-safety"
import { checkRateLimitPreset, rateLimitErrorResponse } from "@/lib/rate-limit"

import {
  costGuardObserveRequest,
  emergencyModeResponseIfActive,
  withSlowQuerySampling,
  capResponseItems,
  withRequestDeduplication,
} from "@/lib/cost-guard"

const ABSENSI_COLUMNS_WITH_USER = `
  id, user_id, panitia_id, tanggal, waktu, status, created_at, updated_at,
  users ( nama, nis, kelas, jenis_kelamin )
`
const HARD_LIST_LIMIT = 5000

export const GET = withRequestMetrics(async function GET(req: NextRequest) {
  costGuardObserveRequest(req)
  const emergencyResp = emergencyModeResponseIfActive(req)
  if (emergencyResp) return emergencyResp

  try {
    const rl = await checkRateLimitPreset({ req, scope: "auth" })
    if (!rl.allowed) return rateLimitErrorResponse(rl.resetAt)

    const session = await requireAuthenticatedSession()
    
    // Wrap entire logic inside deduplication to prevent identical overlapping GETs
    return withRequestDeduplication(req, session.id, async () => {
      const { searchParams } = new URL(req.url)
      const user_id = searchParams.get("user_id")
    const panitia_id = searchParams.get("panitia_id")
    const tanggal = searchParams.get("tanggal")
    const sholat = searchParams.get("sholat")
    const status = searchParams.get("status")

    const wantsPagination =
      searchParams.has("page") ||
      searchParams.has("limit") ||
      searchParams.has("perPage") ||
      searchParams.has("pageSize")

    const supabase = await createClient()

    if (user_id && !canAccessUserData(session, user_id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    let countQuery = supabase
      .from("absensi")
      .select("id", { count: "exact", head: true })
    let listQuery = supabase.from("absensi").select(ABSENSI_COLUMNS_WITH_USER)

    if (session.role === "siswa") {
      countQuery = countQuery.eq("user_id", session.id)
      listQuery = listQuery.eq("user_id", session.id)
    } else if (user_id) {
      const targetUserId = isNaN(Number(user_id)) ? user_id : Number(user_id)
      countQuery = countQuery.eq("user_id", targetUserId)
      listQuery = listQuery.eq("user_id", targetUserId)
    }
    if (panitia_id) {
      const pid = isNaN(Number(panitia_id)) ? panitia_id : Number(panitia_id)
      countQuery = countQuery.eq("panitia_id", pid)
      listQuery = listQuery.eq("panitia_id", pid)
    }
    if (tanggal) {
      countQuery = countQuery.eq("tanggal", tanggal)
      listQuery = listQuery.eq("tanggal", tanggal)
    }
    if (sholat) {
      countQuery = countQuery.eq("sholat", sholat)
      listQuery = listQuery.eq("sholat", sholat)
    }
    if (status) {
      countQuery = countQuery.eq("status", status)
      listQuery = listQuery.eq("status", status)
    }

    listQuery = listQuery
      .order("tanggal", { ascending: false })
      .order("waktu", { ascending: false })

    if (wantsPagination) {
      const { page, pageSize, offset } = safePagination(searchParams)
      listQuery = listQuery.range(offset, offset + pageSize - 1)
      const { count, error: countErr } = await withSlowQuerySampling("absensi-get-count", "select", () => countQuery)
      if (countErr) throw countErr
      const { data, error: listErr } = await withSlowQuerySampling("absensi-get-list", "select", () => listQuery)
      if (listErr) throw listErr
      const typedData = (data ?? []) as unknown as AbsensiWithUserSummary[]
      return NextResponse.json({
        data: typedData,
        total: count ?? 0,
        page,
        pageSize,
        maxPageSize: COST_SAFETY.pagination.maxPageSize,
      })
    }

    listQuery = listQuery.limit(HARD_LIST_LIMIT)
    const { data, error } = await withSlowQuerySampling("absensi-get-list-nopage", "select", () => listQuery)
    if (error) {
      console.error("SUPABASE ERROR [absensi GET]:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    const typedData = (data ?? []) as unknown as AbsensiWithUserSummary[]
    const cappedData = capResponseItems(typedData, "absensi-get")
    return NextResponse.json(cappedData)
    })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    console.error("[api/absensi GET]", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
})
