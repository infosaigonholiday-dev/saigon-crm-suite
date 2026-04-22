

## PHASE 4 — Internal Notes (@mention) cho 9 module

### 1. Database migration

```sql
-- Bảng ghi chú nội bộ (immutable audit trail)
CREATE TABLE internal_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN (
    'raw_contact','lead','customer','booking',
    'quotation','contract','payment','employee','finance'
  )),
  entity_id uuid NOT NULL,
  content text NOT NULL,
  mention_user_ids uuid[] NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES profiles(id) NOT NULL DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_notes_entity ON internal_notes(entity_type, entity_id);
CREATE INDEX idx_notes_mentions ON internal_notes USING gin(mention_user_ids);

ALTER TABLE internal_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_access" ON internal_notes FOR ALL TO authenticated
  USING (has_role(auth.uid(),'ADMIN')) WITH CHECK (has_role(auth.uid(),'ADMIN'));
CREATE POLICY "notes_read" ON internal_notes FOR SELECT TO authenticated
  USING (created_by = auth.uid()
         OR auth.uid() = ANY(mention_user_ids)
         OR has_any_role(auth.uid(), ARRAY['SUPER_ADMIN','GDKD','MANAGER']));
CREATE POLICY "notes_insert" ON internal_notes FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
-- Không có UPDATE/DELETE policy → chỉ admin sửa/xóa được

-- Mở rộng CHECK constraint của notifications để cho phép type='internal_note'
ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('birthday','company_anniversary','follow_up','payment_due',
                  'contract_expiry','internal_note'));
```

**Lưu ý**: Phase 3 (Web Push edge function) chưa làm → chỉ insert `notifications` để NotificationBell hiện đỏ + realtime. Khi Phase 3 xong sẽ thêm `supabase.functions.invoke('send-notification')`.

### 2. Tạo component dùng chung

**`src/components/shared/InternalNotes.tsx`** — props `{entityType, entityId}`. Bao gồm:
- Query danh sách notes theo entity (cache key: `["internal-notes", entityType, entityId]`)
- Timeline mới nhất trên cùng: avatar (initial), tên người viết (bold), thời gian relative (vi locale), nội dung. Highlight `@Tên` xanh dương trong content.
- Form: `Textarea` với listener khi gõ `@` → query `profiles` (is_active=true, search theo `full_name`) hiển thị Popover/Command list. Chọn → chèn `@Tên` vào text + lưu user_id vào array. Có thể tag nhiều người.
- Nút "Gửi" → INSERT note + INSERT notifications cho mỗi mention (loại trừ self) với `type='internal_note'`, `title='[Người gửi] đã tag bạn'`, `message=content.slice(0,100)`, `entity_type`, `entity_id`.
- Toast thành công, refetch.

**`src/components/shared/NotesCountBadge.tsx`** (tiện ích nhỏ) — hiển thị 💬 + số lượng. Query `select count(*)` theo entity. Dùng trong tab label.

### 3. NotificationBell — mapping route mới

File `src/components/NotificationBell.tsx`: mở rộng hàm `markAsRead` để route theo `entity_type`:
```
raw_contact → /kho-data
lead        → /tiem-nang
customer    → /khach-hang/{id}
booking     → /dat-tour/{id}
quotation   → /bao-gia
contract    → /hop-dong
payment     → /thanh-toan
employee    → /nhan-su/{id}
finance     → /tai-chinh
```
Thêm icon `MessageSquare` cho `type='internal_note'`.

### 4. Tích hợp 9 module

| Module | File | Pattern tích hợp |
|---|---|---|
| Customer | `src/pages/CustomerDetail.tsx` | Thêm Tab "Ghi chú" vào TabsList (sau Audit) |
| Lead | `src/components/leads/LeadDetailDialog.tsx` | Thêm Tab "Ghi chú" vào 3 tab hiện có |
| Booking | `src/pages/BookingDetail.tsx` | Thêm Tab "Ghi chú" cạnh tab "Lưu ý" |
| Employee | `src/pages/EmployeeDetail.tsx` | Tab "Ghi chú" — chỉ hiện cho HR/Admin (`hasPermission('staff','view')`) |
| RawContact | `src/pages/RawContacts.tsx` | Thêm cột "Ghi chú" + nút icon 💬 → mở Dialog chứa `<InternalNotes>` |
| Quotation | `src/pages/Quotations.tsx` | Cột Ghi chú + nút mở Dialog |
| Contract | `src/components/contracts/ContractDetailDialog.tsx` | Thêm Tab "Ghi chú" trong dialog detail có sẵn |
| Payment | `src/pages/Payments.tsx` | Cột Ghi chú + nút mở Dialog |
| Finance | `src/pages/Finance.tsx` | Tích hợp ở dialog xem chi tiết Estimate/Settlement (truyền estimate/settlement id) |

Mỗi tab/badge hiển thị số lượng notes: `Ghi chú (3)` qua `NotesCountBadge`.

### 5. Phân quyền

RLS đã enforce SELECT theo creator/mentioned/manager. Thêm guard UI:
- Form gửi note hiện cho mọi user authenticated có quyền view module tương ứng (đã được PermissionGuard bảo vệ ở route).
- Note không có nút Sửa/Xóa (RLS chặn).

### Files chỉnh sửa

**Migration**: 1 file SQL mới (tạo `internal_notes` + sửa CHECK `notifications`)

**Tạo mới**:
- `src/components/shared/InternalNotes.tsx`
- `src/components/shared/NotesCountBadge.tsx`
- `src/components/shared/InternalNotesDialog.tsx` (wrapper Dialog cho các trang dạng list)

**Sửa**:
- `src/components/NotificationBell.tsx` (route mapping + icon)
- `src/pages/CustomerDetail.tsx`
- `src/pages/BookingDetail.tsx`
- `src/pages/EmployeeDetail.tsx`
- `src/pages/RawContacts.tsx`
- `src/pages/Quotations.tsx`
- `src/pages/Payments.tsx`
- `src/pages/Finance.tsx`
- `src/components/leads/LeadDetailDialog.tsx`
- `src/components/contracts/ContractDetailDialog.tsx`

### Lưu ý

- **Web Push KHÔNG có ở Phase 4**. Mention chỉ tạo bell notification + realtime (đã hoạt động sẵn). Khi Phase 3 (VAPID + edge function) xong, tôi sẽ bổ sung `supabase.functions.invoke('send-notification', ...)` vào `InternalNotes.tsx` ở 1 dòng — không cần refactor.
- Sau khi triển khai: cập nhật memory `mem://features/internal-notes` ghi nhận hệ thống mới.

