## Mục tiêu
Web Push hiện chỉ chạy khi vài trigger gọi `send-notification` trực tiếp. Mọi notification khác (mention, alerts center, daily-reminders) chỉ INSERT vào bảng `notifications` nhưng KHÔNG gửi push → user không thấy notification trên màn hình.

## 4 bước fix

### 1. Trigger `AFTER INSERT ON notifications` → gọi `send-notification` (QUAN TRỌNG NHẤT)

**Migration:** Tạo function `notify_push_on_insert()` + trigger:

```sql
CREATE OR REPLACE FUNCTION public.notify_push_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_func_url text := 'https://aneazkhnqkkpqtcxunqd.supabase.co/functions/v1/send-notification';
  v_anon_key text := '<anon key>';
  v_url text;
BEGIN
  -- Bỏ qua nếu là notification đã đọc (unlikely on insert) hoặc user_id NULL
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;

  -- Map entity_type → URL
  v_url := CASE NEW.entity_type
    WHEN 'lead' THEN '/tiem-nang'
    WHEN 'customer' THEN '/khach-hang'
    WHEN 'booking' THEN '/dat-tour'
    WHEN 'budget_estimate' THEN '/tai-chinh'
    WHEN 'budget_settlement' THEN '/tai-chinh'
    WHEN 'transaction' THEN '/tai-chinh'
    WHEN 'leave_request' THEN '/quan-ly-nghi-phep'
    WHEN 'contract' THEN '/hop-dong'
    ELSE '/canh-bao'
  END;

  BEGIN
    PERFORM net.http_post(
      url := v_func_url,
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'Authorization','Bearer ' || v_anon_key
      ),
      body := jsonb_build_object(
        'user_id', NEW.user_id,
        'title', NEW.title,
        'message', COALESCE(NEW.message,''),
        'url', v_url,
        'tag', COALESCE(NEW.type,'notif') || '-' || NEW.id
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- Bước 2: log lỗi vào audit_logs thay vì swallow
    INSERT INTO audit_logs (action, table_name, record_id, change_summary, new_data)
    VALUES ('SYSTEM', 'notifications', NEW.id, 'Push send failed: ' || SQLERRM,
            jsonb_build_object('user_id', NEW.user_id, 'title', NEW.title, 'error', SQLERRM));
  END;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notifications_push
AFTER INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.notify_push_on_insert();
```

**Tác động:** Mọi notification mới (từ bất kỳ nguồn nào — trigger DB, edge function, frontend) đều tự động gửi Web Push. Các trigger hiện có (`notify_budget_estimate_change`, `notify_budget_settlement_change`, `notify_transaction_approval`, `notify_leave_request_change`) sẽ trùng push. → Em sẽ **xóa các block `net.http_post` trong các trigger đó** để không gửi 2 lần.

### 2. Bỏ `EXCEPTION WHEN OTHERS THEN NULL` → log vào `audit_logs`

Sửa 4 trigger function trên để bỏ block `net.http_post` (vì giờ trigger global lo). Chỉ còn `INSERT INTO notifications`.

Đối với function `notify_push_on_insert()` mới, em đã dùng `EXCEPTION ... INSERT INTO audit_logs` để có log thật khi push fail.

Cần thêm cột `change_summary` cho phép giá trị `'SYSTEM'` trong `audit_logs_action_check`. Kiểm tra constraint hiện tại — nếu chỉ cho phép `CREATE/UPDATE/DELETE/STATUS_CHANGE/REASSIGN`, em sẽ thêm `SYSTEM`.

### 3. Nút "Test Push" trong Settings

**File:** `src/components/PushNotificationToggle.tsx`

Thêm nút "Gửi thông báo test" bên cạnh toggle. Khi click:
```ts
await supabase.functions.invoke('send-notification', {
  body: {
    user_id: user.id,
    title: '🔔 Test Web Push',
    message: 'Nếu bạn thấy notification này → cấu hình push hoạt động tốt!',
    url: '/cai-dat',
    tag: 'test-push'
  }
});
```
Toast kết quả: hiện `sent`/`failed` từ response. Chỉ enable khi `isSubscribed = true`.

### 4. Bỏ VAPID fallback hardcoded

**File:** `src/hooks/usePushSubscription.ts`

Hiện tại:
```ts
const VAPID_PUBLIC_KEY =
  (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) ||
  "BNpfULcP4VHvXsJez4GYvQLR_6uhSW6vWPzSo9QiZW5T7toIMU-YaJkX5ue4EI96HFJHclyVslPdXpdFe3tEXJ4";
```

Sửa thành:
```ts
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
// Trong subscribe(), check sớm:
if (!VAPID_PUBLIC_KEY) {
  console.error('[push] VITE_VAPID_PUBLIC_KEY missing in .env');
  return { ok: false, error: 'vapid_invalid', detail: 'VITE_VAPID_PUBLIC_KEY not set' };
}
```

Đồng thời check `.env` đã có `VITE_VAPID_PUBLIC_KEY` chưa — nếu chưa, em sẽ thêm vào `.env` (giá trị giống `VAPID_PUBLIC_KEY` secret hiện tại).

## Files sẽ thay đổi

1. **Migration mới:** Tạo `notify_push_on_insert()` + trigger; sửa 4 trigger function bỏ block `net.http_post`; mở rộng `audit_logs_action_check` cho phép `SYSTEM`.
2. `src/components/PushNotificationToggle.tsx` — thêm nút Test push.
3. `src/hooks/usePushSubscription.ts` — bỏ fallback hardcoded.
4. `.env` — đảm bảo `VITE_VAPID_PUBLIC_KEY` tồn tại.

## Kết quả mong đợi

- Mọi `INSERT INTO notifications` → tự động Push lên thiết bị đã subscribe.
- Khi push fail → có log trong `audit_logs` để debug.
- User có thể tự test push trong Settings.
- Nếu thiếu VAPID env → báo lỗi rõ thay vì âm thầm dùng key cũ sai project.
