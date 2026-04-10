
Vấn đề đã khá rõ:

- Ảnh lỗi cho thấy email reset đang dẫn tới `localhost:3000`.
- Trên iPhone/máy người dùng, `localhost` luôn trỏ về chính điện thoại đó, không phải server/app của công ty, nên chắc chắn ra `ERR_CONNECTION_FAILED`.
- Trong code hiện có 2 chỗ đang tạo link reset bằng `window.location.origin`:
  - `src/pages/Login.tsx`
  - `src/components/employees/EmployeeRoleTab.tsx`
- Điều này nghĩa là: ai bấm gửi email reset ở môi trường nào thì email sẽ mang domain của môi trường đó. Nếu gửi từ local/dev thì link sẽ thành `localhost:3000`.
- Edge function `manage-employee-accounts` lại đang hardcode `https://app.saigonholiday.vn/reset-password`, nên hiện tại luồng reset bị không đồng nhất.
- `auth-email-hook` không phải gốc lỗi; nó chỉ gửi lại `payload.data.url` mà Supabase cung cấp.

Kế hoạch fix:

1. Chuẩn hóa domain reset password
- Tạo 1 nguồn duy nhất cho auth redirect, ví dụ `VITE_AUTH_REDIRECT_URL` hoặc helper `getAuthRedirectUrl()`.
- Mặc định production dùng `https://app.saigonholiday.vn/reset-password`.
- Không để từng màn tự lấy `window.location.origin` nữa.

2. Sửa các điểm đang gửi reset email
- `src/pages/Login.tsx`: thay `window.location.origin` bằng URL chuẩn.
- `src/components/employees/EmployeeRoleTab.tsx`: thay tương tự.
- Nếu cần, giữ fallback cho dev nội bộ nhưng phải có guard rõ ràng, tránh gửi email thật với link localhost.

3. Đồng bộ luồng admin reset
- Kiểm tra `supabase/functions/manage-employee-accounts/index.ts`.
- Hoặc giữ `app.saigonholiday.vn` làm chuẩn, hoặc đưa edge function dùng cùng một cấu hình redirect thống nhất để sau này không lệch giữa “Quên mật khẩu” và “Admin reset”.

4. Kiểm tra cấu hình Supabase
- Xác nhận URL `https://app.saigonholiday.vn/reset-password` đã nằm trong Auth redirect allowlist/site URL.
- Nếu còn dùng preview để test reset, thêm preview URL đúng chuẩn; tuyệt đối không dùng localhost cho email thực tế.

5. Cách xử lý tạm thời ngay bây giờ
- Khi chưa sửa code, chỉ gửi email reset từ bản production.
- Nếu lỡ nhận email có link `localhost:3000`, có thể thay phần domain đó bằng `https://app.saigonholiday.vn` rồi mở lại, miễn là giữ nguyên path/query phía sau.

6. Hướng dẫn vận hành về sau
- Không dùng bản local để gửi email reset cho người dùng thật.
- Mọi luồng email auth phải dùng 1 domain cố định.
- Khi đổi domain chính thức, chỉ sửa 1 biến cấu hình thay vì sửa từng file.
- Sau khi fix, test 3 luồng:
  - Quên mật khẩu từ trang Login
  - Admin gửi reset từ trang Nhân sự
  - Mở link trên điện thoại thật

File dự kiến chỉnh:
- `src/pages/Login.tsx`
- `src/components/employees/EmployeeRoleTab.tsx`
- có thể thêm `src/lib/authRedirect.ts`
- có thể chỉnh thêm `supabase/functions/manage-employee-accounts/index.ts` để đồng bộ cấu hình
