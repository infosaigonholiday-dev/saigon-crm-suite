

## HR Module - Final Build v3: Kế hoạch thực hiện

### Xung đột phát hiện và sửa

1. **`employee_salaries` dùng `base_salary`** — plan ghi `basic_salary` là SAI. Phải dùng `base_salary`.
2. **`employee_salaries` không có `created_by`** — plan ghi `created_by: auth.uid()` là SAI. Bỏ field này.
3. **Edge function `profiles.insert` sẽ conflict với `handle_new_user` trigger** — trigger tự INSERT profiles khi createUser. Edge function phải UPDATE profiles (set role, department_id) thay vì INSERT.
4. **`employees` chưa có `deleted_at` trong types.ts** — sau migration, cần cast hoặc dùng `.update({ deleted_at: new Date().toISOString() } as any)` cho đến khi types regenerate.

---

### Bước 1: SQL Migration

```sql
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_employment_type_check;
ALTER TABLE employees ADD CONSTRAINT employees_employment_type_check
  CHECK (employment_type IN ('FULLTIME','PARTTIME','PROBATION','INTERN','CONTRACT','SEASONAL'));

ALTER TABLE employees ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_employees_deleted_at ON employees(deleted_at) WHERE deleted_at IS NULL;
```

### Bước 2: Edge Function `manage-employee-accounts/index.ts`

Viết lại toàn bộ:
- `getClaims()` → `userClient.auth.getUser()` để lấy caller ID
- Role check mở rộng: `['ADMIN','HCNS','HR_MANAGER','DIRECTOR','SUPER_ADMIN']`
- Action `create` flow:
  1. Validate: `email`, `full_name`, `role` required
  2. Generate 12-char password (upper+lower+number+special)
  3. `admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name, role } })`
     → `handle_new_user` trigger tự INSERT profiles với role từ metadata
  4. Nếu có `department_id`: UPDATE profiles SET department_id WHERE id = newUser.id
  5. Nếu có `employee_id`: UPDATE employees SET profile_id = newUser.id WHERE id = employee_id
  6. Return `{ success: true, temp_password, user_id }`
  7. Cleanup nếu fail: `admin.deleteUser(newUser.id)`
- Giữ nguyên actions `activate` / `deactivate`

### Bước 3: `EmployeeRoleTab.tsx`

Thêm props: `employeeEmail`, `employeeName`, `departmentId`, `onProfileLinked`

Khi `profileId = null`:
- Form: email input (pre-fill), role dropdown (giữ roleOptions hiện tại), nút "Tạo tài khoản"
- Gọi edge function `manage-employee-accounts` action=create với `employee_id`, `email`, `full_name`, `role`, `department_id`
- Thành công: hiện password readonly + nút copy + countdown 60s rồi ẩn
- Gọi `onProfileLinked()`

Mở rộng `isAdmin`: cho phép `HCNS`, `DIRECTOR`, `SUPER_ADMIN` thay đổi role

### Bước 4: `EmployeeDetail.tsx`

- Truyền props mới cho EmployeeRoleTab
- Extract `InfoItem` ra ngoài component
- Thêm nút "Xóa nhân viên" + AlertDialog xác nhận → soft delete (`deleted_at = now()`) → navigate `/nhan-su`

### Bước 5: `EmployeeFormDialog.tsx`

- Thêm `SEASONAL` vào employmentTypes
- Bỏ required `employee_code` → gửi `null` để trigger DB tự sinh
- Validation: full_name (>=2), phone (`/^0\d{9}$/`), id_card (`/^\d{12}$/`), date_of_birth (>=18), hire_date (<=30 ngày tương lai)
- Khi tạo mới có lương: INSERT employees → INSERT employee_salaries (`base_salary`, không có `created_by`)

### Bước 6: `Employees.tsx`

- Thêm `SEASONAL` vào employmentTypes
- Search debounce 300ms (useRef + setTimeout)
- Query thêm `.is('deleted_at', null)` + server-side pagination `.select('*', { count: 'exact' }).range()`

### Bước 7: `AuthContext.tsx`

- Xử lý `SIGNED_OUT` event trong `onAuthStateChange` → toast + window.location redirect `/login`

---

### Files thay đổi

| File | Thay đổi |
|------|----------|
| SQL migration | SEASONAL constraint + deleted_at column + index |
| `supabase/functions/manage-employee-accounts/index.ts` | Fix auth, role check, employee linking, cleanup |
| `src/components/employees/EmployeeRoleTab.tsx` | Form tạo tài khoản + password countdown |
| `src/pages/EmployeeDetail.tsx` | Props, soft delete + AlertDialog, extract InfoItem |
| `src/components/employees/EmployeeFormDialog.tsx` | Validation, SEASONAL, auto employee_code, salary insert |
| `src/pages/Employees.tsx` | Debounce, SEASONAL, deleted_at filter, server pagination |
| `src/contexts/AuthContext.tsx` | Session expiry handling |

