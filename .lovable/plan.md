## Mục tiêu
Bỏ toàn bộ hệ thống Web Push tự build (VAPID + custom SW + bảng `push_subscriptions` + edge function `send-notification` aes128gcm), thay bằng **OneSignal Web SDK v16** + REST API. Đơn giản hơn, không tự sign JWT, không tự encrypt aes128gcm, OneSignal tự quản subscription cross-device.

## Kiến trúc mới

```
Trình duyệt (app.saigonholiday.vn)
   │  OneSignal Web SDK v16 (CDN)
   │   ├─ Tự đăng ký /OneSignalSDKWorker.js  (KHÔNG dùng /sw.js của ta nữa)
   │   ├─ Yêu cầu permission notification
   │   └─ Sau login: OneSignal.login(user.id)  → liên kết externalId = user.id
   ▼
OneSignal Cloud (lưu subscription, gửi push tới FCM/APNs/Mozilla)
   ▲
   │  REST API: POST /api/v1/notifications
   │   Body: { app_id, include_aliases:{external_id:[user.id]}, target_channel:"push", headings, contents, url }
   │   Header: Authorization: Basic <REST_API_KEY>
   │
DB Trigger `notify_push_on_insert`  (đổi target từ Edge Function → OneSignal trực tiếp qua pg_net)
   ▲
   │
Postgres trigger trên bảng `notifications` (giữ nguyên logic tạo notification cho mention/lead/booking…)
```

## Phase 1 — Setup phía OneSignal (user tự làm, tôi hướng dẫn)

Tôi sẽ build code dùng placeholder. Sau khi merge xong, bạn làm tuần tự:

1. Vào https://onesignal.com → Sign up (miễn phí 10k subscribers).
2. **New App/Website** → tên `Saigon Holiday CRM`.
3. Chọn platform **Web** → **Typical Site**.
4. Site Setup:
   - Site Name: `Saigon Holiday CRM`
   - Site URL: `https://app.saigonholiday.vn`
   - **Auto Resubscribe**: ON
   - Default Notification Icon: upload logo (tuỳ chọn)
5. Copy **APP_ID** (UUID dạng `xxxxxxxx-xxxx-…`) và **REST API Key** (dạng `os_v2_…` dài).
6. Quay lại chat — tôi sẽ gọi `add_secret` để bạn paste **ONESIGNAL_REST_API_KEY** an toàn, và bạn paste **APP_ID** vào file `.env` (vì SDK web cần ID public).

## Phase 2 — Code changes (tôi làm sau khi bạn approve plan)

### 2.1. Frontend SDK
- **`index.html`**: thêm `<script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" defer></script>` ngay trên `</body>` (CDN OneSignal v16 — version mới nhất, hỗ trợ alias/external_id chuẩn).
- **`src/main.tsx`**:
  - **Xoá** đoạn `navigator.serviceWorker.register("/sw.js")` — OneSignal tự đăng ký SW của họ.
  - Thêm init OneSignal (chạy 1 lần khi app load):
    ```ts
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal) => {
      await OneSignal.init({
        appId: import.meta.env.VITE_ONESIGNAL_APP_ID,
        allowLocalhostAsSecureOrigin: true,
        notifyButton: { enable: false },   // Tự build UI riêng, không dùng bell mặc định
        serviceWorkerParam: { scope: "/" },
      });
    });
    ```

### 2.2. Hook mới `useOneSignal`
Tạo `src/hooks/useOneSignal.ts` thay thế hoàn toàn `usePushSubscription`:
- State: `isSupported`, `isSubscribed`, `permission`, `loading`, `inIframe`.
- `subscribe()`: gọi `OneSignal.User.PushSubscription.optIn()` → SDK tự xin permission + đăng ký FCM endpoint.
- `unsubscribe()`: `OneSignal.User.PushSubscription.optOut()`.
- `bindUser(userId)`: gọi `OneSignal.login(userId)` để tag external_id.
- Đăng ký listener `OneSignal.User.PushSubscription.addEventListener("change", …)` để cập nhật state realtime.

### 2.3. Liên kết user sau login
Trong `src/contexts/AuthContext.tsx`, sau khi có `user` thì gọi `OneSignal.login(user.id)`. Khi logout: `OneSignal.logout()`. (Edit nhỏ trong onAuthStateChange callback.)

### 2.4. UI
- `src/components/PushNotificationToggle.tsx`, `PushNotificationCard.tsx`, `PushToggleButton.tsx`: rewrite gọn — chỉ giữ Switch + nhãn trạng thái, dùng `useOneSignal` thay vì `usePushSubscription`. Bỏ toàn bộ thông báo lỗi VAPID, "iframe", "sw_unreachable" (OneSignal tự xử lý). Giữ cảnh báo "đang ở iframe Lovable preview, mở tab thật để bật" vì giới hạn này vẫn còn.
- `src/pages/Settings.tsx`, `src/pages/EmployeeDetail.tsx`, `src/components/AppLayout.tsx`, `src/components/settings/SettingsAccountsTab.tsx`: chỉ thay import, không đổi structure.

### 2.5. Xoá file cũ
- `public/sw.js` — xoá.
- `src/hooks/usePushSubscription.ts` — xoá.
- `supabase/functions/send-notification/` — xoá thư mục + gọi `delete_edge_functions` để gỡ deploy.
- `supabase/functions/vapid-generate/` — xoá + gỡ deploy.
- Các secret VAPID (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`) — sau khi xác nhận push OneSignal chạy, tôi sẽ hỏi trước khi delete (giữ vài ngày phòng rollback).

### 2.6. Backend trigger
Migration sửa function `notify_push_on_insert`:
- Đổi `v_func_url` thành `https://onesignal.com/api/v1/notifications`.
- Thay header `Authorization: Bearer <anon_key>` thành `Authorization: Basic <ONESIGNAL_REST_API_KEY>` — **vấn đề**: pg_net không truy cập secret. Phải lưu REST API key vào DB hoặc dùng cách khác.
  - **Giải pháp**: tạo bảng nhỏ `system_config (key text PK, value text)` giữ `ONESIGNAL_APP_ID` + `ONESIGNAL_REST_API_KEY`, RLS chỉ cho service_role đọc. Trigger SECURITY DEFINER select từ đây để build header. Việc lưu API key vào DB là chấp nhận được vì DB có RLS ngăn user thường truy cập (giống cách `notify_push_on_insert` hiện tại đã hardcode anon key).
- Body OneSignal:
  ```json
  {
    "app_id": "<APP_ID>",
    "include_aliases": { "external_id": ["<user_id>"] },
    "target_channel": "push",
    "headings": { "en": "<title>" },
    "contents": { "en": "<message>" },
    "web_url": "<full_url>",
    "web_push_topic": "<tag>"
  }
  ```

### 2.7. Bảng `push_subscriptions`
Per yêu cầu: **giữ bảng**, chỉ ngừng dùng. Migration:
- Drop trigger/RLS không cần nữa? Không — giữ nguyên, vô hại.
- Thêm comment trên bảng: `COMMENT ON TABLE push_subscriptions IS 'DEPRECATED — replaced by OneSignal on 2026-04-26. Kept for backup.'`.

## Phase 3 — Test & rollout

1. Sau khi tôi triển khai code: bạn tạo OneSignal app, paste APP_ID vào `.env`, paste REST_API_KEY qua add_secret.
2. Tôi insert APP_ID + REST_API_KEY vào bảng `system_config` qua insert tool.
3. Mở `https://app.saigonholiday.vn` (tab thật, KHÔNG iframe Lovable).
4. Vào **Cài đặt → Thông báo** → bật toggle → cho phép permission → kiểm tra OneSignal Dashboard > Audience > có 1 subscription với external_id = user.id.
5. Test end-to-end: tạo đơn nghỉ phép → kiểm tra notification hiện trên cả desktop + điện thoại.
6. Dashboard OneSignal > Delivery để xem trạng thái từng notification (rất chi tiết, không cần đoán như VAPID).

## Files sẽ thay đổi

**Tạo mới:**
- `src/hooks/useOneSignal.ts`
- Migration: edit function `notify_push_on_insert` + tạo bảng `system_config`
- `src/types/onesignal.d.ts` (declare `window.OneSignalDeferred`)

**Sửa:**
- `index.html`, `src/main.tsx`, `src/contexts/AuthContext.tsx`
- `src/components/PushNotificationToggle.tsx`, `PushNotificationCard.tsx`, `PushToggleButton.tsx`
- `src/pages/Settings.tsx`, `src/pages/EmployeeDetail.tsx`
- `.env` (thêm `VITE_ONESIGNAL_APP_ID=` placeholder)

**Xoá:**
- `public/sw.js`
- `src/hooks/usePushSubscription.ts`
- `supabase/functions/send-notification/`
- `supabase/functions/vapid-generate/`
- Cập nhật `supabase/config.toml` bỏ 2 function trên

## Rủi ro & giảm thiểu

- **iframe Lovable preview vẫn không nhận push** — đây là giới hạn browser, không liên quan OneSignal. UI sẽ ghi rõ "mở tab thật".
- **Lưu REST API key trong DB** — chỉ service_role đọc được, RLS từ chối tất cả role khác. Đây là pattern chấp nhận được (tương tự key anon hardcode hiện tại).
- **OneSignal Free tier giới hạn 10k web subscribers** — đủ dư cho team < 100 người.
- **Mất 1 lần re-subscribe**: tất cả user phải bật lại toggle 1 lần trên mỗi thiết bị (subscription cũ trong `push_subscriptions` không còn dùng nữa).

Sau khi bạn approve, tôi sẽ thực hiện toàn bộ Phase 2 trong 1 lượt code, rồi hỏi xin REST_API_KEY để hoàn tất Phase 3.