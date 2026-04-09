

## Hệ thống Audit Log cho Leads & Customers

### Phân tích hiện trạng

**Đã có:**
- Bảng `audit_logs` (DELETE-only) với trigger `log_delete_action` — chỉ ghi log khi xóa
- `SettingsAuditLogTab` hiển thị nhật ký xóa cho ADMIN
- `is_active` trên profiles đã có, deactivate/activate qua edge function `manage-employee-accounts`
- RLS functions (`has_role`, `has_any_role`) đã kiểm tra `is_active = true`

**Chưa có:**
- Ghi log INSERT/UPDATE cho leads và customers
- Cột `changed_fields`, `change_summary`, `user_role`, `user_full_name`, `new_data` trên `audit_logs`
- Tab "Lịch sử sửa đổi" trong LeadDetailDialog / CustomerDetail
- Trang bàn giao data khi NV nghỉ việc
- Cột `deactivated_at`, `deactivated_reason` trên profiles

### Quyết định thiết kế

**Mở rộng bảng `audit_logs` hiện có** thay vì tạo bảng `audit_log` mới — tránh trùng lặp. Thêm các cột mới, giữ nguyên trigger DELETE cũ, thêm trigger INSERT/UPDATE cho leads + customers.

**Không cần thay đổi RLS cũ** — `has_role`/`has_any_role` đã kiểm tra `is_active = true`.

---

### Thay đổi

#### Migration: Mở rộng `audit_logs` + Triggers

```sql
-- Thêm cột mới vào audit_logs
ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS user_role TEXT,
  ADD COLUMN IF NOT EXISTS user_full_name TEXT,
  ADD COLUMN IF NOT EXISTS new_data JSONB,
  ADD COLUMN IF NOT EXISTS changed_fields TEXT[],
  ADD COLUMN IF NOT EXISTS change_summary TEXT;

-- Mở rộng action (hiện chỉ có DELETE)
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_check;

-- Thêm index
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Thêm cột profiles cho bàn giao
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deactivated_reason TEXT;

-- RLS: GDKD + MANAGER xem audit_logs (bổ sung policies)
CREATE POLICY "audit_view_gdkd" ON audit_logs FOR SELECT USING (
  has_any_role(auth.uid(), ARRAY['GDKD'])
);
CREATE POLICY "audit_view_manager_dept" ON audit_logs FOR SELECT USING (
  has_role(auth.uid(), 'MANAGER')
  AND EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = audit_logs.user_id
    AND p.department_id = get_my_department_id()
  )
);

-- Trigger: log_leads_changes (INSERT/UPDATE/DELETE)
-- Trigger: log_customers_changes (INSERT/UPDATE/DELETE)
-- Cả hai ghi vào audit_logs với action, old_data, new_data, changed_fields, change_summary
```

#### Frontend — 5 file

| File | Thay đổi |
|------|----------|
| `src/components/leads/AuditHistoryTab.tsx` | **Tạo mới** — Timeline lịch sử sửa đổi cho lead, nút Khôi phục (ADMIN) |
| `src/components/leads/LeadDetailDialog.tsx` | Thêm tab "Lịch sử sửa đổi" |
| `src/pages/CustomerDetail.tsx` | Thêm tab "Lịch sử sửa đổi" (reuse component) |
| `src/components/settings/SettingsAuditLogTab.tsx` | Mở rộng: hiện tất cả action (không chỉ DELETE), thêm filter theo action/NV/ngày, export CSV |
| `src/components/settings/DataHandoverDialog.tsx` | **Tạo mới** — Dialog bàn giao data khi vô hiệu hóa NV (hiện số leads/customers, chọn NV nhận, bàn giao + deactivate) |
| `src/components/settings/SettingsAccountsTab.tsx` | Tích hợp DataHandoverDialog vào nút vô hiệu hóa |

#### Chi tiết AuditHistoryTab

- Query `audit_logs` theo `table_name` + `record_id`
- Timeline dọc: thời gian, NV + role, badge action (CREATE=xanh, UPDATE=vàng, DELETE=đỏ, STATUS_CHANGE=tím, REASSIGN=cam)
- Hiển thị changed_fields dạng "Tên: ABC → XYZ"
- Highlight thay đổi nhạy cảm (phone, assigned_to, email) màu đỏ
- Nút "Khôi phục" chỉ ADMIN: update record về old_data, ghi log RESTORE

#### Chi tiết DataHandoverDialog

- Input: profile ID của NV bị deactivate
- Hiện: X leads, Y customers đang assigned
- Dropdown chọn NV mới (cùng phòng ban)
- Nút "Bàn giao & Vô hiệu hóa":
  1. UPDATE leads SET assigned_to = new_id WHERE assigned_to = old_id
  2. UPDATE customers SET assigned_sale_id = new_id WHERE assigned_sale_id = old_id
  3. UPDATE profiles SET is_active = false, deactivated_at = now(), deactivated_reason = ...
  4. Ghi audit_log bàn giao

### Thứ tự thực hiện

1. Migration (mở rộng audit_logs + triggers + profiles columns)
2. AuditHistoryTab component
3. Tích hợp vào LeadDetailDialog + CustomerDetail
4. Mở rộng SettingsAuditLogTab
5. DataHandoverDialog + tích hợp SettingsAccountsTab

