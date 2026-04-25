## 🔐 Phần 1 — Migration DB

### 1.1. Trigger `notify_leave_request_change`
- Loại requester khỏi recipients (không tự nhận noti đơn của mình)
- Phân loại cấp quản lý qua `profiles.role` HOẶC `employees.position`:
  - Cấp quản lý: `ADMIN/SUPER_ADMIN/HR_MANAGER/HCNS/MANAGER/GDKD/DIEUHAN` hoặc position `GIAM_DOC/PHO_GIAM_DOC/TRUONG_PHONG/PHO_PHONG`
- **Cấp quản lý xin nghỉ → chỉ ADMIN + HR_MANAGER nhận noti**
- **ADMIN xin nghỉ → fallback HR_MANAGER nếu không có ADMIN khác active** (đếm `profiles WHERE role IN ('ADMIN','SUPER_ADMIN') AND is_active AND id != requester`)
- Nhân viên thường → HR_MANAGER + HCNS + Manager/GDKD cùng phòng

### 1.2. RLS policies `leave_requests`
- DROP & recreate `leave_requests_update_approval`:
  - ADMIN/SUPER_ADMIN bypass (duyệt được tất cả, kể cả của mình)
  - HR_MANAGER duyệt mọi đơn TRỪ đơn của chính mình
  - MANAGER/GDKD chỉ duyệt nhân viên thường cùng phòng (loại trừ position TRUONG_PHONG/PHO_PHONG/GIAM_DOC/PHO_GIAM_DOC + role MANAGER/GDKD/HR_MANAGER/ADMIN/HCNS/DIEUHAN)
- CREATE `leave_requests_self_edit_pending`: user UPDATE/DELETE đơn của mình khi `status = 'PENDING'`
- CREATE/đảm bảo `leave_requests_insert_self`: WITH CHECK `employee_id = get_my_employee_id()` HOẶC user là HR/ADMIN
- CREATE/đảm bảo `leave_requests_read_hr_all`: ADMIN/SUPER_ADMIN/HR_MANAGER/HCNS xem được toàn bộ (cho chấm công)

### 1.3. Cập nhật `get_default_permissions_for_role`
Thêm `leave.create` cho các role còn thiếu:
- `KETOAN`, `MKT`, `SALE_DOMESTIC`, `SALE_INBOUND`, `SALE_OUTBOUND`, `SALE_MICE`
- `INTERN_SALE_*`, `INTERN_KETOAN`, `INTERN_MKT`, `INTERN_DIEUHAN`, `INTERN_HCNS`
- `TOUR`, `DIEUHAN`, `GDKD`, `MANAGER`
- Đồng bộ `DEFAULT_PERMISSIONS` trong `usePermissions.ts`

---

## 🎨 Phần 2 — Đổi tên & màu LKH Tour 2026

### `src/components/AppSidebar.tsx`
- Đổi `title: "Kho Tour B2B"` → `title: "LKH Tour 2026"` (giữ route `/b2b-tours`, moduleKey `b2b_tours`)
- Khi item `moduleKey === "b2b_tours"`: override active class sang `bg-blue-600 text-white hover:bg-blue-700`

### `src/pages/B2BTours.tsx`
- Đổi tiêu đề trang → "LKH Tour 2026"
- Nút primary + badge giá: `bg-blue-600 hover:bg-blue-700`
- Icon header + active indicator: `text-blue-600`

> Giữ nguyên: route, permission keys, tên bảng DB

---

## 🖥️ Phần 3 — `src/pages/LeaveManagement.tsx` overhaul

### 3.1. Nút tạo đơn + Dialog
- Header thêm nút **"Tạo đơn nghỉ phép"** (hiển thị nếu user có `leave.create` và có `employee_id`)
- Dialog form: chọn `leave_type`, `start_date`, `end_date`, `reason` → auto-tính `total_days`
- INSERT với `employee_id = get_my_employee_id()` (lấy từ `useQuery employees WHERE profile_id = user.id`)

### 3.2. 3 Cards thống kê (lấy từ `leave_policies`)
- Query `leave_policies` để lấy `days_per_year` theo từng `leave_type`
- Card 1: **Phép năm còn lại** (ANNUAL) — `policy.days_per_year - usedAnnual`
- Card 2: **Đã sử dụng** (tổng các loại APPROVED năm hiện tại, breakdown by type)
- Card 3: **Đơn chờ duyệt** (PENDING của user)
- KHÔNG hardcode 12 ngày — đọc từ `leave_policies`

### 3.3. Bảng đơn
- Cột mới **"Cấp"**: badge `Quản lý` (orange) / `Nhân viên` (blue) dựa trên position/role của employee đơn
- Cột Action:
  - Đơn của chính mình + không phải ADMIN → badge "Chờ cấp trên duyệt" + nút Hủy (nếu PENDING)
  - Manager/GDKD xem đơn cấp ngang/trên → button disabled + tooltip "Cần ADMIN duyệt"
  - Còn lại: Duyệt/Từ chối bình thường
- Banner cảnh báo trên cùng nếu user là Manager đang có đơn pending của cấp ngang/trên

### 3.4. Tab visibility
- `showTeamTab = isAdmin || isHrStaff || scope IN ('all','department')`
- HR_MANAGER + HCNS luôn thấy toàn bộ đơn (chấm công)

---

## 📚 Phần 4 — `src/pages/UserGuide.tsx`

Mở rộng `LeaveNotificationGuide()`:
- Matrix duyệt: Nhân viên → Manager+HR | Trưởng/Phó phòng → ADMIN+HR Trưởng | HR Trưởng → ADMIN | ADMIN → ADMIN khác (fallback HR Trưởng)
- Quy tắc thông báo theo cấp
- Hướng dẫn xem số ngày phép còn lại (lấy từ leave_policies)
- Quy tắc tự hủy đơn PENDING

---

## 📂 Files thay đổi

| File | Loại |
|---|---|
| Migration mới | DB (trigger + 4 RLS policies + permissions function) |
| `src/hooks/usePermissions.ts` | Edit (DEFAULT_PERMISSIONS sync leave.create) |
| `src/components/AppSidebar.tsx` | Edit (rename + blue active) |
| `src/pages/B2BTours.tsx` | Edit (title + blue accents) |
| `src/pages/LeaveManagement.tsx` | Edit lớn (nút tạo + cards từ policies + UI duyệt) |
| `src/pages/UserGuide.tsx` | Edit (docs đầy đủ) |
| `mem://features/notifications/automated-alerts` | Update memory |

**KHÔNG đụng**: routes, permission keys hiện có, theme cam toàn cục, module khác.
