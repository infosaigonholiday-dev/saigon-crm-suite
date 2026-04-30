-- Cập nhật cron job daily-reminders chạy lúc 8h sáng GMT+7 (= 1h UTC)
SELECT cron.unschedule('daily-reminders');

SELECT cron.schedule(
  'daily-reminders',
  '0 1 * * *',
  $cron$
  SELECT net.http_post(
    url:='https://aneazkhnqkkpqtcxunqd.supabase.co/functions/v1/daily-reminders',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuZWF6a2hucWtrcHF0Y3h1bnFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MjIwOTEsImV4cCI6MjA4OTk5ODA5MX0.uHPUBzQMIV69aL4KOWeaq6xwG9I5MuPv_DkQGzFsX8M"}'::jsonb,
    body:=concat('{"time": "', now(), '"}')::jsonb
  ) as request_id;
  $cron$
);