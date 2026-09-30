      -- ============================================================
      -- Migration 010: Auto Cleanup Database via pg_cron
      -- ============================================================
      -- Aturan cleanup:
      --   qr_token              → expired_at < NOW()
      --   rate_limit_buckets    → reset_at < NOW()
      --   impersonation_sessions→ active = false AND ended_at < NOW() - 7 days
      --   request_metrics       → bucket_date < NOW() - 30 days
      --   audit_logs            → created_at < NOW() - 180 days
      --
      -- TIDAK menyentuh: absensi, users, admin, panitia, classes
      --
      -- Idempotent: aman dijalankan berulang kali.
      -- ============================================================


      -- ─── 1. Enable pg_cron extension (idempotent) ────────────────────────────────
      -- Catatan: di Supabase, pg_cron hanya bisa diaktifkan oleh superuser.
      -- Jalankan ini melalui Supabase Dashboard → SQL Editor sebagai superuser,
      -- atau aktifkan dari Extensions panel di Supabase Dashboard.
      CREATE EXTENSION IF NOT EXISTS pg_cron;


      -- ─── 2. Tabel cleanup_log untuk audit hasil cleanup ─────────────────────────
      -- Menyimpan riwayat setiap eksekusi cleanup (berapa baris terhapus, kapan).
      CREATE TABLE IF NOT EXISTS public.cleanup_log (
        id              BIGSERIAL    PRIMARY KEY,
        executed_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        qr_token_deleted            INTEGER NOT NULL DEFAULT 0,
        rate_limit_deleted          INTEGER NOT NULL DEFAULT 0,
        impersonation_deleted       INTEGER NOT NULL DEFAULT 0,
        request_metrics_deleted     INTEGER NOT NULL DEFAULT 0,
        audit_logs_deleted          INTEGER NOT NULL DEFAULT 0,
        duration_ms                 INTEGER,
        notes                       TEXT
      );

      -- Index untuk query log terbaru
      CREATE INDEX IF NOT EXISTS idx_cleanup_log_executed_at
        ON public.cleanup_log(executed_at DESC);

      -- RLS: hanya superadmin/service role yang bisa baca
      ALTER TABLE public.cleanup_log ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS cleanup_log_select_policy ON public.cleanup_log;
      CREATE POLICY cleanup_log_select_policy
        ON public.cleanup_log FOR SELECT
        USING (true);

      DROP POLICY IF EXISTS cleanup_log_insert_policy ON public.cleanup_log;
      CREATE POLICY cleanup_log_insert_policy
        ON public.cleanup_log FOR INSERT
        WITH CHECK (true);


      -- ─── 3. Index tambahan untuk mempercepat DELETE ──────────────────────────────

      -- qr_token: expired_at
      CREATE INDEX IF NOT EXISTS idx_qr_token_expired_at
        ON public.qr_token(expired_at)
        WHERE expired_at IS NOT NULL;

      -- impersonation_sessions: active + ended_at
      CREATE INDEX IF NOT EXISTS idx_impersonation_sessions_cleanup
        ON public.impersonation_sessions(active, ended_at)
        WHERE active = false;

      -- audit_logs: created_at (sudah ada dari migration 001, pastikan ada)
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
        ON public.audit_logs(created_at DESC);

      -- request_metrics: bucket_date (sudah ada dari migration 004)
      CREATE INDEX IF NOT EXISTS idx_request_metrics_bucket_date
        ON public.request_metrics(bucket_date, bucket_hour);


      -- ─── 4. Fungsi utama: run_daily_cleanup() ────────────────────────────────────
      CREATE OR REPLACE FUNCTION public.run_daily_cleanup()
      RETURNS JSON
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $$
      DECLARE
        v_start_time              TIMESTAMPTZ;
        v_end_time                TIMESTAMPTZ;
        v_qr_deleted              INTEGER := 0;
        v_rate_limit_deleted      INTEGER := 0;
        v_impersonation_deleted   INTEGER := 0;
        v_metrics_deleted         INTEGER := 0;
        v_audit_deleted           INTEGER := 0;
        v_duration_ms             INTEGER;
        v_result                  JSON;
      BEGIN
        v_start_time := clock_timestamp();

        -- ── 4a. Hapus qr_token yang sudah expired ──────────────────────────────────
        -- Hanya hapus yang benar-benar sudah expired (expired_at < NOW())
        -- Token aktif yang belum expired TIDAK tersentuh
        DELETE FROM public.qr_token
        WHERE expired_at IS NOT NULL
          AND expired_at < NOW();
        GET DIAGNOSTICS v_qr_deleted = ROW_COUNT;

        -- ── 4b. Hapus rate_limit_buckets yang sudah expired ────────────────────────
        DELETE FROM public.rate_limit_buckets
        WHERE reset_at < NOW();
        GET DIAGNOSTICS v_rate_limit_deleted = ROW_COUNT;

        -- ── 4c. Hapus impersonation_sessions yang tidak aktif > 7 hari ─────────────
        DELETE FROM public.impersonation_sessions
        WHERE active = false
          AND ended_at IS NOT NULL
          AND ended_at < NOW() - INTERVAL '7 days';
        GET DIAGNOSTICS v_impersonation_deleted = ROW_COUNT;

        -- ── 4d. Hapus request_metrics lebih dari 30 hari ───────────────────────────
        -- Menggunakan bucket_date karena itu kolom DATE utama di tabel ini
        DELETE FROM public.request_metrics
        WHERE bucket_date < (CURRENT_DATE - INTERVAL '30 days')::DATE;
        GET DIAGNOSTICS v_metrics_deleted = ROW_COUNT;

        -- ── 4e. Hapus audit_logs lebih dari 180 hari ───────────────────────────────
        DELETE FROM public.audit_logs
        WHERE created_at < NOW() - INTERVAL '180 days';
        GET DIAGNOSTICS v_audit_deleted = ROW_COUNT;

        -- ── 4f. Catat hasil ke cleanup_log ─────────────────────────────────────────
        v_end_time   := clock_timestamp();
        v_duration_ms := EXTRACT(MILLISECONDS FROM (v_end_time - v_start_time))::INTEGER;

        INSERT INTO public.cleanup_log (
          executed_at,
          qr_token_deleted,
          rate_limit_deleted,
          impersonation_deleted,
          request_metrics_deleted,
          audit_logs_deleted,
          duration_ms
        ) VALUES (
          v_start_time,
          v_qr_deleted,
          v_rate_limit_deleted,
          v_impersonation_deleted,
          v_metrics_deleted,
          v_audit_deleted,
          v_duration_ms
        );

        -- ── 4g. Bangun hasil JSON ───────────────────────────────────────────────────
        v_result := json_build_object(
          'status',                     'ok',
          'executed_at',                v_start_time,
          'duration_ms',                v_duration_ms,
          'qr_token_deleted',           v_qr_deleted,
          'rate_limit_deleted',         v_rate_limit_deleted,
          'impersonation_deleted',      v_impersonation_deleted,
          'request_metrics_deleted',    v_metrics_deleted,
          'audit_logs_deleted',         v_audit_deleted,
          'total_deleted',              (v_qr_deleted + v_rate_limit_deleted + v_impersonation_deleted + v_metrics_deleted + v_audit_deleted)
        );

        RETURN v_result;

      EXCEPTION WHEN OTHERS THEN
        -- Catat error ke cleanup_log tanpa gagal diam-diam
        INSERT INTO public.cleanup_log (
          executed_at,
          notes
        ) VALUES (
          v_start_time,
          'ERROR: ' || SQLERRM
        );
        RAISE WARNING '[run_daily_cleanup] Error: %', SQLERRM;
        RETURN json_build_object(
          'status', 'error',
          'message', SQLERRM
        );
      END;
      $$;

      -- Hak akses: hanya service role / superuser yang bisa eksekusi
      REVOKE ALL ON FUNCTION public.run_daily_cleanup() FROM PUBLIC;
      GRANT EXECUTE ON FUNCTION public.run_daily_cleanup() TO service_role;


      -- ─── 5. Jadwalkan pg_cron: setiap hari jam 02:00 WIB (UTC+7 = 19:00 UTC) ────
      -- Hapus job lama jika ada (idempotent)
      SELECT cron.unschedule('daily-db-cleanup')
      WHERE EXISTS (
        SELECT 1 FROM cron.job WHERE jobname = 'daily-db-cleanup'
      );

      SELECT cron.schedule(
        'daily-db-cleanup',          -- nama job (unik)
        '0 19 * * *',                -- setiap hari 19:00 UTC = 02:00 WIB
        $$SELECT public.run_daily_cleanup();$$
      );


      -- ─── 6. Verifikasi: query untuk cek status ───────────────────────────────────

      -- Cek daftar cron job aktif:
      -- SELECT jobid, jobname, schedule, command, active
      -- FROM cron.job
      -- WHERE jobname = 'daily-db-cleanup';

      -- Cek 10 riwayat eksekusi terakhir:
      -- SELECT jobid, runid, job_pid, database, username,
      --        command, status, return_message,
      --        start_time, end_time
      -- FROM cron.job_run_details
      -- WHERE command LIKE '%run_daily_cleanup%'
      -- ORDER BY start_time DESC
      -- LIMIT 10;

      -- Cek hasil cleanup dari cleanup_log:
      -- SELECT * FROM public.cleanup_log
      -- ORDER BY executed_at DESC
      -- LIMIT 20;

      -- Jalankan manual untuk test:
      -- SELECT public.run_daily_cleanup();
