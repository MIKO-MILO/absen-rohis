-- ============================================================
-- Migration 006: System Monitoring Optimization & RPC Refactor
-- ============================================================

-- 1. Atomic upsert to replace the multi-step Insert-Select-RPC flow
CREATE OR REPLACE FUNCTION upsert_request_metrics(
  p_endpoint          VARCHAR,
  p_method            VARCHAR,
  p_bucket_date       DATE,
  p_bucket_hour       SMALLINT,
  p_inc_total         INTEGER,
  p_inc_success       INTEGER,
  p_inc_error         INTEGER,
  p_inc_rt            BIGINT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.request_metrics (
    endpoint,
    method,
    bucket_date,
    bucket_hour,
    total_requests,
    success_count,
    error_count,
    total_response_time
  )
  VALUES (
    p_endpoint,
    p_method,
    p_bucket_date,
    p_bucket_hour,
    p_inc_total,
    p_inc_success,
    p_inc_error,
    p_inc_rt
  )
  ON CONFLICT (endpoint, method, bucket_date, bucket_hour)
  DO UPDATE SET
    total_requests      = public.request_metrics.total_requests + EXCLUDED.total_requests,
    success_count       = public.request_metrics.success_count + EXCLUDED.success_count,
    error_count         = public.request_metrics.error_count + EXCLUDED.error_count,
    total_response_time = public.request_metrics.total_response_time + EXCLUDED.total_response_time,
    updated_at          = NOW();
END;
$$;

REVOKE ALL ON FUNCTION upsert_request_metrics FROM PUBLIC;
GRANT EXECUTE ON FUNCTION upsert_request_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_request_metrics TO anon;


-- 2. Database-level pagination, sorting, and filtering for Error Monitor
CREATE OR REPLACE FUNCTION get_error_metrics(
  p_start_date   DATE,
  p_end_date     DATE,
  p_start_hour   INT,
  p_end_hour     INT,
  p_is_same_day  BOOLEAN,
  p_method       VARCHAR,
  p_search       VARCHAR,
  p_sort_key     VARCHAR,
  p_sort_dir     VARCHAR,
  p_page         INT,
  p_limit        INT
)
RETURNS TABLE (
  endpoint            VARCHAR,
  method              VARCHAR,
  total_requests      BIGINT,
  success_count       BIGINT,
  error_count         BIGINT,
  error_rate          DOUBLE PRECISION,
  avg_response_time   BIGINT,
  total_count         BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offset INT;
  v_sql    TEXT;
BEGIN
  v_offset := (p_page - 1) * p_limit;
  
  -- Validate sort key and direction to prevent SQL injection
  IF p_sort_key NOT IN ('endpoint', 'method', 'total_requests', 'success_count', 'error_count', 'error_rate', 'avg_response_time') THEN
    p_sort_key := 'error_count';
  END IF;
  IF p_sort_dir NOT IN ('asc', 'desc', 'ASC', 'DESC') THEN
    p_sort_dir := 'DESC';
  END IF;

  v_sql := '
    WITH aggregated AS (
      SELECT
        m.endpoint,
        m.method,
        SUM(m.total_requests)::BIGINT as s_total_requests,
        SUM(m.success_count)::BIGINT as s_success_count,
        SUM(m.error_count)::BIGINT as s_error_count,
        SUM(m.total_response_time)::BIGINT as s_total_rt
      FROM public.request_metrics m
      WHERE m.bucket_date >= $1
        AND m.bucket_date <= $2
        AND (NOT $3 OR (m.bucket_hour >= $4 AND m.bucket_hour <= $5))
        AND ($6 IS NULL OR m.method = $6)
        AND ($7 IS NULL OR m.endpoint ILIKE ''%'' || $7 || ''%'')
      GROUP BY m.endpoint, m.method
      HAVING SUM(m.error_count) > 0
    ),
    sorted AS (
      SELECT
        a.endpoint,
        a.method,
        a.s_total_requests as total_requests,
        a.s_success_count as success_count,
        a.s_error_count as error_count,
        CASE 
          WHEN a.s_total_requests > 0 THEN (a.s_error_count::DOUBLE PRECISION / a.s_total_requests::DOUBLE PRECISION) * 100.0
          ELSE 0.0
        END as error_rate,
        CASE 
          WHEN a.s_total_requests > 0 THEN (a.s_total_rt / a.s_total_requests)::BIGINT
          ELSE 0::BIGINT
        END as avg_response_time,
        COUNT(*) OVER()::BIGINT as total_count
      FROM aggregated a
    )
    SELECT
      s.endpoint,
      s.method,
      s.total_requests,
      s.success_count,
      s.error_count,
      s.error_rate,
      s.avg_response_time,
      s.total_count
    FROM sorted s
    ORDER BY ' || quote_ident(p_sort_key) || ' ' || p_sort_dir || '
    LIMIT $8
    OFFSET $9';

  RETURN QUERY EXECUTE v_sql
    USING p_start_date, p_end_date, p_is_same_day, p_start_hour, p_end_hour, p_method, p_search, p_limit, v_offset;
END;
$$;

REVOKE ALL ON FUNCTION get_error_metrics FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_error_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_error_metrics TO anon;


-- 3. Database-level aggregation & filtering for Alerts
CREATE OR REPLACE FUNCTION get_active_alerts_metrics(
  p_start_date   DATE,
  p_end_date     DATE,
  p_start_hour   INT,
  p_end_hour     INT,
  p_is_same_day  BOOLEAN
)
RETURNS TABLE (
  endpoint            VARCHAR,
  method              VARCHAR,
  total_requests      BIGINT,
  error_count         BIGINT,
  error_rate          DOUBLE PRECISION,
  avg_response_time   BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.endpoint,
    m.method,
    SUM(m.total_requests)::BIGINT as total_requests,
    SUM(m.error_count)::BIGINT as error_count,
    CASE 
      WHEN SUM(m.total_requests) > 0 THEN (SUM(m.error_count)::DOUBLE PRECISION / SUM(m.total_requests)::DOUBLE PRECISION) * 100.0
      ELSE 0.0
    END as error_rate,
    CASE 
      WHEN SUM(m.total_requests) > 0 THEN (SUM(m.total_response_time) / SUM(m.total_requests))::BIGINT
      ELSE 0::BIGINT
    END as avg_response_time
  FROM public.request_metrics m
  WHERE m.bucket_date >= p_start_date
    AND m.bucket_date <= p_end_date
    AND (NOT p_is_same_day OR (m.bucket_hour >= p_start_hour AND m.bucket_hour <= p_end_hour))
  GROUP BY m.endpoint, m.method
  HAVING SUM(m.total_requests) >= 5
     AND (
       (CASE WHEN SUM(m.total_requests) > 0 THEN (SUM(m.error_count)::DOUBLE PRECISION / SUM(m.total_requests)::DOUBLE PRECISION) * 100.0 ELSE 0.0 END) >= 5.0
       OR
       (CASE WHEN SUM(m.total_requests) > 0 THEN (SUM(m.total_response_time) / SUM(m.total_requests)) ELSE 0 END) >= 800
     );
END;
$$;

REVOKE ALL ON FUNCTION get_active_alerts_metrics FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_active_alerts_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_alerts_metrics TO anon;
