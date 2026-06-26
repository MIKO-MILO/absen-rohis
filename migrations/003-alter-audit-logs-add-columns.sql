-- ============================================================
-- Bersihkan skema audit_logs:
-- 1. Hapus kolom redundan (actor_id, actor_name, actor_role)
-- 2. Tambah kolom target_type & description jika belum ada
-- CATATAN: target_user_id TIDAK di-FK karena polymorphic
--   (bisa nunjuk ke users, panitia, atau admin)
--   target_type digunakan untuk mengetahui tabel mana yang dirujuk
-- ============================================================

-- Hapus kolom redundan
ALTER TABLE public.audit_logs
  DROP COLUMN IF EXISTS actor_id,
  DROP COLUMN IF EXISTS actor_name,
  DROP COLUMN IF EXISTS actor_role;

-- Tambah kolom description dan target_type jika belum ada
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS target_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS description TEXT;

-- Hapus FK jika sempat terbuat (karena target_user_id polymorphic)
ALTER TABLE public.audit_logs
  DROP CONSTRAINT IF EXISTS fk_audit_logs_target_user;

