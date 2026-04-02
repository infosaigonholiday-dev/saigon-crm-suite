

# Đổi màu #e15f00 + Thêm nút "Quy định công ty" + Upload file cho Quy trình

## 1. Đổi màu chủ đạo sang `#e15f00`

`#e15f00` → HSL: `23 100% 44%`

### File: `src/index.css`

| Biến | Hiện tại | Mới |
|------|----------|-----|
| `--primary` | `1 100% 69%` | `23 100% 44%` |
| `--ring` | `1 100% 69%` | `23 100% 44%` |
| `--accent` | `15 100% 60%` | `30 100% 55%` |
| `--secondary-foreground` | `1 100% 69%` | `23 100% 44%` |
| `--foreground` | `1 40% 20%` | `23 40% 20%` |
| `--card-foreground` | `1 40% 20%` | `23 40% 20%` |
| `--popover-foreground` | `1 40% 20%` | `23 40% 20%` |
| `--muted-foreground` | `1 20% 50%` | `23 20% 45%` |
| `--sidebar-background` | `1 80% 35%` | `23 80% 28%` |
| `--sidebar-primary` | `15 100% 65%` | `30 100% 60%` |
| `--sidebar-accent` | `1 70% 42%` | `23 70% 35%` |
| `--sidebar-border` | `1 60% 45%` | `23 60% 38%` |
| `--sidebar-ring` | `15 100% 65%` | `30 100% 60%` |
| `--sidebar-muted` | `1 50% 50%` | `23 50% 45%` |

## 2. Thêm nút "Quy định công ty" trên trang Quy trình

### File: `src/pages/SOPLibrary.tsx`

Thêm category mới `"regulation"` với label `"Quy định công ty"` vào mảng `CATEGORIES`.

Thêm nút "Quy định công ty" cạnh nút "Tạo quy trình" ở header. Khi bấm sẽ filter danh sách theo category `regulation`.

## 3. Thêm khả năng đính kèm file/link cho Quy trình

### DB Migration
Thêm 2 cột vào bảng `department_sops`:
- `file_url TEXT` — URL file đã upload hoặc link Drive/Google Sheet
- `file_name TEXT` — tên hiển thị

### File: `src/pages/SOPLibrary.tsx`

**Form tạo quy trình (`SOPFormDialog`):**
- Thêm field upload file (DOCX, PDF) lên Supabase Storage bucket `sop-files`
- Thêm field nhập link bên ngoài (Google Drive, Google Sheet)
- Lưu `file_url` và `file_name` vào DB

**Hiển thị (SOP Detail Dialog):**
- Nếu có `file_url`, hiển thị nút tải/xem file bên dưới nội dung

### Supabase Storage
Tạo bucket `sop-files` (public) qua migration hoặc dashboard.

## Files thay đổi
1. `src/index.css` — đổi palette sang `#e15f00`
2. `src/pages/SOPLibrary.tsx` — thêm nút "Quy định công ty", thêm upload file/link
3. DB migration — thêm cột `file_url`, `file_name` vào `department_sops`

