import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabaseServer"
import { requireAdminSession } from "@/lib/auth-server"
import { getGlobalConfig } from "@/lib/test-config"
import type { Database } from "@/lib/supabase-types"

export async function POST() {
  try {
    await requireAdminSession()
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

    const { data: allUsers, error: usersError } = await supabase
      .from("users")
      .select("id")

    if (usersError) throw usersError

    if (!allUsers || allUsers.length === 0) {
      return NextResponse.json({ message: "Tidak ada user ditemukan" })
    }

    const typedAllUsers = allUsers as Array<
      Database["public"]["Tables"]["users"]["Row"]
    >

    const { data: absensiHariIni, error: absensiError } = await supabase
      .from("absensi")
      .select("user_id")
      .eq("tanggal", today)

    if (absensiError) throw absensiError

    const typedAbsensiHariIni = absensiHariIni as Array<
      Database["public"]["Tables"]["absensi"]["Row"]
    >

    const userIdsAbsenHariIni = new Set(
      typedAbsensiHariIni?.map((a) => a.user_id) || []
    )
    const usersBelumAbsen = typedAllUsers.filter(
      (u) => !userIdsAbsenHariIni.has(u.id)
    )

    if (usersBelumAbsen.length === 0) {
      return NextResponse.json({ message: "Semua user sudah absen hari ini" })
    }

    const absensiToUpsert: Array<
      Omit<Database["public"]["Tables"]["absensi"]["Row"], "id">
    > = usersBelumAbsen.map((user) => ({
      user_id: user.id,
      tanggal: today,
      waktu: "14:00:00",
      status: "tidak_hadir",
      panitia_id: null,
    }))

    const { error: upsertError } = await supabase
      .from("absensi")
      .upsert(absensiToUpsert, { onConflict: "user_id,tanggal" })

    if (upsertError) throw upsertError

    return NextResponse.json({
      success: true,
      message: `Berhasil menandai ${usersBelumAbsen.length} user sebagai tidak hadir`,
      count: usersBelumAbsen.length,
    })
  } catch (error) {
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
}
