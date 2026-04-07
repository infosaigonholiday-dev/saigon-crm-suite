

# Fix: Email reset không gửi được

## Nguyên nhân

Edge function `manage-employee-accounts` đang dùng `generateLink({ type: "recovery" })` — API này chỉ tạo token/link và trả về, **không gửi email**. Cần đổi sang `resetPasswordForEmail()` — API thực sự gửi email qua hệ thống mặc định của Supabase.

## Phạm vi thay đổi

**Chỉ 1 file duy nhất:** `supabase/functions/manage-employee-accounts/index.ts`

**Chỉ 2 đoạn code thay đổi**, không ảnh hưởng gì khác:

### Thay đổi 1 — Action `reset_password` (dòng 188-201)

Thay:
```ts
const { error: linkErr } = await adminClient.auth.admin.generateLink({
  type: "recovery",
  email: targetEmail,
});
```
Bằng:
```ts
const { error: linkErr } = await adminClient.auth.resetPasswordForEmail(
  targetEmail,
  { redirectTo: "https://app.saigonholiday.vn/reset-password" }
);
```

### Thay đổi 2 — Action `reset_all_passwords` (dòng 271-277)

Thay:
```ts
const { error: linkErr } = await adminClient.auth.admin.generateLink({
  type: "recovery",
  email: profile.email,
});
```
Bằng:
```ts
const { error: linkErr } = await adminClient.auth.resetPasswordForEmail(
  profile.email,
  { redirectTo: "https://app.saigonholiday.vn/reset-password" }
);
```

## Không thay đổi gì khác

- Không thay đổi database/migration
- Không thay đổi frontend (AuthContext, App.tsx, Login, ResetPassword, FirstLoginChangePassword)
- Không thay đổi business logic (mật khẩu mặc định, must_change_password, routing)
- Không cần cấu hình email domain hay SMTP — dùng default sender `no-reply@auth.lovable.cloud`

## Sau khi sửa

Deploy lại edge function và test: Admin bấm "Reset mật khẩu" → nhân sự nhận được email có link reset.

## Cập nhật plan.md

Sửa dòng mô tả B2 và B3 trong plan để ghi rõ dùng `resetPasswordForEmail` thay vì `generateLink`.

