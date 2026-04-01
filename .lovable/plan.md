

## Cho phép HCNS nhập chi phí vào transactions với luồng duyệt Kế toán

### Tổng quan
HCNS/HR_MANAGER/HR_HEAD được nhập chi phí vào bảng `transactions`, nhưng chỉ thấy record mình tạo và phải chờ Kế toán/Admin duyệt. Kế toán/Admin vẫn có full access.

### 1. Migration SQL

**Thêm cột mới** vào `transactions`:
- `submitted_by uuid REFERENCES profiles(id)` — người nhập
- `reviewed_by uuid REFERENCES profiles(id)` — người duyệt
- `reviewed_at timestamptz` — thời điểm duyệt
- `review_note text` — ghi chú duyệt/từ chối

Cột `approval_status` đã tồn tại — không cần thêm.

**Cập nhật RLS policies** trên `transactions`:
- **SELECT**: Giữ ADMIN/KETOAN/DIRECTOR full access. Thêm HCNS/HR_MANAGER/HR_HEAD chỉ xem `submitted_by = auth.uid()`
- **INSERT**: Thêm HCNS/HR_MANAGER/HR_HEAD được INSERT khi `submitted_by = auth.uid()` AND `approval_status IN ('DRAFT','PENDING_REVIEW')`
- **UPDATE**: HCNS chỉ update record mình tạo khi `approval_status IN ('DRAFT','REJECTED')`. KETOAN/ADMIN update tất cả
- **DELETE**: Giữ nguyên chỉ ADMIN/SUPER_ADMIN

**Cập nhật `get_default_permissions_for_role`**: Thêm `finance.submit` cho HCNS, HR_MANAGER, HR_HEAD.

### 2. `src/hooks/usePermissions.ts`

- Thêm `"finance.submit"` vào `ALL_PERMISSION_KEYS` và `PERMISSION_GROUPS.finance`
- Thêm `"finance.submit"` vào default permissions của HCNS, HR_MANAGER, HR_HEAD
- Type `PermissionKey` tự cập nhật theo `ALL_PERMISSION_KEYS`

### 3. `src/components/PermissionGuard.tsx`

Không thay đổi. Route `/tai-chinh` sẽ đổi guard sang `finance.submit` (dùng `hasAnyPermission`) hoặc tạo guard mới cho OR logic.

### 4. `src/App.tsx`

Đổi route `/tai-chinh` từ `PermissionGuard permission="finance.view"` sang guard cho phép cả `finance.view` OR `finance.submit`. Cách đơn giản: tạo `PermissionGuardAny` hoặc update `PermissionGuard` nhận thêm prop `anyOf: PermissionKey[]`.

### 5. `src/pages/Finance.tsx`

- Import `useAuth` và `usePermissions`
- Nếu role HCNS/HR_MANAGER/HR_HEAD (có `finance.submit` nhưng không có `finance.view`): render view giới hạn chỉ gồm:
  - Form "Nhập chi phí mới"
  - Danh sách "Chi phí tôi đã nhập" (filter `submitted_by = user.id`)
  - Badge trạng thái: Chờ duyệt (vàng), Đã duyệt (xanh), Từ chối (đỏ) + review_note
- Nếu có `finance.view`: render full 7 tabs như hiện tại

### 6. `src/components/finance/TransactionFormDialog.tsx`

- Khi HCNS nhập: tự động set `submitted_by = auth.uid()`, `approval_status = 'PENDING_REVIEW'`
- Khi KETOAN/ADMIN nhập: giữ `approval_status = 'DRAFT'` như cũ (hoặc cho chọn)

### 7. `src/components/finance/TransactionListTab.tsx`

- Thêm cột "Trạng thái" hiển thị `approval_status` với Badge màu
- Thêm nút "Duyệt" / "Từ chối" cho KETOAN/ADMIN
- HCNS chỉ thấy nút Sửa khi record ở trạng thái DRAFT/REJECTED

### 8. Sidebar (`AppSidebar.tsx`)

Thay `permission: "finance.view"` cho menu Tài chính thành check cả `finance.view` OR `finance.submit`. Cụ thể: thêm optional `anyPermission` prop cho MenuItem hoặc đổi logic filter.

### Chi tiết kỹ thuật

**PermissionGuard update**: Thêm prop `anyOf?: PermissionKey[]` — nếu có thì check `hasAnyPermission(anyOf)` thay vì `hasPermission(permission)`.

**Sidebar filter update**: Thêm `anyPermission?: PermissionKey[]` vào MenuItem interface, nếu có thì check `hasAnyPermission` thay vì `hasPermission`.

**Finance page logic**:
```text
hasFinanceView = hasPermission("finance.view")
hasFinanceSubmit = hasPermission("finance.submit")

if hasFinanceView → full 7 tabs (hiện tại)
else if hasFinanceSubmit → view giới hạn (form + danh sách cá nhân)
```

**Tổng files sửa**: 7 files + 1 migration
- Migration SQL (schema + RLS + DB function)
- `src/hooks/usePermissions.ts`
- `src/components/PermissionGuard.tsx`
- `src/App.tsx`
- `src/pages/Finance.tsx`
- `src/components/finance/TransactionFormDialog.tsx`
- `src/components/finance/TransactionListTab.tsx`
- `src/components/AppSidebar.tsx`

