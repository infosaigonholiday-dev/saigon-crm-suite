

## Kế hoạch bổ sung 2 phần còn thiếu (Prompt 3/6)

### 1. Thêm Table View cho danh sách Leads

Thêm nút toggle (Kanban / Bảng) vào trang Leads. Khi chọn "Bảng":
- Hiển thị bảng với các cột: Tên, Công ty, SĐT, Trạng thái (badge màu), Nhiệt độ (badge HOT=đỏ, WARM=vàng, COLD=xanh), Ngày dự kiến đi, Lần LH cuối, NV phụ trách (join profiles.full_name).
- Hỗ trợ phân trang (đã có logic sẵn).
- Click vào row → mở LeadDetailDialog (đã có).

**File thay đổi**: `src/pages/Leads.tsx`
- Thêm state `viewMode` (kanban | table)
- Thêm toggle buttons
- Thêm component bảng dùng `Table` UI component
- Query cần thêm join `profiles` để lấy tên NV phụ trách

### 2. Thêm Form Edit Lead

Mở rộng `LeadFormDialog` để hỗ trợ mode edit (nhận prop `editLead`), hoặc tạo component riêng.

- Khi mở dialog detail → thêm nút "Sửa" (chỉ hiện cho assigned_to = current user hoặc Admin).
- Nhấn "Sửa" → mở `LeadFormDialog` với data auto-fill.
- Submit → update bảng leads thay vì insert.

**File thay đổi**:
- `src/components/leads/LeadFormDialog.tsx` — thêm prop `editData`, đổi logic insert/update
- `src/components/leads/LeadDetailDialog.tsx` — thêm nút "Sửa" với permission check
- `src/pages/Leads.tsx` — truyền editLead state

### Không cần migration SQL — tất cả bảng và cột đã đầy đủ.

