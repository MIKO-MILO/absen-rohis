/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { identifier, password } = body; // identifier bisa email atau NIS

    if (!identifier || !password) {
      return Response.json(
        { error: "Username/Email/NIS dan Password wajib diisi" },
        { status: 400 }
      );
    }

    // 1. Cek di tabel Admin (biasanya email & password)
    // Asumsi tabel admins: email, password, role
    const { data: adminData } = await supabase
      .from("admins")
      .select("*")
      .eq("email", identifier)
      .eq("password", password)
      .maybeSingle();

    if (adminData) {
      return Response.json({
        user: adminData,
        role: "admin",
        redirect: "/admin/dashboard",
      });
    }

    // 2. Cek di tabel Panitia (email/NIS & password)
    // Asumsi tabel panitia: email, nis, password, role
    const { data: panitiaData } = await supabase
      .from("panitia")
      .select("*")
      .eq("email", identifier)
      .eq("password", password)
      .maybeSingle();

    if (panitiaData) {
      return Response.json({
        user: panitiaData,
        role: "panitia",
        redirect: "/rohis/home",
      });
    }

    // 3. Cek di tabel Users/Siswa (email & password)
    // Tabel users: email, password, role
    const { data: userData } = await supabase
      .from("users")
      .select("*")
      .eq("email", identifier)
      .eq("password", password)
      .maybeSingle();

    if (userData) {
      return Response.json({
        user: userData,
        role: "siswa",
        redirect: "/user/home",
      });
    }

    return Response.json(
      { error: "Kredensial tidak valid" },
      { status: 401 }
    );
  } catch (error: any) {
    console.error("Login error:", error);
    return Response.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
