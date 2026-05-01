# Thêm nút Đổi Mật Khẩu trong Cài đặt

## Mục tiêu
Cho user đăng nhập đổi mật khẩu trực tiếp trong Cài đặt mà không cần qua flow email reset.

## File mới: `src/components/settings/SettingsSecurityTab.tsx`
Component tab "Bảo mật":
- Card "Bảo mật tài khoản" + nút **Đổi mật khẩu** (icon `KeyRound`).
- Dialog (shadcn) gồm 2 input: Mật khẩu mới, Xác nhận mật khẩu.
- Validate FE: ≥ 8 ký tự, có ≥ 1 chữ hoa, có ≥ 1 số, hai mật khẩu khớp.
- Submit → `supabase.auth.updateUser({ password })`. Thành công → `toast.success` + đóng dialog + reset state. KHÔNG logout.
- Sau khi đổi thành công, best-effort update `profiles.must_change_password = false` (try/catch không chặn flow).
- Nút submit `disabled` khi `loading`. Có spinner.
- 100% tiếng Việt. Không log password/token.

## Sửa `src/pages/Settings.tsx`
- Import `SettingsSecurityTab`.
- Thêm vào danh sách tabs: `{ value: "security", label: "Bảo mật" }` — **luôn hiện cho mọi user** (đặt sau "notifications").
- Thêm `<TabsContent value="security">` render `<SettingsSecurityTab />`.

## KHÔNG đổi
- DB schema (chỉ dùng cột `must_change_password` đã có).
- `ResetPassword.tsx`, `FirstLoginChangePassword.tsx`.
- Role/permission/RLS.
- Không lưu password vào localStorage/log.

## Test
- TC1 nút hiện trong Cài đặt (tab Bảo mật).
- TC2 password < 8 → toast lỗi.
- TC3 thiếu chữ hoa/số → toast lỗi.
- TC4 confirm không khớp → toast lỗi.
- TC5 đổi thành công → toast thành công, dialog đóng.
- TC6 logout + login bằng pass mới → OK.
