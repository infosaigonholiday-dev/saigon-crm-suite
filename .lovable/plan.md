

## Bổ sung nhắc follow-up Lead trên Dashboard và Kanban

### Tổng quan
Thêm card "Lead cần follow-up" vào PersonalDashboard (Sale) và ManagerKPIDashboard (Manager), đồng thời cải thiện visual Kanban card với viền trái theo trạng thái follow-up/temperature.

### Kế hoạch

**1. Cập nhật `src/pages/PersonalDashboard.tsx`**

- Thêm useQuery lấy leads có `follow_up_date` trong 3 ngày tới hoặc quá hạn, filter `assigned_to = user.id`
- Render card mới "Lead cần follow-up" trong grid row thứ 3 (dưới chart + sự kiện), hoặc thay đổi layout thành 2x2 grid cho row cuối
- Chia 3 nhóm: Quá hạn (badge đỏ), Hôm nay (badge cam), Sắp tới (badge xanh nhạt)
- Mỗi item: tên lead + icon nhiệt độ (Circle đỏ/cam/xanh) + điểm đến + nút "Xem chi tiết" navigate `/tiem-nang`
- Import thêm: `Circle`, `Phone` từ lucide-react; `format`, `addDays`, `differenceInDays` từ date-fns

**2. Cập nhật `src/pages/Leads.tsx` Kanban**

- Trong Card component (line 149-220), thêm logic:
  - Tính `daysUntilFollowUp` từ `follow_up_date`
  - Nếu quá hạn hoặc hôm nay → thêm `border-l-[3px] border-l-red-500` + text "Quá hạn!" hoặc "Follow-up hôm nay!"
  - Nếu temperature = 'hot' (và không quá hạn follow-up) → `border-l-[3px] border-l-orange-400`
- Thay thế logic `isFollowUpOverdue` hiện tại (chỉ check `<= today`) bằng logic chi tiết hơn, phân biệt "hôm nay" vs "quá hạn"

**3. Cập nhật `src/pages/ManagerKPIDashboard.tsx`**

- Thêm useQuery tương tự nhưng query theo `department_id` thay vì `assigned_to`
- Join thêm profiles để lấy tên Sale phụ trách: query `leads` rồi lookup `profiles` bằng `assigned_to`
- Render card "Lead cần follow-up (team)" sau bảng xếp hạng Sale
- Mỗi item hiển thị thêm tên Sale phụ trách

### Files thay đổi
- `src/pages/PersonalDashboard.tsx` — thêm card follow-up leads
- `src/pages/Leads.tsx` — thêm viền trái + text chi tiết trên Kanban card
- `src/pages/ManagerKPIDashboard.tsx` — thêm card follow-up leads team scope

