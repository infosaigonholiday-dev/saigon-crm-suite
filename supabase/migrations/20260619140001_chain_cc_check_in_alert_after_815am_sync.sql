-- Migration: chain_cc_check_in_alert_after_815am_sync
-- Created: 2026-06-19
-- Purpose: Cron 8:18 ICT (3 phút sau sync) gọi cc-check-in-alert để
--          push OneSignal cho HR_MANAGER + HR_INTERN nếu NV chưa chấm vào.

DO $$
BEGIN
  PERFORM cron.unschedule('cc-check-in-alert-815am');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'cc-check-in-alert-815am',
  '18 1 * * 1-6',
  $cron$
    SELECT net.http_post(
      url := 'https://aneazkhnqkkpqtcxunqd.supabase.co/functions/v1/cc-check-in-alert',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'X-Cron-Secret', 'l66ut5alvyixap3lxv0p5tsvmb9mq66x'
      ),
      body := '{"source":"cron-815am"}'::jsonb
    ) AS request_id;
  $cron$
);
