## 🎨 Phần 1 — Đổi tên & màu LKH Tour 2026

**`src/components/AppSidebar.tsx`**
- Đổi label `"Kho Tour B2B"` → `"LKH Tour 2026"` (giữ nguyên route `/b2b-tours`, moduleKey `b2b_tours`)
- Khi item `moduleKey === "b2b_tours"` active: override class sang `bg-blue-600 text-white hover:bg-blue-700`

**`src/pages/B2BTours.tsx`**
- Đổi tiêu đề trang → "LKH Tour 2026"
- Các nút chính + badge giá: `bg-blue-600 hover:bg-blue-700`
- Icon header + active indicators: `text-blue-600`

> Giữ nguyên: route, permission keys, tên bảng DB → không phá phân quyền.

---

## 🔐 Phần 2 — Fix luồng duyệt nghỉ phép (Phương án 2)

### Migration SQL

**2.1. Cập nhật trigger `notify_leave_request_change`:**
- Loại người tạo đơn khỏi recipients
- Nhận diện cấp quản lý qua role (`ADMIN/SUPER_ADMIN/HR_MANAGER/HCNS/MANAGER/GDKD/DIEUHAN`) HOẶC position (`GIAM_DOC/PHO_GIAM_DOC/TRUONG_PHONG/PHO_PHONG`)
- Cấp quản lý xin nghỉ → chỉ ADMIN+SUPER_ADMIN+HR_MANAGER nhận noti
- Nhân viên thường → HR/HCNS + Manager/GDKD cùng phòng nhận

**2.2. RLS policy `leave_requests_update_approval`:**
- Không tự duyệt đơn của mình
- ADMIN/HR_MANAGER duyệt được tất cả
- Manager/GDKD chỉ duyệt nhân viên thường cùng phòng (loại trừ Manager+/HR/Admin/Trưởng-Phó phòng)

---

## 🖥️ Phần 3 — UI `LeaveManagement.tsx`

- Ẩn nút Duyệt/Từ chối cho đơn của chính mình → badge "Chờ cấp trên duyệt"
- Thêm cột "Cấp": badge `Quản lý` (đỏ cam) vs `Nhân viên` (xanh)
- Banner "⚠️ Đơn này cần ADMIN duyệt" khi Manager/GDKD xem đơn cấp ngang/trên + disable buttons

---

## 📚 Phần 4 — `UserGuide.tsx`

Mở rộng `LeaveNotificationGuide()` document quy tắc PA2:
- Nhân viên → Manager + HR duyệt
- Trưởng/Phó phòng → CHỈ ADMIN + HR Trưởng
- HR Trưởng/HCNS → CHỈ ADMIN
- Không ai tự duyệt

---

## 📂 Files thay đổi

| File | Loại |
|---|---|
| Migration mới | DB (trigger + RLS) |
| `src/components/AppSidebar.tsx` | Edit |
| `src/pages/B2BTours.tsx` | Edit |
| `src/pages/LeaveManagement.tsx` | Edit |
| `src/pages/UserGuide.tsx` | Edit |
| `mem://features/notifications/automated-alerts` | Update memory |

**KHÔNG đụng**: routes, permission keys, các module khác, theme cam toàn cục.