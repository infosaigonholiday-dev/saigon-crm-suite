

## Thêm tính năng Reset MK + Reset tất cả TK hiện tại

### Thay đổi

**1. Edge Function `supabase/functions/manage-employee-accounts/index.ts`**

Thêm 2 action mới:

- `reset_password`: nhận `user_id`, gọi `adminClient.auth.admin.updateUserById(user_id, { password: DEFAULT_PASSWORD })` → reset 1 tài khoản về `sgh123456`
- `reset_all_passwords`: lấy toàn bộ profiles (trừ caller), loop qua từng user gọi `updateUserById` reset về `sgh123456`, trả về số lượng đã reset

**2. UI `src/components/settings/SettingsAccountsTab.tsx`**

- Import thêm `KeyRound` từ lucide-react, import `AlertDialog` components
- Thêm nút icon `KeyRound` trên mỗi hàng (cạnh nút vô hiệu hóa) — reset từng người, có AlertDialog xác nhận
- Thêm nút "Reset tất cả MK" ở header (cạnh "Thêm tài khoản"), có AlertDialog xác nhận
- State mới: `resettingId`, `resettingAll`, `confirmResetId`, `confirmResetAll`
- Toast thông báo kết quả

**3. Sau khi deploy xong** — gọi edge function với action `reset_all_passwords` để reset MK tất cả TK nhân viên đã tạo về `sgh123456` ngay lập tức.

| File | Thay đổi |
|------|----------|
| `supabase/functions/manage-employee-accounts/index.ts` | Thêm action `reset_password` + `reset_all_passwords` |
| `src/components/settings/SettingsAccountsTab.tsx` | Nút reset từng TK + reset tất cả + AlertDialog confirm |

