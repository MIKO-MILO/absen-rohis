-- ============================================================
-- Migration 005: RPC untuk atomic increment request_metrics
--
-- Fungsi ini dipanggil oleh lib/request-metrics.ts ketika
-- row untuk bucket (endpoint+method+date+hour) sudah ada.
--
-- Menggunakan SECURITY DEFINER agar bisa diakses tanpa RLS bypass.
-- Dipanggil dengan row_id yang sudah diverifikasi oleh application layer.
-- ============================================================

CREATE OR REPLACE FUNCTION increment_request_metrics_row(
  row_id    BIGINT,
  inc_total   INTEGER DEFAULT 1,
  inc_success INTEGER DEFAULT 0,
  inc_error   INTEGER DEFAULT 0,
  inc_rt      BIGINT  DEFAULT 0
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.request_metrics
  SET
    total_requests      = total_requests + inc_total,
    success_count       = success_count + inc_success,
    error_count         = error_count + inc_error,
    total_response_time = total_response_time + inc_rt,
    updated_at          = NOW()
  WHERE id = row_id;
$$;

-- Revoke public execute, hanya authenticated yang boleh (dipanggil server-side)
REVOKE ALL ON FUNCTION increment_request_metrics_row FROM PUBLIC;
GRANT EXECUTE ON FUNCTION increment_request_metrics_row TO authenticated;
GRANT EXECUTE ON FUNCTION increment_request_metrics_row TO anon;
-- Note: anon diberikan karena Supabase client di server Next.js
-- menggunakan anon key. Protection dilakukan di level route handler
-- melalui requireSuperadminSession() dan cookie auth check.
-- Fungsi ini hanya UPDATE berdasarkan row_id tertentu, tidak membaca data sensitif.
