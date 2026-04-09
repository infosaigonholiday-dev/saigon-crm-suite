

## Module "Kho Data" (raw_contacts)

### Tổng quan

Tạo module mới cho NV telesale nhập data thô hàng ngày. Data thô trải qua vòng đời: nhập → gọi → chuyển Lead (hoặc loại bỏ). Module tuân thủ cây phân quyền hiện có.

---

### 1. Migration — Tạo bảng + RLS + Cập nhật permissions

```sql
-- Bảng raw_contacts
CREATE TABLE raw_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text,
  phone text NOT NULL,
  email text,
  company_name text,
  contact_type text DEFAULT 'personal' CHECK (contact_type IN ('personal','b2b')),
  source text,
  note text,
  status text DEFAULT 'new' CHECK (status IN ('new','called_no_answer','called_not_interested','called_interested','converted_to_lead','duplicate','invalid')),
  call_count integer DEFAULT 0,
  last_called_at timestamptz,
  assigned_to uuid REFERENCES profiles(id),
  created_by uuid REFERENCES profiles(id) NOT NULL DEFAULT auth.uid(),
  department_id uuid REFERENCES departments(id),
  converted_lead_id uuid REFERENCES leads(id),
  created_at timestamptz DEFAULT now()
);

-- Unique phone index (exclude invalid/duplicate)
CREATE UNIQUE INDEX idx_raw_contacts_phone ON raw_contacts(phone) WHERE status NOT IN ('duplicate','invalid');

-- RLS
ALTER TABLE raw_contacts ENABLE ROW LEVEL SECURITY;
-- 4 policies: read (personal/dept/admin), insert (own), update (own+assigned+manager+admin), admin_full_access
```

Cập nhật DB function `get_default_permissions_for_role()`:
- Thêm `raw_contacts.view`, `raw_contacts.create`, `raw_contacts.edit` cho ADMIN, GDKD, MANAGER, SALE_*, INTERN_SALE_*
- Thêm `raw_contacts.delete` cho ADMIN

### 2. Frontend — Permission Matrix & Scope

| File | Thay đổi |
|------|----------|
| `src/hooks/usePermissions.ts` | Thêm `raw_contacts.*` vào `ALL_PERMISSION_KEYS`, `PERMISSION_GROUPS`, `DEFAULT_PERMISSIONS` cho các role tương ứng |
| `src/contexts/PermissionsContext.tsx` | Thêm scope rule `raw_contacts` — ADMIN/SUPER_ADMIN: all, GDKD/MANAGER: department, SALE_*/INTERN_SALE_*: personal |

### 3. Sidebar + Route

| File | Thay đổi |
|------|----------|
| `src/components/AppSidebar.tsx` | Thêm menu "Kho Data" (icon: Database) trước "Tiềm năng", moduleKey: `raw_contacts` |
| `src/App.tsx` | Thêm route `/kho-data` → `RawContacts` với PermissionGuard `raw_contacts.view` |

### 4. Trang RawContacts.tsx (tạo mới)

**Tab "Data của tôi"** (mặc định, tất cả role):
- Bảng: Tên, SĐT, Công ty, Trạng thái (badge màu), Số lần gọi, Lần gọi cuối, Ngày nhập
- Nút "Thêm data" → Dialog form nhanh (Tên + SĐT bắt buộc, Công ty, Loại, Nguồn, Ghi chú)
- Check trùng SĐT realtime khi nhập: query raw_contacts + leads + customers → hiện cảnh báo inline
- Scope filter: personal → `created_by = user.id OR assigned_to = user.id`

**Tab "Data phòng"** (GDKD/MANAGER/ADMIN):
- Cùng bảng, filter theo department_id
- ADMIN thấy dropdown chọn phòng ban

**Mỗi row — nút "Ghi nhận gọi"**:
- Mini dialog: dropdown kết quả (Không bắt máy / Không quan tâm / Quan tâm / Sai số) + ghi chú
- Lưu: call_count += 1, last_called_at = now(), status map theo kết quả

**Nút "Chuyển thành Lead"** (hiện khi status = `called_interested`):
- Tạo lead mới: copy full_name, phone, email, company_name, source, assigned_to, department_id
- Set lead_type = 'b2b' nếu contact_type = 'b2b'
- Update raw_contacts: status = 'converted_to_lead', converted_lead_id = lead.id
- Toast thành công

### 5. Dashboard cards

| File | Thay đổi |
|------|----------|
| `src/pages/PersonalDashboard.tsx` | Thêm 1 card "Data hôm nay": số data mới nhập, số cuộc gọi, số chuyển Lead — query raw_contacts + filter created_at/last_called_at = today |
| `src/pages/Dashboard.tsx` | Thêm section thống kê raw_contacts cho ADMIN/GDKD: tổng data, tỷ lệ gọi được, tỷ lệ chuyển Lead, top NV nhập data |

### 6. Thứ tự thực hiện

1. Migration (bảng + RLS + update DB function)
2. Permission matrix + scope rules (usePermissions.ts, PermissionsContext.tsx)
3. Sidebar + route (AppSidebar.tsx, App.tsx)
4. RawContacts.tsx (bảng + form + check trùng + ghi nhận gọi + chuyển Lead)
5. Dashboard cards (PersonalDashboard.tsx, Dashboard.tsx)

