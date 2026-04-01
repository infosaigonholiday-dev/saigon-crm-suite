

# Thêm chức năng Sửa tài khoản (phòng ban + role)

## Vấn đề
Tab Tài khoản chỉ có tạo mới, không có nút sửa. Không thể cập nhật phòng ban hoặc role cho tài khoản đã tồn tại.

## Giải pháp
Thêm nút "Sửa" vào cột Thao tác + dialog chỉnh sửa phòng ban và role.

## Thay đổi

### 1. `src/components/settings/SettingsAccountsTab.tsx`
- Thêm state `editProfile` và `editDialogOpen`
- Thêm nút bút chì (Edit) vào cột Thao tác cho mỗi dòng (kể cả chính mình)
- Thêm Dialog sửa với 2 trường: **Phòng ban** (Select) và **Role** (Select)
- Khi lưu: gọi `supabase.from("profiles").update({ department_id, role })` trực tiếp (admin có quyền RLS)
- Reload danh sách sau khi lưu

### 2. Edge Function — không cần thay đổi
Việc cập nhật `department_id` và `role` trên bảng `profiles` có thể thực hiện trực tiếp qua client vì admin đã có quyền RLS.

## Tổng: sửa 1 file UI duy nhất

