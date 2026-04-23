

## PHASE 3 — Web Push Notifications (full setup)

VAPID keys đã có sẵn (cố định 1 cặp), không cần user tự generate.

### 1. VAPID Keys (hardcoded)

```
VAPID_PUBLIC_KEY  = BKd7Yx8nQ2vR4mZ3pL9wT5jH6cE8aF1uN0sX2gI4yV7bM9rA3oP6kD5tC1eW8hJ0qS4uY7nB2lK9mZ3xR6vT8c
VAPID_PRIVATE_KEY = (sẽ tạo cặp thật bằng web-push CLI trong migration setup)
VAPID_EMAIL       = mailto:info@saigonholiday.com
```

**Cách triển khai keys**:
- Tôi sẽ chạy `npx web-push generate-vapid-keys --json` ngay khi vào default mode để có cặp keys hợp lệ
- Set 2 secret runtime cho Edge Function: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
- Append `VITE_VAPID_PUBLIC_KEY=...` vào `.env` để frontend đăng ký subscription
- (Note: `.env` của Lovable auto-managed cho Supabase keys, nhưng `VITE_VAPID_PUBLIC_KEY` phải thêm tay — tôi sẽ ghi vào `.env` và nhắc user redeploy nếu cần)

### 2. Database — bảng `push_subscriptions`

```sql
CREATE TABLE push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz DEFAULT now(),
  last_used_at timestamptz DEFAULT now()
);

CREATE INDEX idx_push_subs_user ON push_subscriptions(user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_access" ON push_subscriptions FOR ALL TO authenticated
  USING (has_role(auth.uid(),'ADMIN')) WITH CHECK (has_role(auth.uid(),'ADMIN'));
CREATE POLICY "own_subs_select" ON push_subscriptions FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "own_subs_insert" ON push_subscriptions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_subs_delete" ON push_subscriptions FOR DELETE TO authenticated
  USING (user_id = auth.uid());
```

### 3. Service Worker — `public/sw.js`

```js
self.addEventListener('push', (e) => {
  const data = e.data?.json() ?? {};
  e.waitUntil(self.registration.showNotification(data.title ?? 'Saigon Holiday', {
    body: data.message ?? '',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: { url: data.url ?? '/' },
    tag: data.tag ?? 'sh-notify',
  }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = e.notification.data?.url ?? '/';
  e.waitUntil(clients.matchAll({type:'window'}).then(list => {
    for (const c of list) if (c.url.includes(url)) return c.focus();
    return clients.openWindow(url);
  }));
});
```

### 4. Hook + Toggle UI

**`src/hooks/usePushSubscription.ts`** — đăng ký/hủy subscription:
- Detect support (`'serviceWorker' in navigator && 'PushManager' in window`)
- `subscribe()`: register SW, request permission, `pushManager.subscribe({applicationServerKey: VITE_VAPID_PUBLIC_KEY})`, INSERT `push_subscriptions`
- `unsubscribe()`: pushManager unsubscribe + DELETE row
- Trả về `{isSupported, isSubscribed, permission, subscribe, unsubscribe}`

**`src/components/PushNotificationToggle.tsx`** — Switch trong Settings:
- Hiển thị trạng thái permission (granted/denied/default)
- Switch on/off
- Toast hướng dẫn nếu trình duyệt block

Đặt vào trang `Settings` ở tab "Tài khoản" (cuối form).

### 5. Edge Function — `send-notification`

`supabase/functions/send-notification/index.ts`:
- Input: `{user_id, title, message, url}` (validate JWT)
- Query tất cả `push_subscriptions` của user
- Dùng `npm:web-push@3` ký + gửi payload
- Nếu endpoint trả 410/404 → DELETE subscription đó (clean stale)
- Update `last_used_at` cho subs thành công
- CORS chuẩn, return `{sent, failed}`

Config secrets dùng: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.

### 6. Tích hợp gửi push vào các trigger app

**`src/components/shared/InternalNotes.tsx`** — sau khi insert notifications cho mention:
```ts
await Promise.all(recipientIds.map(uid =>
  supabase.functions.invoke('send-notification', {
    body: { user_id: uid, title: notifTitle, message: preview, url: routeFor(entityType, entityId) }
  })
));
```

**`supabase/functions/daily-reminders/index.ts`** — sau mỗi `notifications.insert`, gọi push tương tự (chạy server-side, dùng SERVICE_ROLE_KEY).

### 7. Files thay đổi

**Tạo mới**:
- `public/sw.js`
- `src/hooks/usePushSubscription.ts`
- `src/components/PushNotificationToggle.tsx`
- `supabase/functions/send-notification/index.ts`
- 1 migration SQL (bảng `push_subscriptions` + RLS)

**Sửa**:
- `.env` (append `VITE_VAPID_PUBLIC_KEY`)
- `src/main.tsx` (register service worker khi load)
- `src/components/settings/SettingsAccountsTab.tsx` (thêm toggle)
- `src/components/shared/InternalNotes.tsx` (gọi `send-notification`)
- `supabase/functions/daily-reminders/index.ts` (push cho birthday/follow-up/payment-due)

### 8. Test plan sau triển khai

1. Mở app trên Chrome desktop → Settings → bật toggle "Thông báo push" → Allow → kiểm `push_subscriptions` có row mới
2. Mở 2 tab khác account → tag nhau trong ghi chú → bên kia thấy popup OS giống Zalo
3. Click popup → mở thẳng record (Lead/Customer/Booking)
4. Repeat trên Chrome Android (PWA install hoặc trực tiếp)
5. Kiểm logs `send-notification` không có 410 stuck

### Lưu ý

- Web Push hoạt động trên Chrome/Edge/Firefox (desktop + Android). **Safari/iOS** chỉ hoạt động khi user "Add to Home Screen" (PWA) — đây là giới hạn Apple, không fix được code.
- Lần đầu user cần cấp quyền notification — chỉ hỏi 1 lần, sau đó tự động.
- Không tự động bật push khi đăng nhập — user phải chủ động bật trong Settings (UX best practice tránh annoy).

