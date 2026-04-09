

## Fix: Lỗi "leads_channel_check" khi tạo Lead

### Nguyên nhân
Bảng `leads` có CHECK constraint chỉ cho phép `channel` là một trong: `ZALO`, `FB`, `GOOGLE`, `REFERRAL`, `WALKIN`, `AGENCY`.

Form hiện tại gửi sai giá trị (`Facebook`, `Zalo`, `Website`, `Other`) và cho phép bỏ trống (null) — đều vi phạm constraint.

### Thay đổi

#### File: `src/components/leads/LeadFormDialog.tsx`
- Sửa các `<SelectItem>` trong dropdown "Kênh" cho khớp constraint:
  - `Facebook` → `FB`
  - `Zalo` → `ZALO`
  - `Website` → `GOOGLE`
  - `Referral` → `REFERRAL`
  - `Other` → bỏ (hoặc thêm constraint mới nếu cần)
  - Thêm `WALKIN` và `AGENCY`
- Đặt giá trị mặc định `channel` trong `initial` state (VD: `"ZALO"`) hoặc thêm validation bắt buộc chọn kênh trước khi submit

| Giá trị DB | Label hiển thị |
|-------------|---------------|
| `ZALO` | Zalo |
| `FB` | Facebook |
| `GOOGLE` | Google |
| `REFERRAL` | Giới thiệu |
| `WALKIN` | Walk-in |
| `AGENCY` | Đại lý |

### Không cần migration — chỉ sửa frontend cho khớp DB constraint.

