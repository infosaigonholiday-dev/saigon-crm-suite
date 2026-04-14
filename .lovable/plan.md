

## Thêm chức năng chỉnh sửa khách hàng + audit log

### Tình trạng hiện tại
- Bảng `audit_logs` đã tồn tại (KHÔNG cần tạo `audit_log` mới)
- Function `log_customers_changes` đã tồn tại nhưng **chưa có trigger** gắn vào bảng `customers`
- `AuditHistoryTab` component đã có và đang được dùng trong `CustomerDetail` — tab "Lịch sử sửa đổi" đã hoạt động (query bảng `audit_logs`)
- `CustomerFormDialog` chỉ hỗ trợ tạo mới, chưa có chế độ sửa
- Trang `CustomerDetail` chưa có nút "Chỉnh sửa"

### Phần 1: Migration — Gắn trigger audit cho customers, leads, raw_contacts

1 migration duy nhất:

```sql
-- Gắn trigger cho customers
DROP TRIGGER IF EXISTS trg_customers_audit ON customers;
CREATE TRIGGER trg_customers_audit
  AFTER INSERT OR UPDATE OR DELETE ON customers
  FOR EACH ROW EXECUTE FUNCTION log_customers_changes();

-- Gắn trigger cho leads
DROP TRIGGER IF EXISTS trg_leads_audit ON leads;
CREATE TRIGGER trg_leads_audit
  AFTER INSERT OR UPDATE OR DELETE ON leads
  FOR EACH ROW EXECUTE FUNCTION log_leads_changes();
```

Không tạo bảng `audit_log` mới vì `audit_logs` đã tồn tại và đang được dùng. Không tạo lại function vì đã có sẵn.

### Phần 2: CustomerFormDialog hỗ trợ sửa

File: `src/components/customers/CustomerFormDialog.tsx`

- Thêm prop `customer?: any` vào interface Props
- Khi `customer` có giá trị: pre-fill tất cả fields từ customer data (useEffect khi dialog mở)
- Title: `customer ? "Sửa khách hàng" : "Thêm khách hàng"`
- Submit button: `customer ? "Lưu thay đổi" : "Lưu"`
- Logic submit: nếu có `customer` → `.update().eq('id', customer.id)`, ngược lại → `.insert()` như cũ
- Sau submit → invalidate queries + đóng dialog + toast

### Phần 3: Nút Sửa trên CustomerDetail

File: `src/pages/CustomerDetail.tsx`

- Import `CustomerFormDialog` + `usePermissions`
- Thêm state `editOpen`
- Thêm nút "Chỉnh sửa" (icon Pencil) ở header, cạnh badge tier
- Chỉ hiện khi `hasPermission('customers', 'edit')` — RLS tự enforce quyền theo role
- Click → mở `CustomerFormDialog` với prop `customer={customer}`
- Sau khi lưu → refetch customer detail (invalidate query)

### Phần 4: Audit tab

Đã hoạt động sẵn — `CustomerDetail` đã có tab "Lịch sử sửa đổi" dùng `AuditHistoryTab`. Sau khi gắn trigger ở Phần 1, mọi thay đổi sẽ tự động được ghi log.

### Files chỉnh sửa
1. 1 migration SQL mới (gắn trigger)
2. `src/components/customers/CustomerFormDialog.tsx` (thêm prop customer, logic edit)
3. `src/pages/CustomerDetail.tsx` (thêm nút Chỉnh sửa + dialog)

