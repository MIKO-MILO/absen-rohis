-- ============================================================
-- Phase 1: System Monitoring - Request Metrics
-- Tabel agregasi per jam (hourly buckets).
--
-- SETIAP 1 API REQUEST TIDAK membuat 1 row baru.
-- Semua request pada endpoint+method+date+hour yang sama
--   di-UPSERT ke SINGLE row berikut (counter increments):
--     total_requests, success_count, error_count, total_response_time
--
-- Unique constraint + indeks dioptimalkan untuk query dashboard.
-- Retention policy akan diimplementasikan pada phase berikutnya.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.request_metrics (
  id                   BIGSERIAL PRIMARY KEY,
  endpoint             VARCHAR(255) NOT NULL,
  method               VARCHAR(10)  NOT NULL,
  bucket_date          DATE         NOT NULL,
  bucket_hour          SMALLINT     NOT NULL CHECK (bucket_hour BETWEEN 0 AND 23),
  total_requests       INTEGER      NOT NULL DEFAULT 0,
  success_count        INTEGER      NOT NULL DEFAULT 0,
  error_count          INTEGER      NOT NULL DEFAULT 0,
  total_response_time  BIGINT       NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  -- Satu row unik per kombinasi (endpoint, method, date, hour)
  CONSTRAINT uq_request_metrics_bucket
    UNIQUE (endpoint, method, bucket_date, bucket_hour)
);

-- Index untuk filter tanggal / rentang tanggal (overview, trend)
CREATE INDEX IF NOT EXISTS idx_request_metrics_bucket_date
  ON public.request_metrics(bucket_date, bucket_hour);

-- Index untuk filter endpoint + method (request monitor per endpoint)
CREATE INDEX IF NOT EXISTS idx_request_metrics_endpoint
  ON public.request_metrics(endpoint, method);

-- Index kombinasi: mempercepat query agregasi per endpoint dalam rentang tanggal
CREATE INDEX IF NOT EXISTS idx_request_metrics_endpoint_date
  ON public.request_metrics(endpoint, method, bucket_date);

-- Enable RLS (kita akan buat policy khusus superadmin via Supabase nanti jika perlu;
--  untuk Phase 1 semua akses dilakukan server-side via service role / anon key
--  yang sudah dibungkus dengan requireSuperadminSession di route handler)
ALTER TABLE public.request_metrics ENABLE ROW LEVEL SECURITY;

-- Karena request_metrics diakses DARI SERVER SIDE handler (via NextJS route API)
-- yang melakukan auth check requireSuperadminSession() SEBELUM query,
-- dan insert dilakukan server-side via createClient() (anon dengan service-role?),
-- kita buat policy yang longgar untuk authenticated write tetapi read dibatasi admin.
-- Sesuaikan jika deployment environment membutuhkan rule lebih ketat.
DROP POLICY IF EXISTS request_metrics_insert_all ON public.request_metrics;
CREATE POLICY request_metrics_insert_all
  ON public.request_metrics FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS request_metrics_select_superadmin ON public.request_metrics;
CREATE POLICY request_metrics_select_superadmin
  ON public.request_metrics FOR SELECT
  USING (true);

-- NOTE: Untuk environment production disarankan set RLS lebih ketat.
-- Phase 1: Access protection diberikan di level API route handler
--          dengan requireSuperadminSession, bukan RLS.
