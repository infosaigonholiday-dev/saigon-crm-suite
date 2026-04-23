

## Bổ sung cột "Ngày tạo" cho 3 module: Kho Data, Tiềm năng, Khách hàng

### Hiện trạng
| Module | Cột ngày hiện có | Thiếu |
|---|---|---|
| Khách hàng (`Customers.tsx`) | ✅ "Ngày tạo" | — |
| Tiềm năng (`LeadTableView.tsx`) | "Ngày dự kiến đi", "Lần LH cuối" | ❌ Ngày tạo |
| Kho Data (`RawContacts.tsx`) | "TG dự kiến", "Gọi cuối" | ❌ Ngày tạo |

→ Module Khách hàng có rồi, nhưng 2 module Kho Data + Tiềm năng đang thiếu cột "Ngày tạo" — đây là field quan trọng để Sales/Manager biết data vào hệ thống lúc nào.

### Sẽ sửa

**1. `src/components/leads/LeadTableView.tsx`**
- Thêm field `created_at?: string | null` vào interface `LeadWithProfile`
- Thêm `<TableHead>Ngày tạo</TableHead>` (đặt sau "Phòng", trước "Công ty")
- Thêm `<TableCell>{lead.created_at ? format(new Date(lead.created_at), "dd/MM/yyyy") : "—"}</TableCell>`
- Cập nhật `colSpan` empty state: 9→10 (no admin), 10→11 (admin)

Kiểm tra `src/pages/Leads.tsx` đảm bảo query đã `select` cột `created_at` (nếu chưa thì thêm).

**2. `src/pages/RawContacts.tsx`** (hàm `renderTable`)
- Thêm `<TableHead>Ngày tạo</TableHead>` đặt sau "Phòng", trước "SĐT"
- Thêm `<TableCell>{format(new Date(c.created_at), "dd/MM/yyyy")}</TableCell>`
- Cập nhật `colSpan` empty state: 10→11 (no staff col), 11→12 (with staff col)

Field `created_at` đã có sẵn trong type `RawContact` và đã được select bằng `*` → không cần đổi query.

**3. `src/pages/Customers.tsx`** — không thay đổi (đã có "Ngày tạo")

### Format
Thống nhất `dd/MM/yyyy` (giống Customers) cho mọi cột "Ngày tạo" để đồng bộ UI.

### Test
1. Vào Kho Data → bảng hiển thị cột "Ngày tạo" với format `dd/MM/yyyy` cho mỗi row
2. Vào Tiềm năng → chuyển sang chế độ Table View → thấy cột "Ngày tạo"
3. Vào Khách hàng → cột "Ngày tạo" vẫn hoạt động bình thường (không đổi)

