

## Fix: Tự động gán email cho nhân viên khi tạo tài khoản

### Vấn đề
Khi tạo nhân viên và điền `login_email`, hệ thống tạo tài khoản nhưng KHÔNG cập nhật `employees.email` — dù email đã có sẵn ngay trong request. Nhân viên hiển thị thiếu email một cách vô lý.

### Thay đổi

**1. Edge Function `supabase/functions/manage-employee-accounts/index.ts`**

Trong action `create`, khi link `profile_id` vào employee, đồng thời cập nhật `email` nếu employee chưa có:

```typescript
// Thay vì chỉ update profile_id
await adminClient.from("employees")
  .update({ profile_id: createdUserId, email: email })
  .eq("id", employee_id)
  .is("email", null);
```

Nếu employee đã có email thì giữ nguyên, chỉ cập nhật khi null.

**2. Form `src/components/employees/EmployeeFormDialog.tsx`**

Khi submit tạo mới: nếu user điền `login_email` mà để trống `email` cá nhân → tự động dùng `login_email` làm `email` trong payload insert employee.

**3. Fix dữ liệu hiện tại** — Chạy SQL update employees email từ profiles đã liên kết:

```sql
UPDATE employees e
SET email = p.email
FROM profiles p
WHERE e.profile_id = p.id
  AND e.email IS NULL
  AND p.email IS NOT NULL;
```

| File | Thay đổi |
|------|----------|
| `supabase/functions/manage-employee-accounts/index.ts` | Cập nhật `employees.email` khi tạo TK |
| `src/components/employees/EmployeeFormDialog.tsx` | Auto-fill email từ login_email khi trống |
| SQL data fix | Update email cho nhân viên hiện tại từ profiles |

