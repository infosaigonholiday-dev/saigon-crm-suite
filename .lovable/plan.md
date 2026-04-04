

# Fix toàn bộ hệ thống trước khi publish

## Vấn đề phát hiện

### 1. Department code KHÔNG KHỚP giữa DB và mapping (CRITICAL)
Mã phòng ban thực tế trong DB hoàn toàn khác với mã trong `positionRoleMapping.ts`:

```text
DB thực tế          → Mapping hiện tại (SAI)
─────────────────────────────────────────────
BOD                 → BGD
DOMESTIC            → KD_NOIDIA
OUTBOUND            → KD_OUTBOUND
MICE                → KD_MICE
OPS                 → DIEUHAN
(không có KD_INBOUND trong DB)
OP_OUTBOUND         → không có mapping
HCNS, KETOAN, MKT   → đúng
```

**Hậu quả**: Tính năng auto-suggest role KHÔNG BAO GIỜ hoạt động (trừ HCNS/KETOAN/MKT), mismatch warning cũng không hiện đúng.

### 2. Position data không nhất quán (MEDIUM)
- Dữ liệu cũ lưu tiếng Việt: `"Trưởng phòng"`
- Code mới (EmployeeFormDialog Select) lưu enum: `"TRUONG_PHONG"`
- EmployeeDetail hiển thị raw value → nếu lưu enum sẽ hiện `TRUONG_PHONG` thay vì `Trưởng phòng`

### 3. Department sync lệch (LOW)
Nhân viên `nguyen tuan phuong`: employee.department_id = MICE nhưng profile.department_id = HCNS

### 4. Console warning AlertDialog ref (LOW)
Warning React ref trên SettingsAccountsTab — không ảnh hưởng chức năng nhưng gây noise

## Kế hoạch sửa

### Step 1: Fix `positionRoleMapping.ts` — cập nhật department codes đúng DB
Thay toàn bộ key trong `deptRoleMap` cho khớp DB thực tế:
- `BGD` → `BOD`
- `KD_NOIDIA` → `DOMESTIC`
- `KD_OUTBOUND` → `OUTBOUND`
- `KD_MICE` → `MICE`
- `KD_INBOUND` → giữ cho trường hợp thêm phòng ban sau
- `DIEUHAN` → `OPS`
- Thêm `OP_OUTBOUND` mapping

### Step 2: Fix EmployeeDetail hiển thị position label
Import `positionOptions` và map `employee.position` từ enum value sang label tiếng Việt. Fallback hiển thị raw value nếu không match (cho dữ liệu cũ).

### Step 3: Fix SettingsAccountsTab console warning
`AlertDialog` component đang nhận ref không đúng. Kiểm tra và wrap bằng `forwardRef` hoặc sửa cách sử dụng.

### Step 4: Fix department sync cho profile lệch
Thêm logic trong `EmployeeFormDialog` khi edit: nếu thay đổi department_id, đồng bộ cả profile.department_id.

### Files cần sửa

| # | File | Thay đổi |
|---|------|----------|
| 1 | `src/lib/positionRoleMapping.ts` | Cập nhật department codes khớp DB thực tế |
| 2 | `src/pages/EmployeeDetail.tsx` | Hiển thị position label thay vì raw enum |
| 3 | `src/components/settings/SettingsAccountsTab.tsx` | Fix AlertDialog ref warning |

### Kết quả mong đợi
- Auto-suggest role hoạt động chính xác khi chọn phòng ban + vị trí
- Mismatch warning hiển thị đúng
- EmployeeDetail hiện tên chức vụ tiếng Việt
- Không còn console warning
- Hệ thống sẵn sàng publish

