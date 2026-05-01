## Tóm tắt

KHÔNG làm theo 4 bước anh yêu cầu. Lý do: hook `auth-email-hook` trong project là **Lovable-managed hook**, ký bằng `LOVABLE_API_KEY`. Việc anh tự enable "Send Email Hook" trong Supabase Dashboard và paste secret riêng sẽ tạo **2 hook chồng nhau** → email hỏng.

## Vấn đề đang xảy ra

- Lovable backend đã đăng ký hook tự động qua kênh riêng (Cloud → Emails). Function verify chữ ký bằng `LOVABLE_API_KEY` (đã có sẵn trong Edge Secrets).
- Anh vào Supabase Dashboard → Authentication → Hooks → Send Email Hook → enable trỏ về URL `auth-email-hook` với secret `v1,whsec_...` tự generate.
- Hệ quả khi Supabase Auth gửi email recovery:
  - Supabase gọi hook với chữ ký dùng secret của anh (`whsec_...`).
  - Function verify bằng `LOVABLE_API_KEY` → **mismatch → reject 401**.
  - Email recovery không đi qua queue → user không nhận mail HOẶC Supabase fallback gửi mail mặc định (link `supabase.co/auth/v1/verify`) → bug cross-device iOS tái xuất.

## Action plan (3 bước)

### Bước 1 — Anh tự làm trong Supabase Dashboard (em không có quyền)

1. Mở https://supabase.com/dashboard/project/aneazkhnqkkpqtcxunqd/auth/hooks
2. Tìm mục **Send Email Hook**.
3. Bấm **Disable** (hoặc Delete). Không cần lưu lại secret — vứt đi.
4. Confirm với em là đã disable.

### Bước 2 — Em verify domain đang active

Em gọi `check_email_domain_status` để confirm `notify.app.saigonholiday.vn` đang ở state `active`. Nếu chưa active → báo anh chờ DNS verify trong Cloud → Emails.

### Bước 3 — Test thực tế

Sau khi anh disable hook thủ công + domain active:
1. Mở `/login` → bấm "Quên mật khẩu" → nhập email anh.
2. Em check log `auth-email-hook` xem có nhận event `Received auth event { emailType: 'recovery' }` không.
3. Em check `email_send_log` xem có row `template_name='recovery'`, `status='sent'` không.
4. Anh mở email trên iPhone → confirm link dạng `https://app.saigonholiday.vn/reset-password?token_hash=...&type=recovery` (KHÔNG phải `supabase.co/auth/v1/verify`).
5. Click link → form đổi mật khẩu hiện ra.

## Những gì KHÔNG làm

- ❌ Không lưu secret `whsec_...` vào Edge Function Secrets.
- ❌ Không sửa `auth-email-hook/index.ts` để verify chữ ký Supabase native — sẽ phá Lovable pipeline.
- ❌ Không deploy lại function (không cần — code đã đúng).
- ❌ Không tạo hook Supabase native song song với Lovable hook.

## Tại sao approach này đúng

`AUTH_CONFIG.md` mục #3 đã ghi rõ: link recovery được override bởi Lovable-managed `auth-email-hook` → build link app trực tiếp với `token_hash` → cross-device safe. Pipeline này chỉ chạy khi Supabase forward event qua **Lovable backend**, không phải qua hook thủ công của anh.
