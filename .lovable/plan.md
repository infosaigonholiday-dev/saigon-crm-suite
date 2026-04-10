
## Kế hoạch: Tinh gọn Kanban + Thêm nút Xóa cho ADMIN

### 1. Gộp cột Kanban từ 11 → 5

**File: `src/pages/Leads.tsx`**

Thay mảng `columns` (11 cột) bằng 5 cột gộp:

```text
kanbanColumns = [
  { id: "NEW_GROUP",   label: "Mới",              statuses: ["NEW","NO_ANSWER","CONTACTED"],     color: "bg-secondary" },
  { id: "INTEREST",    label: "Quan tâm",          statuses: ["INTERESTED","PROFILE_SENT"],       color: "bg-green-50" },
  { id: "QUOTING",     label: "Đang báo giá",      statuses: ["QUOTE_SENT","NEGOTIATING"],        color: "bg-blue-100" },
  { id: "WON",         label: "Thành công",         statuses: ["WON"],                             color: "bg-green-100" },
  { id: "LOST_GROUP",  label: "Không thành công",   statuses: ["LOST","DORMANT","NURTURE"],        color: "bg-destructive/10" },
]
```

- Filter leads theo `statuses.includes(lead.status)` thay vì `=== col.id`
- Khi drop vào cột gộp, chuyển sang trạng thái đầu tiên của nhóm (NEW, INTERESTED, QUOTE_SENT, WON, LOST) — riêng LOST/NURTURE/DORMANT vẫn mở dialog hỏi lý do
- Giữ nguyên mảng `columns` cũ (11 status) cho dropdown đổi trạng thái chi tiết trong menu 3 chấm

**Badge trạng thái chi tiết trên card:**
- Thêm 1 `<Badge>` nhỏ hiện label trạng thái gốc (ví dụ "KBM", "Đã liên hệ") khi status khác status mặc định của nhóm
- Tạo map `statusLabelMap` từ mảng `columns` cũ để tra cứu label

### 2. Thêm nút Xóa cho ADMIN

**File: `src/pages/Leads.tsx` — Menu 3 chấm trên Kanban card:**
- Import `Trash2` từ lucide-react
- Thêm `useMutation` `deleteLead` gọi `supabase.from("leads").delete().eq("id", id)`
- Thêm `DropdownMenuItem` "Xóa" với `className="text-destructive"` ở cuối menu, chỉ hiện khi `userRole === "ADMIN" || userRole === "SUPER_ADMIN"`
- Confirm bằng `window.confirm` trước khi xóa

**File: `src/components/leads/LeadTableView.tsx` — Bảng danh sách:**
- Thêm prop `userRole` hoặc dùng `useAuth` trực tiếp
- Thêm cột "Thao tác" cuối bảng, chứa nút Xóa (icon Trash2) chỉ hiện cho ADMIN

**File: `src/pages/Customers.tsx` — Bảng khách hàng:**
- Import `Trash2`, `useMutation`
- Thêm `deleteMutation` gọi `supabase.from("customers").delete().eq("id", id)`
- Thêm cột "Thao tác" cuối bảng với nút Xóa, chỉ hiện khi `isAdmin`

**File: `src/pages/RawContacts.tsx` — Bảng Kho Data:**
- Tương tự: thêm nút Xóa trong `renderTable`, chỉ hiện cho ADMIN
- `deleteMutation` gọi `supabase.from("raw_contacts").delete().eq("id", id)`

### 3. Chi tiết kỹ thuật

- Kiểm tra admin: `const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN"` (dùng `useAuth()`)
- Confirm xóa: `if (!window.confirm("Xác nhận xóa?")) return`
- Sau xóa: `queryClient.invalidateQueries(...)` + `toast.success("Đã xóa")`
- Kanban drop logic: khi drop vào cột "Không thành công" → mở `LostReasonDialog` với status "LOST" mặc định

### File thay đổi

| File | Thay đổi |
|------|----------|
| `src/pages/Leads.tsx` | Gộp Kanban 5 cột, badge chi tiết, nút Xóa ADMIN |
| `src/components/leads/LeadTableView.tsx` | Nút Xóa ADMIN trong bảng |
| `src/pages/Customers.tsx` | Nút Xóa ADMIN |
| `src/pages/RawContacts.tsx` | Nút Xóa ADMIN |
