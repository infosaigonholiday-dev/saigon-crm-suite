

## Kế hoạch bổ sung: Đổi màu dropdown/badge theo trạng thái đặc biệt

Thêm vào kế hoạch đang chờ triển khai (3 vấn đề chính), bổ sung yêu cầu màu sắc động theo trạng thái.

---

### Tổng hợp toàn bộ kế hoạch (cũ + bổ sung)

#### 1. Thêm cột NV phụ trách + Phòng vào bảng 3 trang
*(Giữ nguyên như kế hoạch trước)*

#### 2. Đổi màu badge/dropdown theo trạng thái đặc biệt

**LeadDetailDialog.tsx — Dropdown trạng thái ở header:**
- Hiện tại dòng 143: `<Button variant="outline" size="sm" className="gap-1 h-6 text-xs">`
- Thêm logic: nếu `lead.status === "WON"` → className thêm `bg-blue-600 text-white border-blue-600 hover:bg-blue-700`
- Các trạng thái khác giữ `variant="outline"` như cũ

**RawContacts.tsx — Badge trạng thái trong bảng:**
- Dòng 356: đổi `bg-green-100 text-green-700 border-green-200` → `bg-blue-600 text-white border-blue-700` khi `isConverted`
- Dòng 364: link "Xem Lead" đổi `text-primary` → `text-blue-600`

**Leads.tsx — Badge "Đã chuyển KH" trên Kanban card:**
- Badge converted customer: đổi sang `bg-blue-600 text-white border-blue-700`

**LeadTableView.tsx — Badge trong bảng danh sách:**
- Badge "Đã chuyển KH": `bg-blue-600 text-white border-blue-700`

#### 3. Filter NV cho GDKD/Manager ở tab "Data phòng tôi"
*(Giữ nguyên như kế hoạch trước)*

---

### Chi tiết kỹ thuật cho phần bổ sung

**LeadDetailDialog.tsx dòng 142-145:**
```tsx
<Button 
  variant="outline" 
  size="sm" 
  className={cn(
    "gap-1 h-6 text-xs",
    lead.status === "WON" && "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
  )}
>
```
Cần import `cn` từ `@/lib/utils` (đã có sẵn trong project).

**RawContacts.tsx dòng 356:**
```tsx
className={isConverted ? "bg-blue-600 text-white border-blue-700" : ""}
```

### File thay đổi

| File | Thay đổi |
|------|----------|
| `src/pages/RawContacts.tsx` | Join profile+dept, thêm cột, badge xanh dương, filter NV |
| `src/components/leads/LeadDetailDialog.tsx` | Dropdown WON → bg-blue-600 |
| `src/components/leads/LeadTableView.tsx` | Thêm cột, badge xanh dương |
| `src/pages/Leads.tsx` | Join dept, badge xanh dương trên Kanban |
| `src/pages/Customers.tsx` | Reorder cột Sale+Phòng |

