

# Kế hoạch sửa phân quyền toàn diện

## Phát hiện vấn đề

### A. Thiếu 2 role INTERN trong hệ thống
Hiện tại DB constraint `profiles_role_check` và code chỉ có:
- INTERN_SALE_DOMESTIC, INTERN_SALE_OUTBOUND, INTERN_DIEUHAN, INTERN_MKT, INTERN_HCNS, INTERN_KETOAN

**Thiếu**: `INTERN_SALE_MICE` và `INTERN_SALE_INBOUND` → nhân viên KD MICE/Inbound cấp TTS không có role phù hợp.

### B. Dữ liệu sai
| Tài khoản | Hiện tại | Cần sửa |
|-----------|----------|---------|
| nguyen tuan phuong (level=INTERN, Phòng KD MICE) | SALE_MICE | **INTERN_SALE_MICE** (role mới) |
| gia bao - operator1@... (không liên kết NV) | HCNS | **MANAGER** + liên kết employee |

---

## Thực hiện

### Bước 1: DB Migration — Thêm 2 role INTERN mới
- Drop + recreate constraint `profiles_role_check` thêm `INTERN_SALE_MICE`, `INTERN_SALE_INBOUND`
- Cập nhật DB function `get_default_permissions_for_role` cho 2 role mới (quyền: customers.view, leads.view, bookings.view, leave.view/create, sop.view)

### Bước 2: DB Data Update — Sửa role 2 tài khoản
- `nguyen tuan phuong`: SALE_MICE → INTERN_SALE_MICE
- `gia bao`: HCNS → MANAGER
- Tạo employee record cho "gia bao" nếu chưa có, liên kết profile_id, gán phòng KD phù hợp

### Bước 3: Code — Cập nhật 3 file
1. **`src/hooks/usePermissions.ts`**: Thêm `INTERN_SALE_MICE` và `INTERN_SALE_INBOUND` vào `DEFAULT_PERMISSIONS`
2. **`src/components/employees/EmployeeRoleTab.tsx`**: Thêm 2 role mới vào `roleOptions` + auto-suggest role theo phòng ban khi tạo tài khoản (bao gồm cả intern)
3. **`src/components/settings/SettingsRolesTab.tsx`**: Thêm 2 role mới vào bảng tham chiếu

### Quyền mặc định cho role mới

```text
INTERN_SALE_MICE:    customers.view, leads.view, bookings.view, leave.view, leave.create, sop.view
INTERN_SALE_INBOUND: customers.view, leads.view, bookings.view, leave.view, leave.create, sop.view
```
(Giống INTERN_SALE_DOMESTIC — chỉ xem, không tạo/sửa)

---

## Tổng thay đổi: 5
1. DB migration: thêm 2 role vào constraint + DB function
2. DB data: sửa role nguyen tuan phuong
3. DB data: sửa role gia bao + tạo/liên kết employee
4. `usePermissions.ts`: thêm 2 role
5. `EmployeeRoleTab.tsx` + `SettingsRolesTab.tsx`: thêm role + auto-suggest

