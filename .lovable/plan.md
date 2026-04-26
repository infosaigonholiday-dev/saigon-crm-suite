## Chẩn đoán chính xác

Logs `send-notification` cho thấy push request bị FCM trả về:
```
status=403 body={"reason":"BadJwtToken"}
```

Đây **không phải** lỗi OS/browser block notification. Push thực sự được gửi đi tới Google FCM, nhưng **Google từ chối JWT VAPID** trước cả khi tới browser của user. Vì vậy notification không bao giờ được hiển thị.

### Nguyên nhân khả dĩ nhất

`VAPID_PUBLIC_KEY` và `VAPID_PRIVATE_KEY` user paste trong tin nhắn trước **không phải một cặp ECDSA P-256 match nhau**:

- Public key: `BLj9izHrUUSv9YoWBxJZHZjjGdDjZE2wU617zed7rVD40fepnLiqPoYnoAOow_gc_4uyAI1jr5ocHVMXtceof7s` (65 bytes uncompressed point ✓)
- Private key: `ux-5pf2I8cMFa2mJsIzmDgtq7mqlR4UTErgN0v7mNdw` (32 bytes scalar d ✓)

Cả hai đều **đúng format**, nhưng nếu chúng được sinh ở 2 lần khác nhau (ví dụ user paste public của lần generate này nhưng private của lần generate khác) → JWT sẽ ký bằng private key A nhưng header `k=publicB` → FCM verify chữ ký fail → `BadJwtToken`.

Đây là lý do tại sao:
- Browser **subscribe thành công** (chỉ cần publicKey hợp lệ)
- Push manager **chấp nhận subscription** 
- Edge function **gửi request thành công** (sent=1)
- Nhưng FCM **reject JWT** (failed=1)

## Kế hoạch fix

### Bước 1: Tự verify keypair trong edge function (read-only check)

Thêm hàm `verifyVapidKeypair()` vào `send-notification/index.ts`:

1. Import private key d (32 bytes) làm ECDSA P-256 key
2. Derive public point bằng cách: dùng `crypto.subtle.exportKey('jwk', privateKey)` — Web Crypto API tự derive x,y khi import từ d (nếu d hợp lệ với cặp x,y đã cho)
3. Cách đơn giản hơn: import private key kèm `VAPID_PUBLIC_KEY` x,y → nếu Web Crypto không reject thì keypair match. Nếu reject → keypair sai.
4. Thực tế: cách chắc chắn nhất là **sign-then-verify**: tạo JWT mẫu → verify bằng public key → nếu fail → mismatch.

Khi phát hiện mismatch, edge function trả về JSON error rõ ràng:
```json
{
  "error": "vapid_keypair_mismatch",
  "detail": "VAPID_PUBLIC_KEY và VAPID_PRIVATE_KEY không phải cặp khớp nhau. Cần generate lại cặp mới."
}
```

Frontend hiển thị toast tiếng Việt giải thích và hướng dẫn user.

### Bước 2: Tạo edge function `vapid-generate` (one-shot utility)

Tạo function mới `supabase/functions/vapid-generate/index.ts`:
- Chỉ ADMIN gọi được (verify JWT + check role)
- Generate cặp ECDSA P-256 mới đúng chuẩn Web Push VAPID:
  - Public key: 65 bytes uncompressed point (0x04 || x || y), encode base64url
  - Private key: 32 bytes scalar d, encode base64url
- **KHÔNG tự lưu vào secrets** (edge function không có quyền update secrets)
- Trả về JSON cặp khoá để mình paste vào secrets thay user

### Bước 3: Generate cặp mới và update toàn bộ 3 nơi đồng thời

Sau khi có cặp mới đúng từ vapid-generate:
1. Update `VAPID_PUBLIC_KEY` trong Supabase secrets
2. Update `VAPID_PRIVATE_KEY` trong Supabase secrets  
3. Update `VITE_VAPID_PUBLIC_KEY` trong `.env` frontend
4. `DELETE FROM push_subscriptions` (vì sub cũ ký bằng public key cũ)
5. Redeploy `send-notification` để load secrets mới

### Bước 4: Test end-to-end thực tế

Sau khi sync key:
1. Mở app trong tab thật (không phải iframe) → reload để Vite pick up `.env` mới
2. Vào Cài đặt → Thông báo → bật push (subscribe lại)
3. Bấm "Gửi thử push"
4. Check `edge_function_logs` → phải thấy `sent=1 failed=0`
5. Notification phải xuất hiện trên màn hình

### Bước 5: Bonus — fix lỗi Safari `BadJwtToken` riêng

Nếu sau khi fix keypair mà vẫn còn lỗi 403 cho riêng Safari endpoint (`web.push.apple.com`), Apple yêu cầu thêm **`exp` không quá 24h** và **`sub` phải là mailto:** hợp lệ — cả 2 điều này code hiện đã đáp ứng. Nếu vẫn fail, sẽ debug riêng sau.

## Files sẽ thay đổi

- `supabase/functions/send-notification/index.ts` — thêm verifyVapidKeypair() + log chi tiết hơn khi 403
- `supabase/functions/vapid-generate/index.ts` — **NEW**, utility generate cặp khoá đúng chuẩn
- `.env` — update `VITE_VAPID_PUBLIC_KEY` với public key mới
- Supabase secrets — update `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY`
- Migration — `DELETE FROM push_subscriptions` lần cuối

## Tại sao cách này chắc chắn fix

Cặp khoá generate trong edge function bằng `crypto.subtle.generateKey({name:'ECDH', namedCurve:'P-256'})` rồi export ra raw bytes là cách **chuẩn 100%** mà các thư viện như `web-push` (npm) cũng làm. Không có khả năng sai cặp vì cả 2 khoá ra cùng một lần generate. Sau khi paste cùng cặp này vào cả frontend env và backend secrets → JWT signature sẽ verify thành công bởi FCM/Apple Push.
