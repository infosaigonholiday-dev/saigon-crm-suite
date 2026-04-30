# Prompt #5B — Quy tắc `action_url` (Điều hướng khi click)

## Quyết định kiến trúc (đã chốt)

1. **URL pattern**: dùng route tiếng Việt hiện có (KHÔNG tạo `/leads`, `/customers`, `/finance/*` mới). `generate_action_url()` map sang route thật của app.
2. **Priority enum**: migrate `normal→medium`, `urgent→critical`, sau đó áp CHECK constraint chỉ cho phép `low/medium/high/critical`. Có backup + rollback plan.

## Hiện trạng (đã verify)

- Bảng `notifications` **chưa có cột `action_url`**.
- Priority hiện chứa: `high (131)`, `normal (20)`, `critical (10)`, `urgent (3)`.
- UI điều hướng đang map qua `entity_type → route` ở client (`AlertsCenter.getEntityLink`, `NotificationBell`), KHÔNG dùng URL DB.
- App KHÔNG có `BroadcastNotification` form chứa field URL — cần thêm field URL vào form Broadcast (hoặc form admin tạo noti) để đáp ứng UX yêu cầu.

## Bảng map entity → route (route thật của app)

| entity_type | URL pattern (DB sẽ sinh) | Trang đích |
|---|---|---|
| `lead` | `/tiem-nang?id=:id` | Leads list, mở detail dialog theo id |
| `customer` | `/khach-hang/:id` | CustomerDetail |
| `booking` | `/dat-tour/:id` | BookingDetail |
| `tour_file` | `/ho-so-doan/:id` | TourFileDetail |
| `office_expense` | `/tai-chinh?tab=hcns&id=:id` | Finance → tab HCNS, focus expense |
| `tour_settlement` | `/tai-chinh?tab=quyet-toan&id=:id` | Finance → tab Quyết toán |
| `supplier_invoice` | `/tai-chinh?tab=payables&id=:id` | Finance → tab Payables |
| `recurring_expense` | `/tai-chinh?tab=recurring&id=:id` | Finance → tab Recurring |
| `leave_request` | `/nghi-phep?id=:id` | LeaveManagement, focus đơn |
| `contract` | `/hop-dong?id=:id` | Contracts list, focus hợp đồng |
| `campaign` | `/chien-dich/:id` | CampaignDetail |
| `employee` | `/nhan-su/:id` | EmployeeDetail |

URL list (entity_id NULL + action_required=false + priority IN ('low','medium')):
- `CASHFLOW_NEGATIVE_ALERT` → `/tai-chinh?tab=cashflow`
- `BROADCAST` → `/canh-bao`

## Implementation — chia 3 migration + code

### Migration 1: Backup + Migrate priority enum

```sql
-- 1. Backup
CREATE TABLE notifications_backup_20260430 AS SELECT * FROM notifications;

-- 2. Migrate giá trị
UPDATE notifications SET priority = 'medium'   WHERE priority = 'normal';
UPDATE notifications SET priority = 'critical' WHERE priority = 'urgent';

-- 3. Default mới + CHECK
ALTER TABLE notifications ALTER COLUMN priority SET DEFAULT 'medium';
ALTER TABLE notifications
  ADD CONSTRAINT chk_priority_enum
  CHECK (priority IN ('low','medium','high','critical'));
```

### Migration 2: Thêm `action_url` + `generate_action_url()` + auto-fill trigger

```sql
ALTER TABLE notifications ADD COLUMN action_url TEXT;

CREATE OR REPLACE FUNCTION generate_action_url(p_entity_type TEXT, p_entity_id UUID)
RETURNS TEXT LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF p_entity_type IS NULL OR p_entity_id IS NULL THEN RETURN NULL; END IF;
  RETURN CASE p_entity_type
    WHEN 'lead'              THEN '/tiem-nang?id='        || p_entity_id::text
    WHEN 'customer'          THEN '/khach-hang/'          || p_entity_id::text
    WHEN 'booking'           THEN '/dat-tour/'            || p_entity_id::text
    WHEN 'tour_file'         THEN '/ho-so-doan/'          || p_entity_id::text
    WHEN 'office_expense'    THEN '/tai-chinh?tab=hcns&id='       || p_entity_id::text
    WHEN 'tour_settlement'   THEN '/tai-chinh?tab=quyet-toan&id=' || p_entity_id::text
    WHEN 'supplier_invoice'  THEN '/tai-chinh?tab=payables&id='   || p_entity_id::text
    WHEN 'recurring_expense' THEN '/tai-chinh?tab=recurring&id='  || p_entity_id::text
    WHEN 'leave_request'     THEN '/nghi-phep?id='        || p_entity_id::text
    WHEN 'contract'          THEN '/hop-dong?id='         || p_entity_id::text
    WHEN 'campaign'          THEN '/chien-dich/'          || p_entity_id::text
    WHEN 'employee'          THEN '/nhan-su/'             || p_entity_id::text
    ELSE NULL
  END;
END; $$;

CREATE OR REPLACE FUNCTION auto_fill_action_url() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.related_entity_type IS NOT NULL AND NEW.related_entity_id IS NOT NULL
     AND (NEW.action_url IS NULL OR length(trim(NEW.action_url)) <= 1
          OR NEW.action_url IN ('/','#','/notifications')) THEN
    NEW.action_url := generate_action_url(NEW.related_entity_type, NEW.related_entity_id);
  END IF;
  -- Fallback: nếu chỉ có entity_type/entity_id (cột cũ) thì cũng auto-fill
  IF NEW.action_url IS NULL AND NEW.entity_type IS NOT NULL AND NEW.entity_id IS NOT NULL THEN
    NEW.action_url := generate_action_url(NEW.entity_type, NEW.entity_id);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notification_auto_url
  BEFORE INSERT OR UPDATE OF related_entity_type, related_entity_id, entity_type, entity_id, action_url
  ON notifications FOR EACH ROW EXECUTE FUNCTION auto_fill_action_url();
```

### Migration 3: Backfill URL cho data cũ + CHECK constraint

```sql
-- Backfill 164 noti hiện tại
UPDATE notifications
SET action_url = COALESCE(
  generate_action_url(related_entity_type, related_entity_id),
  generate_action_url(entity_type, entity_id)
)
WHERE action_url IS NULL;

-- CHECK chặn URL trống/'/' khi action_required=true HOẶC priority cao
ALTER TABLE notifications
  ADD CONSTRAINT chk_action_url_required CHECK (
    (action_required = false AND priority IN ('low','medium'))
    OR (
      action_url IS NOT NULL
      AND length(trim(action_url)) > 1
      AND action_url NOT IN ('/', '#', '/notifications')
    )
  ) NOT VALID;
-- NOT VALID để không fail nếu còn noti cũ thiếu URL; bật validate sau khi backfill OK:
ALTER TABLE notifications VALIDATE CONSTRAINT chk_action_url_required;
```

### Code changes (4 lớp validate + UX + graceful 404)

**A. Edge functions & helpers — đổi enum priority**
- `supabase/functions/broadcast-notification/index.ts`: `"normal"|"high"|"urgent"` → `"low"|"medium"|"high"|"critical"`, default `"medium"`.
- `supabase/functions/daily-reminders/index.ts`: 12 chỗ `priority:"normal"` → `"medium"`.
- `src/lib/notifyByRole.ts`: type union → 4 giá trị mới, default `"medium"`.
- `src/pages/Payroll.tsx`, `src/pages/Recruitment.tsx`, `src/components/recruitment/CandidateFormDialog.tsx`: `"normal"` → `"medium"`.

**B. `BroadcastNotification.tsx` — Form admin**
- Đổi label field URL: **"Đường dẫn điều hướng (URL khi user bấm vào thông báo)"**.
- Helper text: *"Hệ thống chỉ điều hướng khi user click. Trạng thái 'đã xử lý' chỉ được set khi entity nghiệp vụ thật thay đổi — KHÔNG phải khi user mở link này."*
- Thêm 2 dropdown: `Entity type` + `Entity` (combobox search). Khi chọn → tự fill `action_url` qua `generateActionUrlClient()` + lock field (read-only, icon 🔒).
- Bỏ field URL nếu `action_required=false` && `priority IN ('low','medium')`.
- Đổi priority dropdown: `Thấp / Bình thường / Cao / Khẩn` ứng với `low/medium/high/critical`.
- Validate submit: nếu `action_required=true` HOẶC priority `high|critical` mà URL rỗng/`/`/`#` → chặn + toast đỏ.
- Gửi `action_url` + `related_entity_type/related_entity_id` xuống edge function.

**C. `src/lib/actionUrl.ts` (mới)** — single source of truth client-side
```ts
export const ENTITY_URL_MAP: Record<string,(id:string)=>string> = {
  lead: id => `/tiem-nang?id=${id}`,
  customer: id => `/khach-hang/${id}`,
  booking: id => `/dat-tour/${id}`,
  tour_file: id => `/ho-so-doan/${id}`,
  office_expense: id => `/tai-chinh?tab=hcns&id=${id}`,
  tour_settlement: id => `/tai-chinh?tab=quyet-toan&id=${id}`,
  supplier_invoice: id => `/tai-chinh?tab=payables&id=${id}`,
  recurring_expense: id => `/tai-chinh?tab=recurring&id=${id}`,
  leave_request: id => `/nghi-phep?id=${id}`,
  contract: id => `/hop-dong?id=${id}`,
  campaign: id => `/chien-dich/${id}`,
  employee: id => `/nhan-su/${id}`,
};
export const generateActionUrlClient = (t?:string|null,id?:string|null) =>
  t && id && ENTITY_URL_MAP[t] ? ENTITY_URL_MAP[t](id) : null;
```

**D. `NotificationBell.tsx` + `AlertsCenter.tsx` — ưu tiên `action_url`**
- Click noti: nếu `n.action_url` có giá trị → `navigate(n.action_url)`. Nếu không, fallback logic cũ.
- Select query thêm `action_url` + `related_entity_type` + `related_entity_id`.

**E. Graceful 404 ở trang đích**
- `CustomerDetail.tsx`, `BookingDetail.tsx`, `TourFileDetail.tsx`, `EmployeeDetail.tsx`, `CampaignDetail.tsx`: khi query trả PGRST116 (no row) hoặc 403 RLS → render `<EntityNotAccessible kind="..." onBack={...}/>` (component mới) thay vì 404 thô. Phân biệt 2 case: "đã bị xoá/huỷ" vs "không có quyền xem".
- Component mới: `src/components/shared/EntityNotAccessible.tsx`.

**F. Trigger entity-cancel huỷ noti** (kế thừa từ Prompt #5)
- Verify `cancel_notifications_on_entity_cancel` đang chạy cho `bookings.status='cancelled'`, `leads.status='lost'`. Nếu thiếu → bổ sung.

## Test cases (TC11–TC13)

| TC | Cách test | Expected |
|---|---|---|
| TC11 | Form Broadcast: chọn `action_required=true`, để URL trống → Submit | Frontend chặn + toast đỏ. Thử INSERT trực tiếp DB qua `supabase--read_query` (insert) → CHECK chặn |
| TC12 | Sale A insert noti URL lead của Sale B → Sale A click | `/tiem-nang?id=...` mở, dialog không load data, hiện "Bạn không có quyền xem Lead này" |
| TC13 | Cancel 1 booking đã có noti → click noti cũ | Trang `/dat-tour/:id` hiện banner "Booking đã huỷ" + nút quay lại, KHÔNG 404 thô |

## Rollback (nếu break)

```sql
-- Khôi phục priority
UPDATE notifications SET priority='normal'  WHERE priority='medium' AND id IN (SELECT id FROM notifications_backup_20260430 WHERE priority='normal');
UPDATE notifications SET priority='urgent'  WHERE priority='critical' AND id IN (SELECT id FROM notifications_backup_20260430 WHERE priority='urgent');
ALTER TABLE notifications DROP CONSTRAINT chk_priority_enum;
ALTER TABLE notifications DROP CONSTRAINT chk_action_url_required;
DROP TRIGGER trg_notification_auto_url ON notifications;
```

Backup table `notifications_backup_20260430` giữ ít nhất 7 ngày sau khi verify pass.

## Verify checklist sau build

**Phần F (5 tiêu chí action_url):**
- [ ] Label form đúng "Đường dẫn điều hướng..." + helper text
- [ ] `generate_action_url()` trả đúng pattern cho 12 entity types (test SQL)
- [ ] Trigger `auto_fill_action_url` fill URL khi insert có entity
- [ ] CHECK `chk_action_url_required` chặn URL `/` khi action_required=true
- [ ] Form lock URL field (read-only) khi đã chọn entity

**Phần G (3 test cases):** TC11 ✅ TC12 ✅ TC13 ✅

**Migration verify:**
- [ ] `SELECT DISTINCT priority FROM notifications` chỉ còn `low/medium/high/critical`
- [ ] `SELECT count(*) FROM notifications WHERE action_url IS NULL` = 0 (sau backfill)
- [ ] Badge UI render đúng ở Bell + AlertsCenter
- [ ] Console không lỗi khi load `/canh-bao`

## Files dự kiến thay đổi

- 3 migrations mới
- `src/lib/actionUrl.ts` (mới)
- `src/components/shared/EntityNotAccessible.tsx` (mới)
- `src/pages/BroadcastNotification.tsx` (form + entity picker + lock URL)
- `src/components/NotificationBell.tsx` (ưu tiên action_url)
- `src/pages/AlertsCenter.tsx` (ưu tiên action_url)
- `src/pages/CustomerDetail.tsx`, `BookingDetail.tsx`, `TourFileDetail.tsx`, `EmployeeDetail.tsx`, `CampaignDetail.tsx` (graceful 404)
- `src/lib/notifyByRole.ts`, `src/pages/Payroll.tsx`, `src/pages/Recruitment.tsx`, `src/components/recruitment/CandidateFormDialog.tsx` (đổi `"normal"` → `"medium"`)
- `supabase/functions/broadcast-notification/index.ts`, `supabase/functions/daily-reminders/index.ts` (đổi enum)

Bấm **Approve** để em chạy migration 1 (backup + priority) trước, verify, rồi tiếp migration 2+3 và code.
