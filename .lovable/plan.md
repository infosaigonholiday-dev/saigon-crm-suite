
Mình bổ sung kế hoạch theo đúng 3 lỗi bạn đang gặp, và qua code hiện tại thì đúng là đang thiếu/không rõ ở cả 3 chỗ:

1. Vấn đề “Bàn giao nhưng không hiện danh sách nhân sự”
- `DataHandoverDialog.tsx` hiện chỉ query người nhận từ `profiles` với điều kiện:
  - `is_active = true`
  - khác người đang bị vô hiệu hóa
  - và nếu có `department_id` thì bị giới hạn đúng cùng phòng ban
- UI hiện không có:
  - trạng thái loading
  - thông báo “không có người nhận phù hợp”
  - fallback chọn ngoài phòng ban
- Kết quả là nhìn như dropdown “trống bất thường”, rất khó hiểu.

2. Vấn đề “Tạo mới vẫn lỗi”
- `SettingsAccountsTab.tsx` và `EmployeeRoleTab.tsx` đều gọi edge function `manage-employee-accounts`.
- Ở UI hiện chỉ toast lỗi chung `err.message`, nên khi edge function trả lỗi kiểu non-2xx thì người dùng chỉ thấy lỗi mơ hồ.
- Screenshot của bạn đúng với case này: frontend chưa parse và hiển thị nguyên nhân thật sự.
- Ngoài ra mô tả dialog vẫn ghi “Email đặt mật khẩu sẽ được gửi tự động”, nhưng edge function hiện tại lại KHÔNG gửi recovery email khi create, chỉ tạo tài khoản với mật khẩu mặc định. Nội dung UI đang sai với logic backend.

3. Vấn đề “Không tìm được nút xóa”
- Hiện tại trong `SettingsAccountsTab.tsx` chưa có nút xóa tài khoản nào cả.
- Edge function `manage-employee-accounts` cũng chưa có action `delete_account`.
- Tức là phần này mới ở mức ý tưởng trước đó, chưa được triển khai.

Kế hoạch cập nhật

1. Sửa dialog bàn giao để luôn hiểu được vì sao danh sách người nhận trống
- Cập nhật `DataHandoverDialog.tsx`:
  - thêm loading state cho danh sách người nhận
  - thêm empty state rõ ràng: “Không có nhân sự hoạt động cùng phòng ban để nhận bàn giao”
  - hiển thị số lượng người nhận tìm thấy
- Nếu phòng ban hiện tại không có ai phù hợp:
  - cho phép fallback hiển thị nhân sự active ngoài phòng ban (ưu tiên cùng phòng ban trước, nếu rỗng thì mở rộng toàn hệ thống)
  - gắn badge/phụ chú để admin biết ai là “khác phòng ban”

2. Làm rõ quy tắc chọn người nhận bàn giao
- Giữ nguyên ưu tiên:
  - cùng phòng ban
  - active
  - không phải chính tài khoản đang bị khóa
- Nhưng nếu không có ai trong phòng ban:
  - không để dropdown trống im lặng nữa
  - thay bằng danh sách fallback toàn hệ thống hoặc message yêu cầu admin tạo/chọn người thay thế trước
- Đồng thời cập nhật phần mô tả dialog để giải thích vì sao có thể không hiện danh sách.

3. Sửa luồng tạo tài khoản để báo lỗi thật, không báo chung chung
- Cập nhật `SettingsAccountsTab.tsx` và `EmployeeRoleTab.tsx`:
  - parse lỗi edge function tốt hơn
  - ưu tiên hiện `data.error` từ server thay vì chỉ “Edge Function returned a non-2xx status code”
  - hiển thị các case dễ hiểu như:
    - email đã tồn tại
    - profile/employee link lỗi
    - không đủ quyền
    - profile mồ côi / account trùng
- Đồng thời sửa text trong dialog tạo tài khoản cho đúng thực tế:
  - không còn ghi “email đặt mật khẩu sẽ được gửi tự động”
  - thay bằng mô tả đúng: tạo với mật khẩu mặc định và bắt buộc đổi mật khẩu ở lần đăng nhập đầu

4. Bổ sung nút xóa thật sự trong Cài đặt
- Thêm action `delete_account` vào `supabase/functions/manage-employee-accounts/index.ts`
- Luồng xóa:
  - không cho xóa chính tài khoản đang đăng nhập
  - unlink `employees.profile_id`
  - xóa `profiles`
  - xóa `auth.users` nếu tồn tại
  - xử lý graceful cho orphan account
- Sau đó thêm nút xóa màu đỏ trong `SettingsAccountsTab.tsx` với `AlertDialog` xác nhận rõ:
  - “Xóa hoàn toàn tài khoản đăng nhập”
  - dành cho tài khoản test hoặc tài khoản lỗi
  - không dùng để thay thế quy trình nghỉ việc bình thường

5. Phân biệt rõ 3 thao tác trong UI
- “Xóa nhân viên” ở module Nhân sự = soft delete hồ sơ nhân sự
- “Vô hiệu hóa tài khoản” = khóa đăng nhập, giữ lịch sử
- “Xóa tài khoản” ở Cài đặt = xóa hẳn account/profile, chỉ dành cho test/orphan/case đặc biệt
- Sẽ bổ sung wording ngay trên tab Tài khoản và trong dialog xác nhận để admin không bị lẫn.

6. Rà lại hiển thị nút xóa theo quyền
- Vì hiện page Settings chỉ check `settings.view/edit`, còn nút xóa là hành động cực nhạy cảm:
  - chỉ hiện cho admin phù hợp
  - ẩn với tài khoản hiện tại của chính mình
- Nếu cần, sẽ khóa thêm ở edge function để không phụ thuộc riêng frontend.

Files dự kiến chỉnh
- `src/components/settings/DataHandoverDialog.tsx`
- `src/components/settings/SettingsAccountsTab.tsx`
- `src/components/employees/EmployeeRoleTab.tsx`
- `supabase/functions/manage-employee-accounts/index.ts`

Kết quả mong đợi sau khi cập nhật
- Có bàn giao thì phải thấy rõ danh sách người nhận hoặc lý do không có ai để chọn
- Tạo tài khoản mới nếu lỗi sẽ hiện đúng nguyên nhân, không còn lỗi chung chung
- Tab Cài đặt có nút xóa tài khoản thật sự cho account test / account lỗi
- Admin phân biệt rõ “xóa nhân viên”, “vô hiệu hóa tài khoản”, và “xóa tài khoản”

Chi tiết kỹ thuật
- Ưu tiên giữ offboarding chuẩn cho nhân viên thật: bàn giao + vô hiệu hóa, không xóa cứng
- Chỉ thêm hard-delete cho case test/orphan/sai dữ liệu
- Với danh sách người nhận bàn giao, sẽ đổi từ query “cùng phòng ban hoặc trống” sang:
  - cùng phòng ban trước
  - nếu rỗng thì fallback toàn hệ thống
  - có chú thích người nhận ngoài phòng ban
