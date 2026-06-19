-- Migration: fix_cc_sync_jibble_cron_schedule
-- Created: 2026-06-19
-- Purpose:
--   Replace 3 broken cron jobs with 2 new ones using X-Cron-Secret header
--   (cc-sync-jibble v4 verifies X-Cron-Secret against CRON_SECRET env instead
--   of trying to verify anon JWT as user session — which was failing 97% of
--   the time).
--
-- Background:
--   Between 09/06 and 19/06, cron fired 585 times but only 13 (~2.2%) succeeded.
--   Root cause: cc-sync-jibble v3 used auth.getClaims(anonJwt) which fails
--   because anon JWT has no user 'sub'. New v4 splits auth into:
--     - cron branch: X-Cron-Secret header == CRON_SECRET env
--     - user branch: Bearer JWT verified via auth.getClaims + role check
--
-- IMPORTANT after this migration:
--   1. Set env CRON_SECRET = '<see secret in deployment notes>' in Supabase
--      Edge Function secrets dashboard (must match value embedded in this SQL).
--   2. Deploy cc-sync-jibble v4 (new index.ts with new auth block).
--   3. Manual smoke test: POST with X-Cron-Secret header should return ok=true.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────
-- 1) Remove old cron jobs (all 3 fired with anon Bearer → all rejected)
-- ─────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  PERFORM cron.unschedule('jibble-sync-default');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('jibble-sync-morning');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('jibble-sync-evening');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────────────────
-- 2) Create 2 new cron jobs: 08:30 morning + 17:45 evening (Mon-Sat UTC)
--    L1_INCREMENTAL = 48h window (covers yesterday + today)
--
--    X-Cron-Secret must equal the CRON_SECRET env set on the Edge Function.
--    SECRET INlined here (project-level shared secret, not user data).
-- ─────────────────────────────────────────────────────────────────────────

SELECT cron.schedule(
  'jibble-sync-morning-v2',
  '30 8 * * 1-6',
  $cron$
    SELECT net.http_post(
      url := 'https://aneazkhnqkkpqtcxunqd.supabase.co/functions/v1/cc-sync-jibble',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'X-Cron-Secret', 'l66ut5alvyixap3lxv0p5tsvmb9mq66x'
      ),
      body := '{"type":"L1_INCREMENTAL","source":"cron-morning"}'::jsonb
    ) AS request_id;
  $cron$
);

SELECT cron.schedule(
  'jibble-sync-evening-v2',
  '45 17 * * 1-6',
  $cron$
    SELECT net.http_post(
      url := 'https://aneazkhnqkkpqtcxunqd.supabase.co/functions/v1/cc-sync-jibble',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'X-Cron-Secret', 'l66ut5alvyixap3lxv0p5tsvmb9mq66x'
      ),
      body := '{"type":"L1_INCREMENTAL","source":"cron-evening"}'::jsonb
    ) AS request_id;
  $cron$
);

COMMIT;
