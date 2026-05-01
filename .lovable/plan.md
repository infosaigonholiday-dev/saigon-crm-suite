# Fix iOS Reset Password — xoá thật `exchangeCodeForSession` khỏi `ResetPassword.tsx`

## Mục tiêu
Đảm bảo route `/reset-password` chỉ dùng `supabase.auth.verifyOtp()` cho recovery token, không còn bất kỳ lời gọi, fallback, hay cả chuỗi/comment `exchangeCodeForSession` trong `src/pages/ResetPassword.tsx`.

## Hiện trạng đã xác nhận
- `src/pages/ResetPassword.tsx` hiện **không còn runtime call** `exchangeCodeForSession`.
- Nhưng file này vẫn còn **comment chứa literal** `exchangeCodeForSession` ở đoạn xử lý recovery token, nên lệnh grep theo đúng yêu cầu của bạn hiện vẫn **không empty**.
- Log hiện tại là:
  - `[reset-password] verifyOtp called with token_hash`
  - `[reset-password] verifyOtp success`
  - `[reset-password] verifyOtp failed`
- Điều này chưa khớp 100% với yêu cầu log exact string của bạn: `[reset-password] verifyOtp called`.

## Thay đổi sẽ thực hiện
### 1) Sửa đúng `src/pages/ResetPassword.tsx`
- Xoá toàn bộ literal `exchangeCodeForSession` khỏi file, bao gồm:
  - comment mô tả flow
  - comment giải thích bug PKCE cũ
  - mọi dấu vết text còn sót lại
- Giữ duy nhất flow recovery như sau:
```ts
const code = url.searchParams.get("code");
const tokenHash = url.searchParams.get("token_hash");
const tokenFromUrl = tokenHash || url.searchParams.get("token") || code;

if (tokenFromUrl) {
  console.log("[reset-password] verifyOtp called");
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenFromUrl,
    type: "recovery",
  });
  ...
}
```
- Cụ thể với URL `?code=xxx`, value `code` sẽ được truyền vào đúng field `token_hash` như yêu cầu.

### 2) Chuẩn hoá console log đúng theo spec
- Đổi log từ:
  - `[reset-password] verifyOtp called with token_hash`
- Thành:
  - `[reset-password] verifyOtp called`
- Giữ:
  - `[reset-password] verifyOtp success`
  - `[reset-password] verifyOtp failed`

### 3) Không đụng các phần bị cấm
- Không thêm lại `exchangeCodeForSession` ở bất kỳ nhánh nào.
- Không dùng fallback PKCE.
- Không sửa `FirstLoginChangePassword.tsx`.
- Không đổi login flow PKCE trong `client.ts`.
- Không đổi DB schema / role / permission.

## Bằng chứng sẽ trả sau khi implement
Tôi sẽ paste đúng 4 mục bạn yêu cầu:
1. Output `grep -n "exchangeCodeForSession" src/pages/ResetPassword.tsx` → empty
2. Đoạn code trước khi xoá
3. Đoạn code sau khi thay bằng `verifyOtp`
4. Tên hàm Supabase dùng cho recovery: `supabase.auth.verifyOtp`

## Technical notes
- Root cause hiện còn thấy trong file là **comment/string residue**, không phải runtime call trực tiếp trong source hiện tại.
- Vì bạn yêu cầu grep phải empty, bản fix sẽ xoá luôn cả text residue để loại bỏ mọi nghi ngờ và tránh tái diễn sai sót ở round sau.
- Flow cuối cùng vẫn là:
```text
?token_hash=... / ?token=... / ?code=...
→ supabase.auth.verifyOtp({ token_hash: <value>, type: 'recovery' })
→ PASSWORD_RECOVERY / SIGNED_IN
→ hiện form đổi mật khẩu
```