-- ============================================================
-- Perbaikan skema audit_logs agar kompatibel dengan aplikasi:
-- 1. Tambah kolom admin_id (foreign actor) jika belum ada
-- 2. Tambah kolom target_user_id jika belum ada
-- 3. Pastikan target_type dan description tetap ada
-- 4. Tambah index jika belum ada
-- ============================================================

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS admin_id INTEGER;

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS target_user_id INTEGER;

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS target_type VARCHAR(50);

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS description TEXT;

CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id      ON public.audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at    ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action        ON public.audit_logs(action);
