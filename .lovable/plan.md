

# Đổi email Admin + Đổi giao diện sang màu cam

## 1. Cập nhật email cho tài khoản Admin

Sử dụng Edge Function `manage-employee-accounts` (hoặc Supabase Admin API) để đổi email của tài khoản `admin@saigonholiday.com` thành `nguyentuanphuong1990@gmail.com` trong `auth.users`. Đồng thời cập nhật email trong bảng `profiles`.

**Cách thực hiện:** Gọi SQL migration với `supabase.auth.admin.updateUserById()` qua Edge Function, hoặc cập nhật trực tiếp qua Supabase Dashboard (Authentication → Users → chỉnh email).

→ Sau khi đổi, khi bấm "Quên mật khẩu" với email `nguyentuanphuong1990@gmail.com`, hệ thống sẽ gửi link reset về Gmail đó.

## 2. Đổi giao diện từ xanh sang cam `#ff6661`

`#ff6661` → HSL: `1 100% 69%`

### File: `src/index.css`

Thay đổi các biến CSS chính:

| Biến | Cũ (xanh) | Mới (cam/đỏ) |
|------|-----------|---------------|
| `--primary` | `213 52% 24%` | `1 100% 69%` |
| `--primary-foreground` | `0 0% 100%` | giữ nguyên |
| `--ring` | `213 52% 24%` | `1 100% 69%` |
| `--accent` | `199 80% 46%` | `15 100% 60%` (cam nhạt hơn) |
| `--sidebar-background` | `213 52% 24%` | `1 80% 35%` (cam đậm) |
| `--sidebar-primary` | `199 80% 46%` | `15 100% 65%` |
| `--sidebar-accent` | `213 50% 30%` | `1 70% 42%` |
| `--sidebar-border` | `213 45% 32%` | `1 60% 45%` |
| `--sidebar-ring` | `199 80% 46%` | `15 100% 65%` |
| `--sidebar-muted` | `213 40% 38%` | `1 50% 50%` |
| `--foreground` | `213 50% 20%` | `1 40% 20%` |
| `--secondary` | `210 30% 94%` | `15 40% 94%` |
| `--secondary-foreground` | `213 52% 24%` | `1 100% 69%` |
| `--border` | `214 20% 88%` | `15 20% 88%` |
| `--input` | `214 20% 88%` | `15 20% 88%` |

### File: `src/pages/Login.tsx`
- Logo "SH" sẽ tự động đổi màu theo `--primary`

## Files thay đổi
1. Edge Function hoặc DB migration — đổi email admin
2. `src/index.css` — đổi toàn bộ color palette sang tông cam `#ff6661`

