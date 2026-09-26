# Debug Session: json-parse-api-errors [OPEN]

- **Date**: 2026-09-02
- **Session ID**: json-parse-api-errors
- **Description**: Runtime SyntaxError "Unexpected end of JSON input" pada client-side saat fetch endpoint: /api/absensi, /api/users, /api/admin/activity-monitor (MonitoringPage & DataAbsenPage). Juga /api/classes 405 Method Not Allowed.
- **User Report**:
  - DataAbsenPage.useEffect.fetchAbsensi: GET /api/absensi → status 200 tapi JSON parse gagal
  - MonitoringPage.useCallback[fetchData]: GET /api/users, /api/absensi, /api/admin/activity-monitor → JSON parse gagal
  - GET /api/classes → status 405 Method Not Allowed

## Hypotheses (可证伪)

| ID | Hypothesis | Status | Evidence |
|---|---|---|---|
| H1 | Route handlers kadang return `NextResponse` tanpa `.json()` body (empty body → status 200 tapi parse gagal) | PENDING | |
| H2 | Error throw di middleware `withRequestMetrics` / session tidak tertangkap → stream corrupt 200 OK empty | PENDING | |
| H3 | Supabase `data = undefined` (bukan null/[]) → NextResponse.json(undefined) → empty string body | PENDING | |
| H4 | `/api/classes` tidak punya export GET handler → 405; client try parse 405 sebagai JSON → SyntaxError | PENDING | |
| H5 | Wrapper cost-guard (`capResponseItems`, `withSlowQuerySampling`) return non-serializable / undefined di beberapa branch | PENDING | |

## Step Log

### Step 1 — Static Analysis (PENDING)
Cek:
- app/api/absensi/route.ts — semua return path punya .json()?
- app/api/classes/ — apakah ada route.ts dengan export GET?
- app/api/admin/activity-monitor/route.ts — return path
- app/api/users/route.ts — return path
- lib/request-metrics.ts (withRequestMetrics) — error handling

### Step 2 — Instrumentation (PENDING)

### Step 3 — Reproduce (PENDING)

### Step 4 — Evidence Analysis (PENDING)

### Step 5 — Minimal Fix (PENDING)

### Step 6 — Post-fix Verification (PENDING)

### Step 7 — Close Session (PENDING)
