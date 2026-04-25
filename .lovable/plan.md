## 🎯 Mục tiêu
Chạy 6 fix gọn trong 1 lần — không cần làm lại.

---

## 1. SUPER_ADMIN — DB constraint + permissions function

**Hiện trạng:** `profiles_role_check` chỉ liệt kê 21 role, **thiếu `SUPER_ADMIN`** → nếu Admin set role này sẽ lỗi insert/update.

**Fix (migration SQL):**
- `ALTER TABLE profiles DROP CONSTRAINT profiles_role_check`
- Tạo lại constraint thêm `'SUPER_ADMIN'` vào danh sách
- `get_default_permissions_for_role`: case `'ADMIN'` đã gộp `SUPER_ADMIN` (`WHEN 'ADMIN', 'SUPER_ADMIN' THEN`) — đã OK, không cần đổi

---

## 2. Trigger trùng trên customers + leads

**Hiện trạng:** Mỗi bảng có 2 audit trigger chạy song song (gây log đôi):
- `customers`: `trg_audit_customers` + `trg_customers_audit`
- `leads`: `trg_audit_leads` + `trg_leads_audit`

**Fix (migration SQL):**
```sql
DROP TRIGGER IF EXISTS trg_customers_audit ON customers;
DROP TRIGGER IF EXISTS trg_leads_audit ON leads;
```
Giữ lại `trg_audit_customers` và `trg_audit_leads`.

---

## 3. .gitignore — thêm .env

**Hiện trạng:** `.gitignore` không chứa `.env` → nguy cơ commit secrets.

**Fix:** thêm block ở cuối `.gitignore`:
```
# Env / secrets
.env
.env.local
.env.*.local
```

---

## 4. INTERN_SALE_MICE — bổ sung b2b_tours.view

**Hiện trạng:** Trong `usePermissions.ts`, 3 INTERN_SALE (DOMESTIC/OUTBOUND/INBOUND) đã có `b2b_tours.view`, riêng `INTERN_SALE_MICE` thiếu.

**Fix:** Thêm `b2b_tours.view` vào DEFAULT_PERMISSIONS của `INTERN_SALE_MICE` trong `src/hooks/usePermissions.ts`.

> Note: function DB `get_default_permissions_for_role` đã gộp 4 INTERN_SALE chung 1 case nên đã có sẵn. Chỉ sync client.

---

## 5. InternalNotes — tích hợp vào Finance (Estimates + Settlements)

**Hiện trạng đã kiểm tra:**
- ✅ `LeadDetailDialog` đã có (line 286)
- ✅ `ContractDetailDialog` đã có (line 287)
- ✅ `CustomerDetail` đã có

**Còn lại — Finance:** cả 2 tab dùng pattern Detail Dialog với `selectedEstimate` / `selectedSettlement`.

**Fix:**
- `BudgetEstimatesTab.tsx`: thêm section `<InternalNotes entityType="finance" entityId={selectedEstimate.id} entityName={selectedEstimate.code} />` ở cuối Detail Dialog (trước DialogFooter)
- `BudgetSettlementsTab.tsx`: tương tự trong Detail Dialog của settlement

> Dùng `entityType="finance"` (đã có trong type EntityType). Route mapping → `/tai-chinh`.

---

## 6. useAutoMarkNotificationsRead — gắn vào LeadDetailDialog

**Hiện trạng:**
- ✅ `CustomerDetail` đã có (line 67)
- ❌ `LeadDetailDialog` chưa có

**Fix:** Trong `LeadDetailDialog.tsx`, thêm:
```ts
import { useAutoMarkNotificationsRead } from "@/hooks/useAutoMarkNotificationsRead";
// trong component:
useAutoMarkNotificationsRead("lead", open ? lead?.id : null);
```
(Truyền `null` khi dialog đóng để không trigger update sai.)

---

## 📋 Files thay đổi
| File | Loại |
|---|---|
| Migration SQL | constraint + drop 2 trigger |
| `.gitignore` | append |
| `src/hooks/usePermissions.ts` | thêm 1 dòng |
| `src/components/finance/BudgetEstimatesTab.tsx` | thêm InternalNotes |
| `src/components/finance/BudgetSettlementsTab.tsx` | thêm InternalNotes |
| `src/components/leads/LeadDetailDialog.tsx` | thêm hook auto-mark-read |

## ✅ Verify sau khi chạy
- `SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname='profiles_role_check'` → có `SUPER_ADMIN`
- `SELECT tgname FROM pg_trigger WHERE tgrelid='customers'::regclass` → không còn `trg_customers_audit`
- `grep -n "^\.env" .gitignore` → có dòng `.env`
- `tsc --noEmit` → 0 errors

Anh duyệt thì em chạy hết trong 1 lần.