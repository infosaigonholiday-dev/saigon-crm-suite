

## Kế hoạch: Fix lỗi vô hiệu hóa orphan profile + hỗ trợ xóa/tạo lại

### Nguyên nhân gốc

Profile "gia bao" (id `765a6b58...`, email `operator1.saigonholiday@gmail.com`) tồn tại trong bảng `profiles` nhưng **không có auth user tương ứng**. Đây là profile mồ côi (orphan).

- Khi bấm "Vô hiệu hóa", Edge Function gọi `auth.admin.updateUserById()` → fail vì user không tồn tại trong auth.
- Không có error handling cho trường hợp này.

### Giải pháp

#### 1. Sửa Edge Function `manage-employee-accounts` — action `deactivate`

Thêm kiểm tra auth user tồn tại trước khi ban. Nếu không tồn tại, chỉ update `profiles.is_active = false` và trả về thành công kèm cảnh báo:

```text
deactivate:
  1. Kiểm tra auth user bằng getUserById(user_id)
  2. Nếu có → ban + set is_active = false (giữ nguyên)
  3. Nếu không có → chỉ set is_active = false, trả về warning "Auth user không tồn tại, chỉ vô hiệu hóa profile"
```

#### 2. Sửa `DataHandoverDialog.tsx` — xử lý lỗi tốt hơn

Hiện tại nếu Edge Function trả lỗi, toast chỉ hiện message chung. Giữ nguyên, vì sau khi fix Edge Function sẽ không lỗi nữa.

#### 3. Xử lý tạm ngay bây giờ

Dùng action `cleanup_orphans` (đã có sẵn trong Edge Function) để xóa profile orphan, hoặc admin có thể:
- Gọi `cleanup_orphans` từ app
- Sau đó tạo lại tài khoản mới cho email `operator1.saigonholiday@gmail.com`

**Trả lời: Có, xóa profile orphan rồi tạo lại tài khoản trên cùng email hoàn toàn được.**

### File thay đổi

| File | Thay đổi |
|------|----------|
| `supabase/functions/manage-employee-accounts/index.ts` | Action `deactivate`: thêm kiểm tra auth user trước khi ban, fallback graceful |

