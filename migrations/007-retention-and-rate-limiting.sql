-- ============================================================
-- Migration 007: Retention & Rate Limiting System
-- ============================================================

-- 1. Create rate_limit_buckets table
CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  key         VARCHAR(255) PRIMARY KEY,
  count       INTEGER NOT NULL DEFAULT 0,
  reset_at    TIMESTAMPTZ NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index reset_at for fast cleanup
CREATE INDEX IF NOT EXISTS idx_rate_limit_buckets_reset_at 
  ON public.rate_limit_buckets(reset_at);

-- Enable RLS for rate_limit_buckets
ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;

-- Allow insert/update to all for serverless access (protected by api keys)
DROP POLICY IF EXISTS rate_limit_buckets_all_policy ON public.rate_limit_buckets;
CREATE POLICY rate_limit_buckets_all_policy
  ON public.rate_limit_buckets FOR ALL
  USING (true)
  WITH CHECK (true);


-- 2. SQL Function: Database Cleanup
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

  -- Delete old request metrics
  DELETE FROM public.request_metrics
  WHERE bucket_date < v_threshold_date;
  GET DIAGNOSTICS v_metrics_deleted = ROW_COUNT;

  -- Delete expired rate limit buckets
  DELETE FROM public.rate_limit_buckets
  WHERE reset_at < v_now;
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


-- 3. SQL Function: Atomic Rate Limiting Check
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
  
  -- Clean up expired bucket if we query it
  DELETE FROM public.rate_limit_buckets
  WHERE key = p_key AND reset_at <= v_now;

  -- Attempt to insert new bucket
  INSERT INTO public.rate_limit_buckets (key, count, reset_at, updated_at)
  VALUES (p_key, 1, v_now + (p_window_seconds || ' second')::INTERVAL, v_now)
  ON CONFLICT (key)
  DO UPDATE SET
    count = CASE 
      WHEN public.rate_limit_buckets.reset_at <= v_now THEN 1
      ELSE public.rate_limit_buckets.count + 1
    END,
    reset_at = CASE 
      WHEN public.rate_limit_buckets.reset_at <= v_now THEN v_now + (p_window_seconds || ' second')::INTERVAL
      ELSE public.rate_limit_buckets.reset_at
    END,
    updated_at = v_now
  RETURNING public.rate_limit_buckets.count, public.rate_limit_buckets.reset_at
  INTO v_count, v_reset_at;

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
