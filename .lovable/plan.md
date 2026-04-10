
Vấn đề thực tế

- Link reset đang được tạo bằng URL hardcode `https://app.saigonholiday.vn/reset-password` ở cả frontend và edge function, trong khi project hiện đang chạy ở preview/published `*.lovable.app`. Vì vậy email có thể dẫn sang host khác hoặc host không truy cập được.
- `AuthContext.tsx` đang đá người dùng về `/login` khi refresh token cũ lỗi (`refresh_token_not_found` trong auth logs), kể cả lúc đang ở flow recovery. Điều này làm link reset vừa mở xong đã bị phá.
- `ResetPassword.tsx` mới xử lý `?code` và hash cũ, chưa ưu tiên case đã có recovery session sẵn, nên dễ rơi vào trạng thái treo xác thực rồi báo link hỏng.

Do I know what the issue is?

- Có. Đây là lỗi phối hợp giữa URL reset bị hardcode sai môi trường và AuthContext ngắt phiên recovery quá sớm.

Kế hoạch sửa

1. Chuẩn hóa 1 nguồn URL reset duy nhất
- Sửa `src/lib/authRedirect.ts` để không hardcode cố định theo một domain chết/khác môi trường.
- Dùng một rule rõ ràng:
  - nếu có domain chính thức đang hoạt động thì dùng domain đó
  - nếu không thì fallback về origin hiện tại của app
- Cập nhật mọi chỗ gọi reset dùng chung helper này:
  - `src/pages/Login.tsx`
  - `src/components/employees/EmployeeRoleTab.tsx`
  - `supabase/functions/manage-employee-accounts/index.ts`

2. Ngăn AuthContext phá flow reset
- Sửa `src/contexts/AuthContext.tsx` để khi đang ở `/reset-password` hoặc `/first-login-change-password`, lỗi refresh token không redirect thẳng về `/login`.
- Với recovery path, chỉ clear session lỗi/stale token và để trang reset tự xử lý token recovery.

3. Làm trang Reset Password chịu lỗi tốt hơn
- Sửa `src/pages/ResetPassword.tsx` để xử lý đủ 3 case:
  - đã có recovery session
  - có `code` để exchange
  - có hash `type=recovery`
- Hiển thị lý do rõ hơn cho case link hết hạn / đã dùng / không hợp lệ.
- Không giữ timeout chờ mù 60 giây nếu đã xác định được trạng thái.

4. Đồng bộ luồng reset từ admin
- Sửa `supabase/functions/manage-employee-accounts/index.ts` để email reset do admin gửi cũng dùng đúng redirect URL mới.
- Đồng bộ toast/message để user biết link sẽ mở về đúng app đang dùng, không còn trỏ nhầm.

5. QA sau khi sửa
- Test “Quên mật khẩu” từ `/login`
- Test reset do admin gửi
- Test khi browser đang có refresh token cũ trong localStorage
- Test link đã dùng/hết hạn
- Test sau khi đặt mật khẩu mới: đăng nhập lại bình thường, không bị loop sang `/login` hoặc `/first-login-change-password`

Files dự kiến chỉnh
- `src/lib/authRedirect.ts`
- `src/pages/Login.tsx`
- `src/components/employees/EmployeeRoleTab.tsx`
- `src/contexts/AuthContext.tsx`
- `src/pages/ResetPassword.tsx`
- `supabase/functions/manage-employee-accounts/index.ts`

Kết quả mong đợi
- Link reset mở được đúng domain/app
- Không còn bị redirect sai do refresh token cũ
- Trang reset vào thẳng form đổi mật khẩu khi token hợp lệ
- Link lỗi/hết hạn báo rõ ràng thay vì “không vào được”
