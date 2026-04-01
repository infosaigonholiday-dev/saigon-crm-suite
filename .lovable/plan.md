

## Fix tự động Orphaned Profile

### Phân tích nguyên nhân

Luồng `create` hiện tại có thể tạo orphaned profile trong trường hợp:
1. Auth user tạo thành công → trigger `handle_new_user` tự động tạo profile
2. Bước tiếp theo (update department/link employee) thất bại → catch block xóa auth user (`deleteUser`)
3. **Profile vẫn còn** vì trigger đã insert rồi, không ai xóa → orphan

Ngoài ra, `reset_password` và `reset_all_passwords` crash khi gặp profile không có auth user.

### Kế hoạch sửa

**1. Edge Function `manage-employee-accounts/index.ts`**

- **Action `create` — cleanup**: Khi catch lỗi và xóa auth user, đồng thời xóa profile orphan:
  ```
  if (createdUserId) {
    await adminClient.from("profiles").delete().eq("id", createdUserId);
    await adminClient.auth.admin.deleteUser(createdUserId);
  }
  ```

- **Action `reset_password` — skip orphan**: Khi "User not found" và fallback email cũng không tìm thấy → trả message rõ ràng thay vì lỗi chung, gợi ý tạo lại tài khoản.

- **Action `reset_all_passwords` — skip orphan**: Khi gặp profile không có auth user → ghi vào `skipped[]` thay vì `errors[]`, tiếp tục batch. Response trả về danh sách skipped profiles.

- **Action mới `cleanup_orphans`**: Quét tất cả profiles, check từng profile có tồn tại trong auth.users không → xóa orphan profiles + trả về danh sách đã cleanup.

**2. UI `SettingsAccountsTab.tsx`**

- Khi `reset_password` trả về lỗi chứa "không tồn tại" → hiện toast kèm nút "Tạo lại tài khoản" hoặc "Xóa profile".
- Khi `reset_all_passwords` trả về `skipped` > 0 → hiện warning với danh sách orphan profiles.
- Thêm nút "Dọn dẹp tài khoản lỗi" gọi action `cleanup_orphans` (chỉ hiện khi có orphan detected).

### Files thay đổi
- `supabase/functions/manage-employee-accounts/index.ts` — sửa cleanup + thêm action
- `src/components/settings/SettingsAccountsTab.tsx` — UI xử lý orphan

