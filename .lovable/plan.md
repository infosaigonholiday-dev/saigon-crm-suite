# Fix hệ thống Push OneSignal — 3 vấn đề chặn

Sau khi audit từ frontend → DB trigger, hệ thống cũ đã được xóa sạch nhưng **3 lỗi sau khiến push không bao giờ hoạt động**, dù cài đặt OneSignal credentials đã xong.

## ❌ Vấn đề #1 — Thiếu Service Worker `OneSignalSDKWorker.js`

**Hiện trạng**: Thư mục `public/` chỉ có `favicon.ico, og-image.jpg, placeholder.svg, print/, robots.txt`. **Không có** `OneSignalSDKWorker.js`.

**Hậu quả**: OneSignal SDK v16 init xong nhưng khi user nhấn "Bật thông báo" → SDK gọi `navigator.serviceWorker.register('/OneSignalSDKWorker.js')` → **404** → không tạo subscription được. Toggle vẫn hiển thị "đã bật" nhưng push không bao giờ tới.

**Cách fix**: Copy file user đã upload (`user-uploads://OneSignalSDKWorker.js`) vào `public/OneSignalSDKWorker.js`. Nội dung file đã đúng:
```js
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");
```

## ❌ Vấn đề #2 — Sai header Authorization trong DB trigger

**Hiện trạng** (`notify_push_on_insert`):
```sql
'Authorization', 'Key ' || v_rest_key
```

**API key user cấp**: `os_v2_app_numioy5i...` — đây là **App API Key v2** (định dạng mới của OneSignal). Theo doc OneSignal REST API hiện hành, header bắt buộc là:
```
Authorization: Basic <REST_API_KEY>
```

**Hậu quả**: OneSignal API trả `401 Unauthorized`. Lỗi được catch và ghi vào `audit_logs` (action `SYSTEM`, table `notifications`) — UI không thấy gì, push âm thầm không gửi.

**Cách fix**: Migration sửa function `notify_push_on_insert`, đổi `'Key ' || v_rest_key` thành `'Basic ' || v_rest_key`.

## ⚠️ Vấn đề #3 — `AuthContext` gọi `OneSignal.logout()` dư khi bootstrap

**Hiện trạng** (`src/contexts/AuthContext.tsx` lines 51-57): Mỗi khi `syncAuthState` chạy với `newSession = null` (kể cả lúc bootstrap session lần đầu khi user CHƯA login), code đẩy `OneSignal.logout()` vào `OneSignalDeferred`.

**Hậu quả**: Không crash (vì OneSignal v16 chấp nhận logout khi chưa login), nhưng dư + log warning console. Ngoài ra trên trang `/login` cứ refresh là warning. Không phải lỗi chặn nhưng nên dọn cùng lúc.

**Cách fix**: Chỉ gọi `OneSignal.logout()` khi `source === "SIGNED_OUT"` (event thực sự, không phải BOOTSTRAP với session null).

## Files sẽ thay đổi

**Tạo mới:**
- `public/OneSignalSDKWorker.js` — copy từ file user đã upload

**Sửa:**
- `src/contexts/AuthContext.tsx` — guard `OneSignal.logout()` chỉ gọi khi event SIGNED_OUT
- Migration mới: `CREATE OR REPLACE FUNCTION notify_push_on_insert` đổi header `Key` → `Basic`

**Không đụng**:
- `src/main.tsx`, `src/hooks/useOneSignal.ts`, `src/types/onesignal.d.ts`, `index.html` — đã đúng
- Các UI component `PushNotificationToggle/Card/PushToggleButton` — đã đúng
- `system_config` table data — credentials đã insert đúng
- Secrets VAPID cũ — giữ tạm phòng rollback (vô hại)

## Test sau khi fix

1. Mở **tab thật** `https://app.saigonholiday.vn` (KHÔNG dùng iframe Lovable preview)
2. Đăng nhập → vào **Cài đặt → Thông báo** → bật toggle "Thông báo trình duyệt" → Cho phép permission
3. Mở DevTools > Application > Service Workers → phải thấy `OneSignalSDKWorker.js` đã activate
4. Vào https://dashboard.onesignal.com → Audience → có 1 subscription với `external_id` = user.id của bạn
5. Test end-to-end:
   - Cách A: Tự mention chính mình trong InternalNotes của 1 lead/booking
   - Cách B: Tạo 1 đơn nghỉ phép (sẽ tạo notification cho HR)
6. Kiểm tra notification hiện trên cả desktop browser + điện thoại (nếu đã subscribe trên cả 2)
7. Nếu vẫn không có push → check OneSignal Dashboard > Delivery để xem từng request có pass hay fail (sẽ rõ lỗi 401 nếu header vẫn sai)

## Rủi ro

- **Không** cần tạo lại OneSignal app, không cần đổi credentials
- DB migration là `CREATE OR REPLACE FUNCTION` — không mất data, không khóa bảng
- File `OneSignalSDKWorker.js` chỉ là 1 dòng `importScripts`, không có logic phức tạp
- Sau khi fix sẽ test ngay, nếu vẫn fail tôi sẽ check `audit_logs` action=SYSTEM để xem chính xác lỗi từ OneSignal API trả về
