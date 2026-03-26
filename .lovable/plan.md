

## Sửa lỗi bảo mật hệ thống

### Tổng quan

Có 3 nhóm lỗi bảo mật cần xử lý, sắp xếp theo mức độ nghiêm trọng:

### 1. CRITICAL — Leo thang quyền qua profiles_self policy

**Vấn đề**: Policy `profiles_self` cho phép ALL commands (bao gồm UPDATE) trên row của chính user → user có thể tự đổi `role` thành `ADMIN`.

**Giải pháp**: Xóa policy cũ, tạo 2 policy mới:
- `profiles_self_read`: cho phép SELECT trên row của mình
- `profiles_self_update`: cho phép UPDATE trên row của mình nhưng **chặn thay đổi cột `role`** bằng `WITH CHECK` kiểm tra `role` không đổi

```sql
DROP POLICY IF EXISTS "profiles_self" ON profiles;

CREATE POLICY "profiles_self_read" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "profiles_self_update" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM profiles WHERE id = auth.uid()));
```

### 2. HIGH — Nhiều bảng chưa bật RLS

**Các bảng cần bật RLS và thêm policy** (chỉ cho phép ADMIN/role phù hợp truy cập):

| Bảng | Ai được truy cập |
|------|-----------------|
| departments | Tất cả authenticated (read), ADMIN (write) |
| accounts_payable | ADMIN, KETOAN, DIRECTOR |
| accounts_receivable | ADMIN, KETOAN, DIRECTOR |
| invoices | ADMIN, KETOAN, DIRECTOR + creator |
| payments | ADMIN, KETOAN, DIRECTOR + creator |
| budget_plans | ADMIN, KETOAN, DIRECTOR |
| cashflow_monthly | ADMIN, KETOAN, DIRECTOR |
| profit_loss_monthly | ADMIN, KETOAN, DIRECTOR |
| revenue_records | ADMIN, KETOAN, DIRECTOR |
| cost_records | ADMIN, KETOAN, DIRECTOR |
| tax_records | ADMIN, KETOAN, DIRECTOR |
| commission_rules | ADMIN, HCNS, DIRECTOR |
| commission_records | ADMIN, HCNS, DIRECTOR + own |
| employee_salaries | ADMIN, HCNS, DIRECTOR |
| insurance_records | ADMIN, HCNS, DIRECTOR |
| salary_structures | ADMIN, HCNS, DIRECTOR |
| leave_policies | Tất cả authenticated (read), ADMIN/HCNS (write) |
| leave_requests | ADMIN, HCNS + own |
| overtime_records | ADMIN, HCNS + own |
| office_expenses | ADMIN, KETOAN, DIRECTOR |
| business_travel | ADMIN, HCNS + own |
| benefits_policies | Tất cả authenticated (read), ADMIN/HCNS (write) |
| career_paths | Tất cả authenticated (read), ADMIN/HCNS (write) |
| quotes | ADMIN, DIRECTOR + creator |
| contracts | ADMIN, DIRECTOR + creator |
| leads sources | Tất cả authenticated (read), ADMIN (write) |
| customer_tags | Theo customer RLS |
| customer_segment_rules | ADMIN, DIRECTOR |
| data_assignments | ADMIN, DIEUHAN, DIRECTOR |
| documents | ADMIN + uploader |
| app_settings | ADMIN (all), others (read) |
| user_preferences | Own row only |
| audit_logs | Giữ nguyên (đã có) |

### 3. INFO — Bảng bật RLS nhưng chưa có policy

Sẽ được xử lý cùng bước 2.

### Thực hiện

Tạo **1 migration** duy nhất chứa tất cả các lệnh:
1. Drop + tạo lại `profiles_self` policies
2. `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` cho tất cả bảng chưa bật
3. `CREATE POLICY` cho từng bảng theo bảng phân quyền trên

Sử dụng helper function `has_role` (security definer) để tránh recursive RLS trên profiles:

```sql
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM profiles WHERE id = _user_id AND role = _role) $$;
```

Và một hàm `has_any_role` cho nhiều role:

```sql
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM profiles WHERE id = _user_id AND role = ANY(_roles)) $$;
```

Tổng cộng: **1 migration file** với khoảng 25+ bảng được bảo vệ.

