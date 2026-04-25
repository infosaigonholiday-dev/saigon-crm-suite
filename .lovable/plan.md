## 🎯 Mục tiêu

Sửa triệt để vấn đề: **kế toán/MKT/Sale Intern không thấy nút "Tạo đơn nghỉ phép"** vì hồ sơ `profiles` chưa link với `employees`. Hiện trạng:

| User | Role | Có employee? | profile_id link? |
|---|---|---|---|
| Admin (`nguyentuanphuong1990`) | ADMIN | ❌ KHÔNG | — |
| Mai Xuân Khánh (`marketing.saigonholiday`) | MANAGER | ✅ CÓ | ❌ NULL |
| Gia Bảo (`operator1.saigonholiday`) | INTERN_SALE_DOMESTIC | ✅ CÓ | ❌ NULL |

→ 2 user đã có hồ sơ nhưng không link → UI ẩn cards + disable nút.
→ ADMIN chưa có hồ sơ → cần tạo hoặc cho phép tạo đơn không cần employee_id (KHÔNG khả thi vì FK).

---

## 🔧 Phần 1 — Migration: Auto-link profile ↔ employee

**SQL UPDATE** (chạy 1 lần, idempotent):
```sql
UPDATE employees e
SET profile_id = p.id
FROM profiles p
WHERE e.profile_id IS NULL
  AND e.deleted_at IS NULL
  AND p.is_active = true
  AND lower(trim(p.email)) = lower(trim(e.email));
```
→ Khớp 2 record: MKT Manager + Sale Intern.

**Tạo employee cho ADMIN** (Admin cần xin nghỉ thì mới có hồ sơ):
```sql
INSERT INTO employees (profile_id, full_name, email, position, status, hire_date)
SELECT p.id, p.full_name, p.email, 'GIAM_DOC', 'ACTIVE', CURRENT_DATE
FROM profiles p
WHERE p.role IN ('ADMIN','SUPER_ADMIN')
  AND p.is_active = true
  AND NOT EXISTS (SELECT 1 FROM employees e WHERE e.profile_id = p.id AND e.deleted_at IS NULL);
```

**Trigger tự động link khi tạo employee mới** (đảm bảo tương lai):
```sql
CREATE OR REPLACE FUNCTION public.auto_link_employee_to_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.profile_id IS NULL AND NEW.email IS NOT NULL THEN
    SELECT id INTO NEW.profile_id FROM profiles
    WHERE lower(trim(email)) = lower(trim(NEW.email)) AND is_active = true LIMIT 1;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER auto_link_employee_to_profile_trg
  BEFORE INSERT OR UPDATE OF email ON employees
  FOR EACH ROW EXECUTE FUNCTION auto_link_employee_to_profile();
```

---

## 🎨 Phần 2 — UI fallback (`src/pages/LeaveManagement.tsx`)

Hiện tại nút "Tạo đơn" và 3 cards thống kê **bị ẩn** khi `myEmpId === null`. Sửa:

### 2.1. Luôn hiển thị nút "Tạo đơn nghỉ phép" nếu có `leave.create`
- Bỏ điều kiện `disabled={!myEmpId}` cứng
- Thay vì disable hoàn toàn → cho click, dialog hiện cảnh báo rõ ràng "Chưa có hồ sơ nhân viên — liên hệ HR" + nút "Liên hệ HR"
- Nếu vẫn muốn disable: hiện tooltip rõ ràng "Tài khoản chưa liên kết hồ sơ nhân viên. Liên hệ HCNS."

### 2.2. Hiển thị banner cảnh báo (giữ nguyên đã có)
- Đã có ở line 314-322 ✅. Thêm CTA "Mở Cài đặt > Nhân sự" link sang `/staff` để HR tạo nhanh.

### 2.3. Cards thống kê — show skeleton khi không có employee
- Bỏ điều kiện `{myEmpId && (...)}` ở line 324
- Thay bằng: nếu không có employee → hiện cards với placeholder "—" + dòng "Chưa có hồ sơ"
- Nếu có policies nhưng chưa có employee → vẫn hiện limit từ `leave_policies.ANNUAL.days_per_year` để user biết quota

### 2.4. Tab visibility cho KETOAN
Trong `PermissionsContext.tsx`, KETOAN có `default: "all"` → thấy tab "Đơn của team". Sửa:
```typescript
KETOAN: { default: "all", leave: "personal", ... },
MKT: { default: "personal", leave: "personal" },
TOUR: { default: "personal", leave: "personal" },
SALE_*: { default: "personal", leave: "personal" }, // đã đúng
INTERN_*: { default: "personal", leave: "personal" }, // đã đúng
```
→ KETOAN/MKT/TOUR/Sale chỉ thấy đơn của mình. Quản lý/HR/Admin mới thấy team.

---

## 📊 Phần 3 — Verify flow đầy đủ

Sau khi chạy Phần 1+2, test matrix:

| Role | Tạo đơn? | Thấy cards? | Thấy tab Team? | Duyệt được? |
|---|---|---|---|---|
| ADMIN | ✅ (sau khi tạo employee) | ✅ | ✅ | ✅ tất cả |
| HR_MANAGER | ✅ | ✅ | ✅ | ✅ trừ đơn của mình |
| HCNS | ✅ | ✅ | ✅ (read-only) | ❌ |
| GDKD/MANAGER | ✅ | ✅ | ✅ (cùng phòng) | ✅ NV cùng phòng |
| DIEUHAN | ✅ | ✅ | ✅ (cùng phòng) | ✅ NV cùng phòng |
| KETOAN | ✅ | ✅ | ❌ chỉ của mình | ❌ |
| MKT | ✅ | ✅ | ❌ | ❌ |
| SALE_* / INTERN_* | ✅ | ✅ | ❌ | ❌ |
| TOUR | ✅ | ✅ | ❌ | ❌ |

---

## 📂 Files thay đổi

| File | Loại | Nội dung |
|---|---|---|
| Migration mới | DB | UPDATE auto-link + INSERT employee cho ADMIN + trigger `auto_link_employee_to_profile` |
| `src/pages/LeaveManagement.tsx` | Edit | Bỏ điều kiện ẩn cards/nút, hiện banner + cards với placeholder, link CTA |
| `src/contexts/PermissionsContext.tsx` | Edit | Set `leave: "personal"` cho KETOAN, MKT, TOUR |

**KHÔNG đụng**: trigger notify, RLS policies, permissions function (Phần 1 trước đã xong).

---

## ⚠️ Lưu ý

- ADMIN sẽ được tạo employee với position `GIAM_DOC` — nếu user muốn position khác thì sửa thủ công sau.
- Email matching dùng `lower(trim())` để xử lý case-insensitive + whitespace.
- Trigger BEFORE INSERT/UPDATE đảm bảo mọi employee mới đều tự link nếu profile email khớp.

OK duyệt thì chạy hết.