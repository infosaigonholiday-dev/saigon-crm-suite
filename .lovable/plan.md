

## Fix: Sửa constraints + Thêm kiểm tra trùng Lead

### Phát hiện thêm lỗi constraint

Ngoài lỗi `channel`, form hiện tại còn **2 lỗi constraint khác** sẽ gây crash:

1. **`interest_type`** — DB chỉ cho phép: `MICE`, `DOMESTIC`, `OUTBOUND`
   - Form hiện tại dùng Input tự do (VD: "Tour Nhật Bản") → **sẽ lỗi**
   
2. **`status`** — DB dùng `QUOTE_SENT` và `NEGOTIATING`
   - Trang Leads (Kanban) dùng `QUOTED` → **không khớp**, card sẽ không hiện đúng cột

### Thêm kiểm tra trùng lặp

Hiện DB không có ràng buộc unique trên `phone`/`email`. Sẽ thêm kiểm tra phía frontend trước khi insert.

---

### Thay đổi

#### 1. File: `src/components/leads/LeadFormDialog.tsx`

- **Sửa trường "Quan tâm"**: Đổi từ `<Input>` sang `<Select>` với 3 giá trị hợp lệ:

| Giá trị DB | Label |
|------------|-------|
| `MICE` | MICE |
| `DOMESTIC` | Nội địa |
| `OUTBOUND` | Outbound |

- **Thêm kiểm tra trùng**: Trước khi insert, query xem đã tồn tại lead nào cùng `phone` hoặc `email` chưa. Nếu trùng → hiện cảnh báo xác nhận ("Lead với SĐT này đã tồn tại. Bạn vẫn muốn tạo?")

#### 2. File: `src/pages/Leads.tsx`

- Sửa cột Kanban cho khớp constraint `status`:
  - `QUOTED` → `QUOTE_SENT` (label giữ "Đã báo giá")  
  - Thêm cột `NEGOTIATING` (label "Đang đàm phán")

### File thay đổi

| File | Thay đổi |
|------|----------|
| `src/components/leads/LeadFormDialog.tsx` | Sửa `interest_type` thành Select, thêm duplicate check |
| `src/pages/Leads.tsx` | Sửa status columns khớp DB constraint |

