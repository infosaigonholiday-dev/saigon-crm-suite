

# Ke hoach fix tong the — Ban chinh thuc

## Van de 1: Loi RLS khi them khach hang va lead

**Fix**:
- **Migration SQL**: Them default `auth.uid()` cho `customers.created_by` va `leads.assigned_to`
- **`CustomerFormDialog.tsx`**: Import `useAuth`, them `created_by: user?.id` vao insert
- **`LeadFormDialog.tsx`**: Import `useAuth`, them `assigned_to: user?.id` vao insert

---

## Van de 2: Form khach hang — UI/UX

### 2a. Doi thu tu tab: Doanh nghiep TRUOC, Ca nhan SAU

Hien tai form co 2 tab:
- Tab 1 (default): "Thong tin ca nhan" — chua ho ten, SDT, email, ngay sinh, gioi tinh, CCCD, dia chi, nguon den, sale phu trach, phan khuc, ghi chu
- Tab 2: "Thong tin doanh nghiep" — chua ten cong ty, MST, dia chi cong ty, nguoi lien he, chuc vu, ngay sinh nguoi lien he, email cong ty, ngay thanh lap, quy mo, tour quan tam, tinh trang, ket qua, van de gap phai

**Yeu cau**: Doi nguyen bo noi dung tab "Thong tin doanh nghiep" len lam tab mac dinh hien thi truoc, tab "Thong tin ca nhan" xuong sau. Cu the:

- `defaultValue` doi tu `"personal"` sang `"company"`
- Thu tu `TabsTrigger`: "Thong tin doanh nghiep" truoc, "Thong tin ca nhan" sau
- Thu tu `TabsContent`: block `company` dat truoc block `personal` trong code

Toan bo noi dung (fields) cua moi tab **giu nguyen**, chi doi vi tri hien thi.

### 2b. Date picker cho phep go tay (dd/MM/yyyy)
- 3 truong ngay: ngay sinh, ngay sinh nguoi lien he, ngay thanh lap
- Them Input text cho phep go truc tiep `dd/MM/yyyy`, kem icon lich mo Calendar popover

---

## Van de 3: Kho quy trinh — quyen tao quy dinh cong ty

- `SOPLibrary.tsx` dong 91: doi `canCreate` sang `hasPermission('workflow', 'create')`

---

## Tong hop files thay doi

| # | File | Thay doi |
|---|------|----------|
| 1 | Migration SQL | Default `auth.uid()` cho `customers.created_by`, `leads.assigned_to` |
| 2 | `CustomerFormDialog.tsx` | Them `created_by`; **doi thu tu tab** (doanh nghiep truoc, ca nhan sau — doi `defaultValue`, doi thu tu `TabsTrigger` va `TabsContent`); input go ngay |
| 3 | `LeadFormDialog.tsx` | Them `assigned_to: user?.id` |
| 4 | `SOPLibrary.tsx` | Doi `canCreate` sang `hasPermission('workflow', 'create')` |

