-- ============================================================
-- Migration 008: Fix Ambiguous Column References in check_rate_limit
-- ============================================================
-- Bug: column reference "reset_at" is ambiguous (42702)
-- Root cause: Nama kolom "reset_at" di tabel rate_limit_buckets SAMA PERSIS
-- dengan nama output parameter RETURNS TABLE (reset_at TIMESTAMPTZ).
-- PL/pgSQL bingung: maksud variabel output atau kolom tabel?
-- Fix: Gunakan alias tabel untuk SEMUA referensi kolom di dalam query.

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key             VARCHAR,
  p_limit           INTEGER,
  p_window_seconds  INTEGER
)
RETURNS TABLE (
  allowed           BOOLEAN,
  remaining         INTEGER,
  reset_at          TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_now       TIMESTAMPTZ;
  v_reset_at  TIMESTAMPTZ;
  v_count     INTEGER;
BEGIN
  v_now := NOW();

  -- 1. Bersihkan bucket kadaluarsa (gunakan alias rlb untuk menghindari ambigu)
  DELETE FROM public.rate_limit_buckets AS rlb
  WHERE rlb.key = p_key AND rlb.reset_at <= v_now;

  -- 2. Upsert: insert bucket baru, atau increment jika sudah ada & belum expired.
  --    Semua kolom tabel prefix dengan alias rlb.
  INSERT INTO public.rate_limit_buckets AS rlb (key, count, reset_at, updated_at)
  VALUES (p_key, 1, v_now + (p_window_seconds || ' second')::INTERVAL, v_now)
  ON CONFLICT (key)
  DO UPDATE SET
    count = CASE
      WHEN rlb.reset_at <= v_now THEN 1
      ELSE rlb.count + 1
    END,
    reset_at = CASE
      WHEN rlb.reset_at <= v_now THEN v_now + (p_window_seconds || ' second')::INTERVAL
      ELSE rlb.reset_at
    END,
    updated_at = v_now
  RETURNING rlb.count, rlb.reset_at
  INTO v_count, v_reset_at;

  -- 3. Hasil: cek apakah masih dalam batas
  IF v_count <= p_limit THEN
    RETURN QUERY SELECT TRUE, p_limit - v_count, v_reset_at;
  ELSE
    RETURN QUERY SELECT FALSE, 0, v_reset_at;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION check_rate_limit FROM PUBLIC;
GRANT EXECUTE ON FUNCTION check_rate_limit TO authenticated;
GRANT EXECUTE ON FUNCTION check_rate_limit TO anon;


-- ============================================================
-- Preventive fix: cleanup_system_monitoring juga pakai alias
-- (mencegah bug serupa di masa depan)
-- ============================================================
CREATE OR REPLACE FUNCTION cleanup_system_monitoring(retention_days INTEGER)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_metrics_deleted INTEGER := 0;
  v_buckets_deleted INTEGER := 0;
  v_threshold_date  DATE;
  v_now             TIMESTAMPTZ;
BEGIN
  v_now := NOW();
  v_threshold_date := (v_now - (retention_days || ' days')::INTERVAL)::DATE;

  -- Delete old request metrics (alias rm)
  DELETE FROM public.request_metrics AS rm
  WHERE rm.bucket_date < v_threshold_date;
  GET DIAGNOSTICS v_metrics_deleted = ROW_COUNT;

  -- Delete expired rate limit buckets (alias rlb)
  DELETE FROM public.rate_limit_buckets AS rlb
  WHERE rlb.reset_at < v_now;
  GET DIAGNOSTICS v_buckets_deleted = ROW_COUNT;

  RETURN json_build_object(
    'request_metrics_deleted', v_metrics_deleted,
    'rate_limit_buckets_deleted', v_buckets_deleted,
    'executed_at', v_now
  );
END;
$$;

REVOKE ALL ON FUNCTION cleanup_system_monitoring FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cleanup_system_monitoring TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_system_monitoring TO anon;
