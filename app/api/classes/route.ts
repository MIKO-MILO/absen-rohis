/**
 * app/api/classes/route.ts
 * Manajemen daftar kelas (CRUD)
 */

import { NextResponse } from "next/server"
import { supabase } from "../../../lib/supabaseClient"

export async function GET() {
  try {
    // 1. Coba ambil dari tabel 'classes'
    const { data: classes, error } = await supabase
      .from("classes")
      .select("*")
      .order("nama", { ascending: true })

    if (!error) {
      return NextResponse.json({ classes: classes.map(c => c.nama) })
    }

    // 2. Fallback: ambil unik dari tabel 'users' jika tabel 'classes' belum ada
    const { data: users, error: userError } = await supabase
      .from("users")
      .select("kelas")

    if (userError) throw userError

    const uniqueClasses = [...new Set((users || []).map(u => u.kelas))]
      .filter(Boolean)
      .sort()

    return NextResponse.json({ classes: uniqueClasses })
  } catch (err) {
    console.error("[api-classes] Error:", err)
    return NextResponse.json(
      { error: "Gagal mengambil daftar kelas" },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const { nama } = await req.json()
    if (!nama) {
      return NextResponse.json({ error: "Nama kelas wajib diisi" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("classes")
      .insert([{ nama }])
      .select()

    if (error) throw error

    return NextResponse.json({ message: "Kelas berhasil ditambahkan", data })
  } catch (err) {
    console.error("[api-classes] POST Error:", err)
    return NextResponse.json(
      { error: "Gagal menambahkan kelas. Pastikan tabel 'classes' sudah ada di Supabase." },
      { status: 500 }
    )
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const nama = searchParams.get("nama")

    if (!nama) {
      return NextResponse.json({ error: "Nama kelas wajib ada" }, { status: 400 })
    }

    const { error } = await supabase
      .from("classes")
      .delete()
      .eq("nama", nama)

    if (error) throw error

    return NextResponse.json({ message: "Kelas berhasil dihapus" })
  } catch (err) {
    console.error("[api-classes] DELETE Error:", err)
    return NextResponse.json(
      { error: "Gagal menghapus kelas" },
      { status: 500 }
    )
  }
}
