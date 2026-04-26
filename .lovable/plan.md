## Mục tiêu
Đổi cách build `Authorization` header trong Edge Function `send-notification` thành `Basic <KEY>` cho mọi trường hợp (bỏ nhánh `Key ...` cho prefix `os_v2_`), deploy lại, rồi test INSERT notification để xem OneSignal trả về gì.

## Thay đổi code

**File:** `supabase/functions/send-notification/index.ts` (dòng ~57–60)

Trước:
```ts
const authHeader = ONESIGNAL_REST_API_KEY.startsWith("os_v2_")
  ? `Key ${ONESIGNAL_REST_API_KEY}`
  : `Basic ${ONESIGNAL_REST_API_KEY}`;
```

Sau:
```ts
const authHeader = `Basic ${ONESIGNAL_REST_API_KEY}`;
```

Giữ nguyên:
- Endpoint: `https://api.onesignal.com/notifications`
- Body OneSignal (app_id, include_aliases.external_id, headings, contents, url, web_url)
- Debug log secrets ở đầu function

## Thực thi
1. Edit `supabase/functions/send-notification/index.ts` đúng 1 đoạn trên.
2. Deploy lại function `send-notification` (`supabase--deploy_edge_functions`).
3. Test:
   - INSERT 1 dòng vào `public.notifications` cho user `21587d06-9c1e-47c2-aa78-f7daadea4ddb` để kích hoạt trigger `notify_push_on_insert` → gọi `send-notification` → gọi OneSignal.
   - Đồng thời gọi trực tiếp `send-notification` qua `supabase--curl_edge_functions` với cùng payload để có response ngay lập tức (không phải đợi pg_net).
4. Đọc log function (`supabase--edge_function_logs send-notification`) để lấy:
   - `DEBUG_SECRETS` (xác nhận key vẫn 113 ký tự)
   - HTTP status OneSignal trả về
   - Body JSON OneSignal trả về (errors / id / recipients)
5. Paste nguyên văn cho bạn: status + body OneSignal.

## Kết quả mong đợi
- Nếu `Basic` đúng → status 200, body có `id` + `recipients > 0` → push tới thiết bị.
- Nếu vẫn 401/403 → key thực sự không hợp lệ với endpoint v1/v2 này (lúc đó bạn cho biết sandbox của bạn dùng URL + header chính xác nào, tôi sẽ map đúng).
