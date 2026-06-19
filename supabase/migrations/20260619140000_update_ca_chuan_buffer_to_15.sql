-- Migration: update_ca_chuan_buffer_to_15
-- Created: 2026-06-19
-- Purpose: Cho phép đi muộn 15 phút (thay vì 5 phút).
--          + Thêm cron sync riêng lúc 8:15 ICT để HR có data realtime
--            trước khi nhân viên quá buffer.

-- 1) Đổi buffer_di_muon_phut từ 5 → 15
UPDATE cc_cau_hinh
SET value = jsonb_set(value, '{buffer_di_muon_phut}', '15', false),
    updated_at = now()
WHERE key = 'ca_chuan';

-- 2) Cron 8:15 ICT (01:15 UTC) — sync Jibble ngay sau khi NV đến giờ
DO $$
BEGIN
  PERFORM cron.unschedule('jibble-sync-815am');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'jibble-sync-815am',
  '15 1 * * 1-6',
  $cron$
    SELECT net.http_post(
      url := 'https://aneazkhnqkkpqtcxunqd.supabase.co/functions/v1/cc-sync-jibble',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'X-Cron-Secret', 'l66ut5alvyixap3lxv0p5tsvmb9mq66x'
      ),
      body := '{"type":"L1_INCREMENTAL","source":"cron-815am"}'::jsonb
    ) AS request_id;
  $cron$
);
