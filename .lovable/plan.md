

## Debug "không bật được" Web Push

### Nguyên nhân nghi ngờ (theo screenshot)

Browser permission của bạn là **"Cho phép"** rồi → KHÔNG phải lỗi denied. Vậy còn 3 khả năng:

1. **Đang xem qua iframe lovable.dev editor** — Service Worker và `pushManager.subscribe()` bị browser chặn trong cross-origin iframe. Đây là khả năng cao nhất.
2. **Service Worker `/sw.js` không register được** — file 404 hoặc lỗi MIME.
3. **`subscribe()` throw lỗi im lặng** — VAPID key sai format hoặc Supabase upsert fail.

### Cách xác định

**Test #1 — Mở preview thẳng (không qua editor)**:
Mở tab mới → vào `https://id-preview--1632605d-2e2c-4155-8254-0b9de359ce51.lovable.app/cai-dat` → đăng nhập → bật toggle. Nếu chạy ngon → confirm là do iframe editor.

**Test #2 — Check Service Worker**:
Trong tab preview trực tiếp → F12 → Application → Service Workers → phải thấy `/sw.js` status "activated and is running". Nếu không thấy → SW chưa register.

**Test #3 — Check console khi click toggle**:
F12 → Console → bật toggle → tìm dòng `[push] subscribe error` (hook đã có sẵn `console.error`). Copy lỗi cho tôi.

### Plan fix sau khi xác định

Sẽ chỉnh `src/hooks/usePushSubscription.ts` và `src/components/PushNotificationToggle.tsx`:

1. **Thêm log chi tiết** ở mọi step (`getRegistration`, `register`, `requestPermission`, `subscribe`, `upsert`) để dễ debug
2. **Hiện toast lỗi cụ thể** thay vì chỉ "Không thể bật" — phân biệt: SW fail, subscribe fail, DB upsert fail, iframe blocked
3. **Detect iframe**: nếu `window.top !== window.self` → hiện banner "Mở trang trong tab mới để bật thông báo" + nút "Mở tab mới" link tới preview URL
4. **Verify `/sw.js` accessible**: trong `subscribe()`, fetch HEAD `/sw.js` trước, nếu 404 → toast rõ ràng
5. **Verify VAPID key format**: log key length (phải = 87 ký tự base64url) trước khi gọi `subscribe`

### Hành động ngay từ phía bạn (trước khi tôi sửa code)

Mở preview URL trực tiếp ở tab mới, F12 console, bật toggle, **paste lại log lỗi** (dòng `[push] subscribe error ...`). Có log tôi fix chính xác trong 1 lần thay vì đoán.

Nếu bạn đồng ý, sau khi nhận log tôi sẽ apply 5 cải tiến trên trong cùng 1 lượt sửa.

