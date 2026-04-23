

## Tiếp tục Phase 3 — Hoàn tất Web Push

Đã xong: bảng `push_subscriptions`, service worker, hook, toggle UI, edge function `send-notification`.

Còn lại 4 việc:

### 1. Cấu hình VAPID secrets cho Edge Function
Cần tạo 3 secrets runtime cho `send-notification`:
- `VAPID_PUBLIC_KEY` — sẽ generate bằng `npx web-push generate-vapid-keys`
- `VAPID_PRIVATE_KEY` — cùng cặp với public
- `VAPID_SUBJECT` — `mailto:info@saigonholiday.com`

Đồng thời append vào `.env`:
```
VITE_VAPID_PUBLIC_KEY=<public_key>
```
(Hook `usePushSubscription` đọc biến này khi gọi `pushManager.subscribe`.)

### 2. Đăng ký Service Worker khi app load
Sửa `src/main.tsx`: thêm block đăng ký SW (chỉ chạy ở production hoặc khi `'serviceWorker' in navigator`):
```ts
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(console.error);
  });
}
```

### 3. Gắn toggle vào Settings
Sửa `src/components/settings/SettingsAccountsTab.tsx` (hoặc tạo tab "Thiết bị" riêng nếu phù hợp): thêm `<PushNotificationToggle />` vào cuối form, với heading "Thông báo trên thiết bị này".

### 4. Tích hợp gửi push vào triggers

**a) Mention trong ghi chú nội bộ** — sửa `src/components/shared/InternalNotes.tsx`:
sau khi `INSERT notifications` cho mỗi mention thành công, gọi:
```ts
await supabase.functions.invoke('send-notification', {
  body: {
    user_id: uid,
    title: `${authorName} đã tag bạn`,
    message: content.slice(0, 100),
    url: routeFor(entityType, entityId),
    tag: `note-${entityId}`,
  },
});
```
Map `routeFor` đồng bộ với `entityRouteMap` trong NotificationBell.

**b) Daily reminders** — sửa `supabase/functions/daily-reminders/index.ts`:
Sau mỗi `notifications.insert` thành công (sinh nhật, follow-up, payment due, contract expiry), gọi `send-notification` qua `fetch` với `SERVICE_ROLE_KEY` (vì chạy server-side). Dùng `Promise.allSettled` để 1 push fail không kill batch.

### Files thay đổi

**Sửa**:
- `.env` (append `VITE_VAPID_PUBLIC_KEY`)
- `src/main.tsx` (đăng ký SW)
- `src/components/settings/SettingsAccountsTab.tsx` (gắn toggle)
- `src/components/shared/InternalNotes.tsx` (gọi push sau mention)
- `supabase/functions/daily-reminders/index.ts` (gọi push sau mỗi notification)

**Secrets cần thêm** (sẽ propose tool sau khi user approve plan):
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

### Test sau khi xong
1. Vào Settings → bật toggle → Allow → check `push_subscriptions` có row
2. 2 tab khác account → tag nhau → bên kia thấy popup OS
3. Click popup → mở thẳng record
4. Trigger thủ công `daily-reminders` → check log có `sent: N`

### Lưu ý
- Safari/iOS chỉ chạy khi PWA "Add to Home Screen" — giới hạn Apple, không sửa được code.
- VAPID keys cố định mãi mãi — đổi key sẽ invalidate toàn bộ subscription cũ, user phải bật lại.

