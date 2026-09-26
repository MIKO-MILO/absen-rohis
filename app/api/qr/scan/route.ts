import { supabase } from "@/lib/supabaseClient"
import { getGlobalConfig } from "@/lib/server-config"
import { isWithinTimeRestriction } from "@/lib/client-config"
import {
  requireAdminSession,
  requireAuthenticatedSession,
} from "@/lib/auth-server"
import type { SessionData } from "@/lib/auth-client"
import { withRequestMetrics } from "@/lib/request-metrics"
import { checkRateLimitPreset, rateLimitErrorResponse } from "@/lib/rate-limit"
import { checkRateLimit } from "@/lib/rate-limit"
import { createAuditLog } from "@/lib/audit-log"
import { createServiceClient } from "@/lib/supabaseServer"

export const dynamic = "force-dynamic"

function isValidDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const date = new Date(`${value}T00:00:00.000Z`)
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  )
}

interface QRToken {
  id: string | number
  token?: string
  aktif: boolean
  panitia_id: string | number | null
  expired_at?: string
  is_simulation?: boolean
}

interface AbsensiInsertResponse {
  id: number
  users: {
    nama: string
  } | null
}

interface AbsensiPayload {
  user_id?: string | number
  tanggal?: string
  waktu: string
  status: string
  panitia_id?: string | number | null
  admin_id?: string | number | null
}

export const POST = withRequestMetrics(async function POST(req: Request) {
  const rl = await checkRateLimitPreset({ req, scope: "qr-scan" })
  if (!rl.allowed) return rateLimitErrorResponse(rl.resetAt)

  try {
    const body = await req.json()
    const { token, status, user_id, qr_token, tanggal } = body

    const config = await getGlobalConfig()

    const isAdminUpdate = qr_token === "MANUAL_UPDATE"
    const targetUserId = Number(user_id)
    let adminSessionId: number | null = null
    let actorForAudit: SessionData | null = null

    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      return Response.json({ error: "User ID tidak valid" }, { status: 400 })
    }

    let isAdminTestingScan = false

    if (isAdminUpdate) {
      const adminSession = await requireAdminSession()
      actorForAudit = adminSession
      if (!isValidDate(tanggal)) {
        return Response.json(
          { error: "Tanggal absensi tidak valid" },
          { status: 400 }
        )
      }
      if (
        status !== "hadir" &&
        status !== "berhalangan" &&
        status !== "tidak_hadir"
      ) {
        return Response.json({ error: "Status tidak valid" }, { status: 400 })
      }

      adminSessionId = adminSession.id
    } else {
      const session = await requireAuthenticatedSession()
      actorForAudit = session

      isAdminTestingScan =
        (session.role === "admin" ||
          session.role === "superadmin" ||
          session.role === "panitia") &&
        session.id === targetUserId

      if (!isAdminTestingScan) {
        if (session.role !== "siswa" || session.id !== targetUserId) {
          return Response.json({ error: "Forbidden" }, { status: 403 })
        }
      }

      // ─── Rate Limiting (30 req/min per user, fail-open) ───────────────────
      const limitResult = await checkRateLimit({
        key: `rate:qr:user:${session.id}`,
        limit: 30,
        windowSeconds: 60,
        failClosed: false,
      })

      if (!limitResult.allowed) {
        const retryAfter = Math.max(
          0,
          Math.ceil((limitResult.resetAt.getTime() - Date.now()) / 1000)
        )
        return Response.json(
          { error: "Too many requests. Please try again later.", retryAfter },
          {
            status: 429,
            headers: {
              "Retry-After": String(retryAfter),
              "X-RateLimit-Limit": "30",
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": limitResult.resetAt.toISOString(),
            },
          }
        )
      }

      if (!token || (status !== "hadir" && status !== "berhalangan")) {
        return Response.json(
          { error: "Token atau status tidak valid" },
          { status: 400 }
        )
      }
    }

    let qr: QRToken

    if (isAdminUpdate) {
      qr = {
        id: "admin-update",
        aktif: true,
        panitia_id: null,
        is_simulation: true,
      }
    } else if (token === "ROHIS-DZUHUR-SIMULASI-TOKEN") {
      if (!config.ENABLE_SIMULATION) {
        return Response.json(
          { error: "Mode simulasi sedang dinonaktifkan" },
          { status: 403 }
        )
      }

      const { data: dummyPanitia } = await supabase
        .from("panitia")
        .select("id")
        .limit(1)
        .maybeSingle()

      qr = {
        id: "simulasi",
        aktif: true,
        panitia_id: dummyPanitia?.id || null,
        is_simulation: true,
      }
    } else {
      const { data, error: qrError } = await supabase
        .from("qr_token")
        .select("*")
        .eq("token", token)
        .maybeSingle()

      if (qrError || !data) {
        return Response.json(
          {
            error: "QR Code tidak valid atau sudah dihapus",
            redirectTo: "/admin",
          },
          { status: 400 }
        )
      }
      qr = data
    }

    if (!qr.aktif) {
      return Response.json(
        {
          error: "QR Code ini sudah dinonaktifkan / sudah dipakai sebelumnya.",
          redirectTo: "/admin",
        },
        { status: 400 }
      )
    }

    if (qr.expired_at && new Date() > new Date(qr.expired_at)) {
      return Response.json(
        { error: "QR Code sudah kadaluarsa", redirectTo: "/admin" },
        { status: 400 }
      )
    }

    // ── Test scan bypass untuk Admin/Panitia yang tidak ada di tabel users ──
    if (isAdminTestingScan && !isAdminUpdate) {
      const { data: userExists } = await supabase
        .from("users")
        .select("id, nama")
        .eq("id", targetUserId)
        .maybeSingle()

      if (!userExists) {
        const ses = actorForAudit
        if (ses) {
          await createAuditLog({
            actor: ses,
            action: "scan_qr",
            targetType: null,
            description: `${ses.nama} tested QR scan (admin bypass — no DB insert) — status: ${status}`,
          })
        }

        return Response.json({
          success: true,
          message: "Testing scan berhasil (bypass)",
          nama: actorForAudit?.nama || "Admin",
          _test: true,
        })
      }
    }

    const now = new Date()
    if (!isAdminUpdate && !isWithinTimeRestriction(now, config)) {
      const day = now.getDay()
      const hour = now.getHours()

      if (!config.ALLOW_ANY_DAY && day !== 5) {
        return Response.json(
          { error: "Absensi hanya tersedia di hari Jumat" },
          { status: 403 }
        )
      }

      if (!config.ALLOW_ANY_TIME && (hour < 12 || hour >= 14)) {
        return Response.json(
          { error: "Absensi hanya tersedia pukul 12:00 - 14:00 WIB" },
          { status: 403 }
        )
      }
    }

    const targetDate =
      isAdminUpdate && tanggal ? tanggal : now.toISOString().split("T")[0]

    const waktu = [
      now.getHours().toString().padStart(2, "0"),
      now.getMinutes().toString().padStart(2, "0"),
      now.getSeconds().toString().padStart(2, "0"),
    ].join(":")

    const mappedStatus =
      status === "berhalangan"
        ? "haid"
        : status === "tidak_hadir"
          ? "tidak_hadir"
          : "hadir"

    const { data: existingAbsensi } = await supabase
      .from("absensi")
      .select("id")
      .eq("user_id", targetUserId)
      .eq("tanggal", targetDate)
      .maybeSingle()

    let resultData, resultError

    if (existingAbsensi) {
      const updatePayload: AbsensiPayload = {
        waktu,
        status: mappedStatus,
      }

      if (isAdminUpdate) {
        updatePayload.admin_id = adminSessionId
      } else {
        updatePayload.panitia_id = qr.panitia_id
      }

      const { data: updateData, error: updateError } = await supabase
        .from("absensi")
        .update(updatePayload)
        .eq("id", existingAbsensi.id)
        .select(
          `
          *,
          users (
            nama
          )
        `
        )
        .single()
      resultData = updateData
      resultError = updateError
    } else {
      const insertPayload: AbsensiPayload = {
        user_id: targetUserId,
        tanggal: targetDate,
        waktu,
        status: mappedStatus,
        panitia_id: qr.panitia_id,
      }

      if (isAdminUpdate) {
        insertPayload.admin_id = adminSessionId
      }

      const { data: insertData, error: insertError } = await supabase
        .from("absensi")
        .insert([insertPayload])
        .select(
          `
          *,
          users (
            nama
          )
        `
        )
        .single()
      resultData = insertData
      resultError = insertError
    }

    if (resultError) {
      console.error("Database Operation Error:", resultError)
      throw new Error(`Gagal menyimpan data: ${resultError.message}`)
    }

    const finalData = resultData as AbsensiInsertResponse

    const isPanitiaQR = qr.panitia_id !== null && qr.panitia_id !== undefined
    if (!qr.is_simulation && (isPanitiaQR || config.ENABLE_ONE_TIME_SCAN)) {
      try {
        const serviceSupabase = await createServiceClient()
        const { error: updateQR } = await serviceSupabase
          .from("qr_token")
          .update({ aktif: false })
          .eq("id", Number(qr.id))
        if (updateQR) {
          console.error("[SCAN QR] Gagal nonaktifkan QR token:", updateQR)
        } else {
          console.log(
            "[SCAN QR] Berhasil nonaktifkan QR token id:",
            qr.id,
            "isPanitiaQR:",
            isPanitiaQR
          )
        }
      } catch (svcErr: unknown) {
        console.error(
          "[SCAN QR] Exception saat nonaktifkan QR via service client:",
          svcErr
        )
      }
    }

    if (actorForAudit) {
      await createAuditLog({
        actor: actorForAudit,
        action: "scan_qr",
        targetType: "absensi",
        targetId: finalData?.id,
        description: isAdminUpdate
          ? `${actorForAudit.nama} manually recorded attendance for ${finalData?.users?.nama || `user:${targetUserId}`} (${mappedStatus})`
          : `${actorForAudit.nama} scanned QR and marked attendance as ${mappedStatus}`,
      })
    }

    return Response.json({
      success: true,
      message: "Absensi berhasil dicatat",
      nama: finalData?.users?.nama || "Siswa",
    })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (err instanceof Error && err.message === "Forbidden") {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }
    console.error("Scan QR Route Error:", err)
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan server"
    return Response.json({ error: msg }, { status: 500 })
  }
})
