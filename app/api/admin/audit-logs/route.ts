import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth-server";
import { createClient } from "@/lib/supabaseServer";

export async function GET(request: Request) {
  try {
    await requireAdminSession();

    const { searchParams } = new URL(request.url);
    const page       = parseInt(searchParams.get("page")  || "1",  10);
    const limit      = parseInt(searchParams.get("limit") || "15", 10);
    const search     = searchParams.get("search")   || "";
    const roleFilter = searchParams.get("role")     || "";
    const dateFrom   = searchParams.get("dateFrom") || "";
    const dateTo     = searchParams.get("dateTo")   || "";
    const offset = (page - 1) * limit;

    const supabase = await createClient();

    // ── 1. Ambil semua admin untuk di-join in-memory ──────────────────────
    const { data: admins } = await supabase
      .from("admin")
      .select("id, nama, role");

    const adminMap: Record<number, { nama: string; role: string }> =
      Object.fromEntries((admins ?? []).map((a) => [a.id, { nama: a.nama, role: a.role }]));

    // ── 2. Query audit_logs dengan filter tanggal & action ────────────────
    let query = supabase
      .from("audit_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (dateFrom) query = query.gte("created_at", dateFrom);
    if (dateTo)   query = query.lte("created_at", `${dateTo}T23:59:59`);

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error("Failed to fetch audit logs:", error);
      return NextResponse.json(
        { error: "Failed to fetch audit logs", detail: error.message },
        { status: 500 }
      );
    }

    // ── 3. Enrich dengan data admin (JOIN in-memory) ──────────────────────
    const enriched = (data ?? []).map((log) => {
      const adminData = adminMap[log.admin_id as number];
      return {
        ...log,
        actor_id:   log.admin_id,
        actor_name: adminData?.nama ?? "—",
        actor_role: adminData?.role ?? "admin",
      };
    });

    // ── 4. Filter role & search setelah enrich ────────────────────────────
    let finalData = enriched;

    if (roleFilter) {
      finalData = finalData.filter((l) => l.actor_role === roleFilter);
    }

    if (search) {
      const q = search.toLowerCase();
      finalData = finalData.filter(
        (l) =>
          l.actor_name?.toLowerCase().includes(q) ||
          l.action?.toLowerCase().includes(q) ||
          (l.description as string | null)?.toLowerCase().includes(q)
      );
    }

    return NextResponse.json({
      data:  finalData,
      total: count ?? finalData.length,
      page,
      limit,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Audit logs API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
