import { createClient } from "@/lib/supabaseServer"
import { setSessionCookie } from "@/lib/auth-server"
import type { SessionData } from "@/lib/auth-client"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { identifier, password } = body

    if (!identifier || !password) {
      return Response.json(
        { error: "Username/Email/NIS dan Password wajib diisi" },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    let sessionData: SessionData | null = null
    let redirectUrl: string | null = null

    // 1. Cek di tabel Admin
    const { data: adminData } = await supabase
      .from("admin")
      .select("*")
      .eq("username", identifier)
      .maybeSingle()

    console.log("[LOGIN API] Admin data:", adminData)

    if (adminData && adminData.password === password) {
      sessionData = {
        id: adminData.id,
        username: adminData.username,
        nama: adminData.nama,
        role: adminData.role || "admin",
      }
      redirectUrl = "/admin/dashboard"
    } else {
      // 2. Cek di tabel Panitia
      const { data: panitiaData } = await supabase
        .from("panitia")
        .select("*")
        .or(`email.eq.${identifier}`)
        .maybeSingle()

      console.log("[LOGIN API] Panitia data:", panitiaData)

      if (panitiaData && panitiaData.password === password) {
        sessionData = {
          id: panitiaData.id,
          nama: panitiaData.nama,
          role: "panitia",
          divisi: panitiaData.divisi,
        }
        redirectUrl = "/rohis/home"
      } else {
        // 3. Cek di tabel Users/Siswa
        const { data: userData } = await supabase
          .from("users")
          .select("*")
          .eq("email", identifier)
          .maybeSingle()

        console.log("[LOGIN API] User data:", userData)

        if (userData && userData.password === password) {
          sessionData = {
            id: userData.id,
            nama: userData.nama,
            role: "siswa",
            kelas: userData.kelas,
          }
          redirectUrl = "/user/home"
        }
      }
    }

    console.log("[LOGIN API] Final session data to return:", sessionData)

    if (!sessionData || !redirectUrl) {
      return Response.json(
        { error: "Email atau Password Salah" },
        { status: 401 }
      )
    }

    // Simpan session ke HttpOnly Cookie
    await setSessionCookie(sessionData)

    const responseJson = {
      user: sessionData,
      role: sessionData.role,
      redirect: redirectUrl,
    }

    console.log("[LOGIN API] Full API response:", responseJson)

    return Response.json(responseJson)
  } catch (error: unknown) {
    console.error("Login error:", error)
    return Response.json({ error: "Terjadi kesalahan server" }, { status: 500 })
  }
}
