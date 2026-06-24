import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabaseServer"
import { requireAdminSession, requireRole } from "@/lib/auth-server"
import type { Database } from "@/lib/supabase-types"

export async function GET() {
  try {
    await requireRole(["admin", "superadmin", "panitia"] as const)
    const supabase = await createClient()

    const { data: classes, error } = await supabase
      .from("classes")
      .select("*")
      .order("nama", { ascending: true })

    const typedClasses = classes as Array<
      Database["public"]["Tables"]["classes"]["Row"]
    >

    if (!error) {
      return NextResponse.json({
        classes: typedClasses.map((c) => c.nama),
      })
    }

    const { data: users, error: userError } = await supabase
      .from("users")
      .select("kelas")

    if (userError) throw userError

    const typedUsers = users as Array<
      Database["public"]["Tables"]["users"]["Row"]
    >

    const uniqueClasses = [...new Set(typedUsers.map((u) => u.kelas))]
      .filter(Boolean)
      .sort()

    return NextResponse.json({ classes: uniqueClasses })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    console.error("[api-classes] Error:", error)
    return NextResponse.json(
      { error: "Gagal mengambil daftar kelas" },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    await requireAdminSession()
    const { nama } = (await req.json()) as { nama?: string }
    if (!nama) {
      return NextResponse.json(
        { error: "Nama kelas wajib diisi" },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from("classes")
      .insert([{ nama }])
      .select()

    if (error) throw error

    return NextResponse.json({
      message: "Kelas berhasil ditambahkan",
      data,
    })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    console.error("[api-classes] POST Error:", error)
    return NextResponse.json(
      {
        error:
          "Gagal menambahkan kelas. Pastikan tabel 'classes' sudah ada di Supabase.",
      },
      { status: 500 }
    )
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdminSession()
    const { searchParams } = new URL(req.url)
    const nama = searchParams.get("nama")

    if (!nama) {
      return NextResponse.json(
        { error: "Nama kelas wajib ada" },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { error } = await supabase.from("classes").delete().eq("nama", nama)

    if (error) throw error

    return NextResponse.json({ message: "Kelas berhasil dihapus" })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    console.error("[api-classes] DELETE Error:", error)
    return NextResponse.json(
      { error: "Gagal menghapus kelas" },
      { status: 500 }
    )
  }
}
