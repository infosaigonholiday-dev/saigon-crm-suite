## Vấn đề

Edge Function `send-notification` đang **crash ngay khi boot** với lỗi:

```
Error: Vapid subject is not a valid URL. info.saigonholiday@gmail.com
```

→ Vì vậy MỌI push từ trigger `notify_push_on_insert` đều thất bại (function chưa kịp xử lý request đã chết).

**Nguyên nhân:** Secret `VAPID_SUBJECT` lưu giá trị `info.saigonholiday@gmail.com` (email trần). Thư viện `web-push` bắt buộc subject phải là URL hợp lệ — tức `mailto:info.saigonholiday@gmail.com` hoặc `https://...`.

## Cách fix

Sửa `supabase/functions/send-notification/index.ts` để **tự normalize** VAPID_SUBJECT:

- Nếu giá trị bắt đầu bằng `mailto:` hoặc `http://` / `https://` → giữ nguyên.
- Nếu là email trần (chứa `@`, không có scheme) → tự động prepend `mailto:`.
- Nếu rỗng → fallback `mailto:info@saigonholiday.com`.
- Log giá trị đã normalize ra console để debug sau này.

Thay đoạn:

```ts
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:info@saigonholiday.com";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}
```

Bằng:

```ts
function normalizeVapidSubject(raw: string): string {
  const v = (raw || "").trim();
  if (!v) return "mailto:info@saigonholiday.com";
  if (/^(mailto:|https?:\/\/)/i.test(v)) return v;
  if (v.includes("@")) return `mailto:${v}`;
  return `mailto:info@saigonholiday.com`;
}

const VAPID_SUBJECT = normalizeVapidSubject(Deno.env.get("VAPID_SUBJECT") || "");
console.log("[send-notification] VAPID_SUBJECT normalized to:", VAPID_SUBJECT);

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  } catch (e) {
    console.error("[send-notification] setVapidDetails failed:", e);
  }
}
```

## Test sau khi fix

1. Deploy lại edge function (tự động).
2. Mở Settings → bấm **"Gửi thử push"** → notification phải hiện trên màn hình.
3. Test trigger: tạo 1 ghi chú có @mention → push tự động gửi.
4. Nếu vẫn lỗi: xem Edge Function logs — giờ sẽ có log rõ subject đang dùng là gì.

## Files thay đổi

- `supabase/functions/send-notification/index.ts` (1 file, ~10 dòng)

Không đụng database, không đụng frontend, không đụng secrets.