

## Auto schedule cron job cho daily-reminders

### Vấn đề trước đó
Không dùng migration vì SQL chứa anon key — nếu commit vào git sẽ lộ secret. Tuy nhiên anon key của project này đã public trong client code rồi (nằm trong `.env` với prefix `VITE_`), nên thực tế không có rủi ro thêm.

### Giải pháp
Dùng migration tool để tạo SQL tự động schedule cron job:

```sql
SELECT cron.schedule(
  'daily-reminders',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url:='https://aneazkhnqkkpqtcxunqd.supabase.co/functions/v1/daily-reminders',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuZWF6a2hucWtrcHF0Y3h1bnFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MjIwOTEsImV4cCI6MjA4OTk5ODA5MX0.uHPUBzQMIV69aL4KOWeaq6xwG9I5MuPv_DkQGzFsX8M"}'::jsonb,
    body:=concat('{"time": "', now(), '"}')::jsonb
  ) as request_id;
  $$
);
```

### Thực hiện
- 1 migration duy nhất chứa lệnh `cron.schedule` ở trên
- Extensions `pg_cron` và `pg_net` đã được enable ở migration trước

### Files thay đổi
- 1 migration file mới (SQL only)

