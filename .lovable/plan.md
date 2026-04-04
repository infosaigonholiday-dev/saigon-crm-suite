

# Ke hoach fix cap nhat

## Tinh trang
- Trang Tai chinh, Quy dinh, Khach hang: DA HOAT DONG — bo khoi ke hoach
- Con lai 4 van de can xu ly

---

## Van de 1: Dong bo du lieu giua module Nhan su va Cai dat

**Van de:** Khi HR them/sua nhan vien trong EmployeeFormDialog, chi cap nhat bang `employees`. Khi Admin sua trong SettingsAccountsTab, chi cap nhat bang `profiles`. Hai nguon du lieu bi lech.

**Fix:**
- `EmployeeFormDialog.tsx`: Khi luu nhan vien co `profile_id`, tu dong cap nhat `profiles.department_id` theo
- `SettingsAccountsTab.tsx`: Khi Admin doi department, tu dong cap nhat `employees.department_id` (tim qua profile_id)
- `EmployeeRoleTab.tsx`: Sau khi tao tai khoan, dong bo `employees.department_id`

## Van de 2: Validate email trung

**Van de:** `operator1.saigonholiday@gmail.com` gan cho 2 nhan vien (SHT-004 va SHT-002)

**Fix:**
- `EmployeeFormDialog.tsx`: Truoc khi luu, query kiem tra email da ton tai o nhan vien khac chua. Hien loi neu trung.

## Van de 3: HR_MANAGER thieu quyen xem Goi tour va Hop dong

**Fix:**
- `usePermissions.ts`: Them `"tour_packages.view"` va `"contracts.view"` vao DEFAULT_PERMISSIONS.HR_MANAGER
- Migration SQL: Cap nhat DB function `get_default_permissions_for_role` tuong ung

## Van de 4: Don dep phong ban trung

Hien tai co 13 phong ban, nhieu cai trung nhau. Can giu lai 8 phong ban chuan + doi 1 phong thanh OP Outbound.

**Du lieu hien tai va huong xu ly:**

```text
GIU NGUYEN:
- Ban Giam Đoc (BOD)              — 0 NV
- Phong Kinh Doanh MICE (MICE)    — 2 NV
- Phong Kinh Doanh Noi Dia (DOMESTIC) — 0 NV
- Phong Kinh Doanh Outbound (OUTBOUND) — 0 NV
- Phong Ke toan (KETOAN)          — 1 NV
- Phong Marketing (MKT)           — 0 NV
- Phong Nhan su - HCNS (HCNS)     — 1 NV

DOI TEN:
- "Phong Dieu Hanh" (OPS, 1 NV) → giu nguyen, day la Dieu hanh chinh
- "Phong Dieu hanh Tour" (DIEUHAN, 0 NV) → DOI THANH "OP Outbound" (code: OP_OUTBOUND)

XOA (0 NV, trung voi phong chinh thuc):
- "Ban Giam doc" (BGD, 0 NV) — trung voi "Ban Giam Đoc"
- "Kinh doanh MICE" (KD_MICE, 0 NV) — trung voi "Phong KD MICE"
- "Kinh doanh Noi dia" (KD_NOIDIA, 0 NV) — trung voi "Phong KD Noi Dia"
- "Kinh doanh Outbound" (KD_OUTBOUND, 0 NV) — trung voi "Phong KD Outbound"
```

**Ket qua sau don dep: 9 phong ban**

```text
Ban Giam Đoc
Phong Dieu Hanh
OP Outbound          ← doi tu "Phong Dieu hanh Tour"
Phong Ke toan
Phong Kinh Doanh MICE
Phong Kinh Doanh Noi Dia
Phong Kinh Doanh Outbound
Phong Marketing
Phong Nhan su - HCNS
```

---

## Files se sua

| # | File | Thay doi |
|---|------|----------|
| 1 | `EmployeeFormDialog.tsx` | Dong bo profiles.department_id khi save; validate email trung |
| 2 | `SettingsAccountsTab.tsx` | Dong bo employees.department_id khi Admin doi phong ban |
| 3 | `EmployeeRoleTab.tsx` | Dong bo employees sau khi tao tai khoan |
| 4 | `usePermissions.ts` | Them tour_packages.view, contracts.view cho HR_MANAGER |
| 5 | Migration SQL | Xoa 4 phong ban trung; doi ten "Phong Dieu hanh Tour" thanh "OP Outbound"; cap nhat DB permission function |

