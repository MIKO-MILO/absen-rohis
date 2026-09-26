import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabaseServer"
import { requireAdminSession } from "@/lib/auth-server"
import { getGlobalConfig } from "@/lib/server-config"
import type { AbsensiInsert } from "@/lib/app-types"
import { withRequestMetrics } from "@/lib/request-metrics"
import { createAuditLog } from "@/lib/audit-log"
import {
  costGuardObserveRequest,
  emergencyModeResponseIfActive,
  circuitBreakerCheck,
  circuitBreakerReportFailure,
  cronTryClaimLock,
  heavyEndpointBusyResponse,
  checkBulkSafe,
  withSlowQuerySampling,
} from "@/lib/cost-guard"
import { checkRateLimitPreset, rateLimitErrorResponse } from "@/lib/rate-limit"

export const POST = withRequestMetrics(async function POST(req: NextRequest) {
  costGuardObserveRequest(req)
  const emergencyResp = emergencyModeResponseIfActive(req)
  if (emergencyResp) return emergencyResp

  const rl = await checkRateLimitPreset({
    req,
    scope: "sensitive",
    failClosed: true,
  })
  if (!rl.allowed) return rateLimitErrorResponse(rl.resetAt)

  const cb = circuitBreakerCheck("auto-mark-tidak-hadir")
  if (cb.open) {
    const cd = Math.max(
      1,
      Math.ceil(
        ((cb.retryAt?.getTime() ?? Date.now() + 60_000) - Date.now()) / 1000
      )
    )
    return heavyEndpointBusyResponse(cd)
  }

  try {
    const actor = await requireAdminSession()
    const config = await getGlobalConfig()

    if (!config.ENABLE_FORGOT_SIGN_IN) {
      return NextResponse.json(
        { error: "Fitur auto mark tidak hadir dinonaktifkan" },
        { status: 400 }
      )
    }

    const now = new Date()
    const isFriday = now.getDay() === 5

    if (!isFriday && !config.ENABLE_SIMULATION) {
      return NextResponse.json(
        { error: "Auto mark hanya berjalan pada hari Jumat" },
        { status: 400 }
      )
    }

    const today = now.toISOString().split("T")[0]
    const supabase = await createClient()

    const lock = await cronTryClaimLock(
      supabase,
      `auto-mark-tidak-hadir:${today}`,
      600
    )

    const { data: allUsers, error: usersError } = await withSlowQuerySampling(
      "auto-mark:users",
      "select",
      () => supabase.from("users").select("id").limit(100_000)
    )

    if (usersError) throw usersError

    if (!allUsers || allUsers.length === 0) {
      await lock.release()
      return NextResponse.json({ message: "Tidak ada user ditemukan" })
    }

    type UserIdRow = { id: number }

    const typedAllUsers = allUsers as Array<UserIdRow>

    const { data: absensiHariIni, error: absensiError } =
      await withSlowQuerySampling("auto-mark:absensi-today", "select", () =>
        supabase
          .from("absensi")
          .select("user_id")
          .eq("tanggal", today)
          .limit(100_000)
      )

    if (absensiError) throw absensiError

    type AbsensiUserIdRow = { user_id: number | null }
    const typedAbsensiHariIni = absensiHariIni as Array<AbsensiUserIdRow>

    const userIdsAbsenHariIni = new Set(
      typedAbsensiHariIni
        ?.map((a) => a.user_id)
        .filter((id): id is number => id !== null) || []
    )
    const usersBelumAbsen = typedAllUsers.filter(
      (u) => !userIdsAbsenHariIni.has(u.id)
    )

    if (usersBelumAbsen.length === 0) {
      await lock.release()
      return NextResponse.json({
        message: "Semua user sudah absen hari ini",
      })
    }

    const bulkCheck = checkBulkSafe(usersBelumAbsen.length)
    const chunkSize = bulkCheck.ok ? Math.max(1, usersBelumAbsen.length) : 200

    let totalSuccess = 0
    let chunkCursor = 0

    while (chunkCursor < usersBelumAbsen.length) {
      const chunk = usersBelumAbsen.slice(chunkCursor, chunkCursor + chunkSize)
      const absensiToUpsert: AbsensiInsert[] = chunk.map((user) => ({
        user_id: user.id,
        tanggal: today,
        waktu: "14:00:00",
        status: "tidak_hadir",
        panitia_id: null,
      }))

      const { error: upsertError } = await withSlowQuerySampling(
        "auto-mark:upsert-chunk",
        "insert",
        () =>
          supabase
            .from("absensi")
            .upsert(absensiToUpsert, { onConflict: "user_id,tanggal" })
      )

      if (upsertError) throw upsertError
      totalSuccess += chunk.length
      chunkCursor += chunkSize
    }

    await lock.release()

    await createAuditLog({
      actor,
      action: "auto_mark_tidak_hadir",
      targetType: "absensi",
      description: `${actor.nama} menjalankan auto-mark-tidak-hadir: ${totalSuccess} user ditandai pada tanggal ${today}`,
    })

    return NextResponse.json({
      success: true,
      message: `Berhasil menandai ${totalSuccess} user sebagai tidak hadir`,
      count: totalSuccess,
      chunked: !bulkCheck.ok,
      chunkSize,
    })
  } catch (error) {
    circuitBreakerReportFailure("auto-mark-tidak-hadir")
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    console.error("Auto mark tidak hadir error:", error)
    return NextResponse.json(
      { error: "Gagal menandai user sebagai tidak hadir" },
      { status: 500 }
    )
  }
})
