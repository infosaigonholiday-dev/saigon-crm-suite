

## Kế hoạch: Giữ Kanban + Thêm Dropdown đổi trạng thái trên card và chi tiết Lead

Không bỏ kéo thả hiện tại. Thêm dropdown menu đổi trạng thái trên mỗi card Kanban và trong LeadDetailDialog.

---

### 1. Sửa `src/pages/Leads.tsx`

**Thêm trên mỗi Kanban card:**
- Nút `⋯` (MoreVertical) ở góc trên phải card
- Click → `DropdownMenu` hiển thị 11 trạng thái (trừ trạng thái hiện tại)
- Logic khi chọn:
  - LOST → mở `LostReasonDialog`
  - NURTURE / DORMANT → mở `LostReasonDialog` (đã hỗ trợ)
  - WON → update status, nếu chưa convert thì mở `ConvertToCustomerDialog`
  - Còn lại → update trực tiếp + toast
- `e.stopPropagation()` trên nút để không trigger click mở detail

**Giữ nguyên:**
- Toàn bộ code drag/drop hiện tại (draggable, onDragStart, onDrop, GripVertical)
- Logic `handleDrop` và `handleTransitionConfirm`

**Import thêm:** `DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger` từ shadcn/ui, icon `MoreVertical` từ lucide-react.

### 2. Sửa `src/components/leads/LeadDetailDialog.tsx`

- Thêm dropdown "Đổi trạng thái" cạnh badge status hiện tại ở header
- Cùng logic: chọn status mới → gọi mutation update hoặc mở popup LOST/NURTURE/DORMANT
- Sau update → invalidate query `["leads"]` + toast

### File thay đổi

| File | Thay đổi |
|------|----------|
| `src/pages/Leads.tsx` | Thêm DropdownMenu đổi trạng thái trên card, giữ nguyên drag/drop |
| `src/components/leads/LeadDetailDialog.tsx` | Thêm dropdown đổi trạng thái ở header |

Không cần cài thêm thư viện. Dùng `DropdownMenu` từ shadcn/ui đã có sẵn.

