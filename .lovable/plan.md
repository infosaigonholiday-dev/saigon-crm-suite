

# KẾ HOẠCH TỔNG HỢP (ĐÃ BỔ SUNG DIỄN GIẢI)

---

## DIỄN GIẢI: ROLE LẤY TỪ ĐÂU?

Hiện tại hệ thống có **4 trường riêng biệt** trong hồ sơ nhân viên, KHÔNG tự động liên kết với nhau:

```text
┌──────────────────────────────────────────────────────────┐
│  employees table (Hồ sơ nhân viên)                       │
│  ├─ position    = "Chức vụ" (text tự do, VD: "NV KD")   │
│  ├─ level       = "Cấp bậc" (C-LEVEL/DIRECTOR/MANAGER/  │
│  │                 STAFF/INTERN)                          │
│  ├─ department_id = "Phòng ban" (KD Nội địa, HCNS...)   │
│  └─ (không quyết định quyền hệ thống)                   │
│                                                          │
│  profiles table (Tài khoản đăng nhập)                    │
│  └─ role        = "Quyền hệ thống" ← CHỈ TRƯỜNG NÀY    │
│                    quyết định phân quyền (SALE_DOMESTIC,  │
│                    HCNS, ADMIN, INTERN_KETOAN...)         │
└──────────────────────────────────────────────────────────┘
```

**Vấn đề**: Phòng ban = "KD Nội địa" nhưng `profiles.role` = "HCNS" → nhân viên có quyền HCNS, không phải Sale. Ba trường `position`, `level`, `department_id` chỉ là thông tin HR, **không ảnh hưởng phân quyền**.

**Role được gán ở 2 nơi**:
1. Khi tạo tài khoản: Tab "Phân quyền nhân sự" trong chi tiết nhân viên → chọn "Quyền hệ thống" → set `profiles.role`
2. Cài đặt → Tài khoản → tạo tài khoản mới → chọn role

---

## Thay đổi 1: DB Migration — thêm 6 roles TTS + bổ sung thiếu

Cập nhật `profiles_role_check` constraint thêm: `INTERN_DIEUHAN`, `INTERN_SALE_DOMESTIC`, `INTERN_SALE_OUTBOUND`, `INTERN_MKT`, `INTERN_HCNS`, `INTERN_KETOAN`, `SUPER_ADMIN`, `HR_MANAGER`, `HR_HEAD`, `SALE_MICE`.

Cập nhật function `get_default_permissions_for_role()` thêm 6 WHEN clauses cho TTS (quyền view-only theo phòng ban).

## Thay đổi 2: `src/hooks/usePermissions.ts`

Thêm 6 entries DEFAULT_PERMISSIONS cho TTS roles:
- INTERN_DIEUHAN: bookings.view, leave.view/create, sop.view
- INTERN_SALE_DOMESTIC/OUTBOUND: customers.view, leads.view, bookings.view, leave.view/create, sop.view
- INTERN_MKT: customers.view, leads.view, leave.view/create, sop.view
- INTERN_HCNS: employees.view, leave.view/create, sop.view
- INTERN_KETOAN: customers.view, bookings.view, payments.view, leave.view/create, sop.view

## Thay đổi 3: `src/components/settings/SettingsAccountsTab.tsx`

- Mở rộng ROLES từ 8 → 22 roles đầy đủ với label tiếng Việt
- Thêm dropdown **đổi role** cho tài khoản đã tạo (update `profiles.role`)

## Thay đổi 4: `src/components/employees/EmployeeRoleTab.tsx`

Bổ sung roleOptions thêm: SUPER_ADMIN, HR_MANAGER, HR_HEAD, SALE_MICE, và 6 TTS roles.

## Thay đổi 5: `src/components/settings/SettingsRolesTab.tsx`

- Thêm 6 TTS roles vào bảng tham chiếu
- Thêm **ghi chú diễn giải** rõ ràng: "Quyền hệ thống được xác định từ trường `profiles.role` (cột 'Quyền hệ thống' trong tab Phân quyền nhân sự của hồ sơ nhân viên). Các trường Chức vụ, Cấp bậc, Phòng ban chỉ là thông tin tổ chức, KHÔNG ảnh hưởng phân quyền."

## Thay đổi 6: MANAGER truy cập tab Phân quyền (scoped theo phòng ban)

- `src/pages/Settings.tsx`: Cho MANAGER thấy tab "Phân quyền"
- `src/components/settings/SettingsPermissionsTab.tsx`: Filter nhân viên chỉ hiện cùng `department_id` với MANAGER. ADMIN/DIRECTOR thấy tất cả.

---

## Tổng: 7 files thay đổi

1. DB migration (constraint + function)
2. `src/hooks/usePermissions.ts`
3. `src/components/settings/SettingsAccountsTab.tsx`
4. `src/components/employees/EmployeeRoleTab.tsx`
5. `src/components/settings/SettingsRolesTab.tsx`
6. `src/pages/Settings.tsx`
7. `src/components/settings/SettingsPermissionsTab.tsx`

