# Nguyên nhân gốc rễ (đã xác định bằng log)

Đối chiếu fingerprint trực tiếp:

| Nơi | Public key fingerprint | Khớp? |
|---|---|---|
| Client (`.env` → `VITE_VAPID_PUBLIC_KEY`) | `BKSOWNaUPd…cE3U` (len=87) | ❌ |
| Server (Supabase secret `VAPID_PUBLIC_KEY`, từ edge log) | `BHmaQ9wVam…RPgRhs` (len=87) | ❌ |

→ **HAI KHOÁ HOÀN TOÀN KHÁC NHAU.** Browser đăng ký bằng khoá A, server ký JWT bằng khoá B → push provider trả 403 `VapidPkHashMismatch` → vòng lặp xoá-tạo lại không bao giờ xong. Đây KHÔNG phải lỗi code, là lỗi cấu hình secret.

# Giải pháp

Tạo MỘT cặp VAPID mới hoàn toàn, ghi đè đồng thời cả 3 nơi để đảm bảo khớp 100%:

## Bước 1 — Sinh cặp VAPID mới
Chạy script Deno trong sandbox để sinh cặp ECDSA P-256 mới (public + private), in ra dưới dạng base64url. Public key 65 bytes uncompressed (bắt đầu `0x04`), private key 32 bytes.

## Bước 2 — Cập nhật 3 nơi cùng lúc
1. **Client `.env`** → ghi `VITE_VAPID_PUBLIC_KEY="<NEW_PUBLIC>"` (ghi đè giá trị cũ `BKSOWNaU…`).
2. **Supabase secret `VAPID_PUBLIC_KEY`** → cập nhật bằng `update_secret` thành `<NEW_PUBLIC>` (ghi đè `BHmaQ9wV…`).
3. **Supabase secret `VAPID_PRIVATE_KEY`** → cập nhật bằng `update_secret` thành `<NEW_PRIVATE>` (cùng cặp).

## Bước 3 — Wipe sạch subscription cũ
Xoá toàn bộ rows trong `push_subscriptions` (qua migration DELETE) vì chúng đã đăng ký với khoá cũ và sẽ luôn lệch.

## Bước 4 — Re-deploy edge function
Deploy lại `send-notification` để chắc chắn nó pick up secret mới.

## Bước 5 — Verify
- Gọi edge function và xem log: fingerprint `vapid_public=` PHẢI bắt đầu bằng cùng prefix với `.env` mới.
- Anh mở app trong tab thật → Cài đặt → Thông báo → bấm "Đăng ký lại" (browser sẽ subscribe bằng khoá mới) → bấm "Gửi thử push" → notification HIỆN.

# Files / actions

- (script tạm) `/tmp/gen-vapid.ts` — sinh cặp VAPID
- `update_secret` × 2 — `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`
- `.env` — đổi `VITE_VAPID_PUBLIC_KEY`
- migration SQL — `DELETE FROM push_subscriptions;`
- `deploy_edge_functions(["send-notification"])`
- `curl_edge_functions` để verify fingerprint trong log mới

# Cam kết
Sau khi xong tôi sẽ đối chiếu fingerprint lần cuối và báo cáo: "client=Xxxx, server=Xxxx, KHỚP". Nếu vẫn lệch tôi nhận thua thật sự, nhưng với cách này thì không thể lệch được vì cả 3 nơi đều ghi cùng một giá trị trong cùng một lượt.

Sau khi anh duyệt tôi triển khai ngay.
