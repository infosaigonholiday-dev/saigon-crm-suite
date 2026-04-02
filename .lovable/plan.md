

# Sửa 2 điểm: bỏ leave.create cho GDKD/MANAGER + MANAGER payroll scope → department

## Thay đổi

### 1. `src/hooks/usePermissions.ts`

**GDKD (line 100):**
- Hiện tại: `"leave.view", "leave.create", "leave.approve"`
- Sửa thành: `"leave.view", "leave.approve"`

**MANAGER (line 117):**
- Hiện tại: `"leave.view", "leave.create", "leave.approve"`
- Sửa thành: `"leave.view", "leave.approve"`

**SCOPE_RULES — MANAGER (line 331):**
- Hiện tại: `payroll: "personal"`
- Sửa thành: `payroll: "department"`

### 2. DB Migration — đồng bộ `get_default_permissions_for_role()`

Cập nhật function cho 2 roles:
- GDKD: bỏ `'leave.create'` khỏi mảng
- MANAGER: bỏ `'leave.create'` khỏi mảng

## Files thay đổi
1. `src/hooks/usePermissions.ts` — 3 dòng sửa
2. DB migration — sync function

