-- ============================================================
-- Disable RLS for audit_logs and impersonation_sessions
-- Alasan: App ini pakai custom cookie-based auth (bukan Supabase Auth JWT),
-- jadi RLS berbasis auth.uid() tidak relevan.
-- Akses dikontrol di level API route (requireAdminSession).
-- ============================================================

ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.impersonation_sessions DISABLE ROW LEVEL SECURITY;

-- Hapus policy lama kalau ada (opsional, tidak wajib)
DROP POLICY IF EXISTS "Allow anon read audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow anon insert audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow anon read impersonation_sessions" ON public.impersonation_sessions;
DROP POLICY IF EXISTS "Allow anon insert impersonation_sessions" ON public.impersonation_sessions;
DROP POLICY IF EXISTS "Allow anon update impersonation_sessions" ON public.impersonation_sessions;
