

## Nâng cấp Module Leads & Customers cho Phòng Sale

### Phân tích hiện trạng vs yêu cầu

**Cột đã có** (không cần thêm): `company_name`, `company_address`, `lost_reason`, `budget` (≈ estimated_budget), `destination` (≈ destination_interest), `pax_count` (≈ estimated_pax), `temperature` (≈ priority), `last_contact_at` (≈ last_contacted_at)

**Cột cần thêm mới**: `contact_person`, `contact_position`, `company_size`, `tax_code`, `planned_travel_date`, `reminder_date`, `contact_count`, `created_by`

**Constraint cần cập nhật**: `status` (thêm 4 trạng thái mới), `channel` (thêm 6 kênh), `interest_type` (thêm INBOUND)

**Lưu ý quan trọng**: Một số cột user yêu cầu trùng tên nhưng khác tên với cột hiện có. Sẽ tái sử dụng cột có sẵn thay vì tạo trùng:
- `budget` → dùng thay `estimated_budget`
- `destination` → dùng thay `destination_interest`
- `pax_count` → dùng thay `estimated_pax`
- `temperature` → giữ nguyên (đã có constraint `hot/warm/cold`), KHÔNG thêm cột `priority` để tránh trùng ý nghĩa
- `last_contact_at` → dùng thay `last_contacted_at`

---

### Thay đổi theo từng phần

#### Migration 1: Thêm cột + cập nhật constraints cho bảng `leads`

```sql
-- Thêm cột mới
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS contact_person TEXT,
  ADD COLUMN IF NOT EXISTS contact_position TEXT,
  ADD COLUMN IF NOT EXISTS company_size INTEGER,
  ADD COLUMN IF NOT EXISTS tax_code TEXT,
  ADD COLUMN IF NOT EXISTS planned_travel_date DATE,
  ADD COLUMN IF NOT EXISTS reminder_date DATE,
  ADD COLUMN IF NOT EXISTS contact_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_by UUID DEFAULT auth.uid();

-- Mở rộng status constraint
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_status_check CHECK (status IN (
  'NEW','NO_ANSWER','CONTACTED','INTERESTED','PROFILE_SENT',
  'QUOTE_SENT','NEGOTIATING','WON','LOST','NURTURE','DORMANT'
));

-- Mở rộng channel constraint
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_channel_check;
ALTER TABLE leads ADD CONSTRAINT leads_channel_check CHECK (channel IN (
  'ZALO','FB','GOOGLE','REFERRAL','WALKIN','AGENCY',
  'TRANG_VANG','GOOGLE_MAPS','COLD_CALL','EVENT','WEBSITE','OTHER'
));

-- Mở rộng interest_type (thêm INBOUND)
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_interest_type_check;
ALTER TABLE leads ADD CONSTRAINT leads_interest_type_check CHECK (
  interest_type IN ('MICE','DOMESTIC','OUTBOUND','INBOUND')
);
```

#### Migration 2: Tạo bảng `lead_care_history` + RLS + Triggers

```sql
CREATE TABLE lead_care_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  contacted_by UUID NOT NULL DEFAULT auth.uid(),
  contacted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  contact_method TEXT NOT NULL DEFAULT 'CALL',
  result TEXT NOT NULL DEFAULT 'NO_ANSWER',
  note TEXT,
  next_action TEXT,
  next_contact_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT care_method_check CHECK (contact_method IN ('CALL','ZALO','EMAIL','VISIT','SMS','OTHER')),
  CONSTRAINT care_result_check CHECK (result IN ('NO_ANSWER','BUSY','NO_NEED','ALREADY_TRAVELED','HAS_PARTNER','INTERESTED','SENT_PROFILE','CALLBACK','QUOTE_REQUESTED','BOOKED'))
);

-- Indexes, RLS, policies (personal + department + admin)
-- Trigger: update_lead_from_care (cập nhật last_contact_at, contact_count, follow_up_date)
-- Trigger: auto_set_reminder (planned_travel_date → reminder_date = -60 ngày)
```

#### Frontend — 8 file thay đổi/tạo mới

| File | Thay đổi |
|------|----------|
| `src/components/leads/LeadFormDialog.tsx` | Redesign 3 section (Cơ bản + Doanh nghiệp + Nhu cầu tour), thêm kênh/interest mới, auto hiển thị reminder_date, duplicate check cả `tax_code` |
| `src/components/leads/LeadDetailDialog.tsx` | **Tạo mới** — Dialog chi tiết lead với 2 tab: Thông tin + Lịch sử chăm sóc |
| `src/components/leads/CareHistoryTab.tsx` | **Tạo mới** — Timeline lịch sử chăm sóc + form thêm lần chăm sóc |
| `src/components/leads/CareHistoryFormDialog.tsx` | **Tạo mới** — Dialog thêm care_history (method, result, note, next_action, next_date) |
| `src/components/leads/LostReasonDialog.tsx` | **Tạo mới** — Popup bắt buộc nhập lost_reason khi kéo sang LOST |
| `src/pages/Leads.tsx` | Mở rộng Kanban 11 cột, thêm logic popup khi kéo sang LOST/NURTURE/DORMANT, onClick mở detail |
| `src/pages/PersonalDashboard.tsx` | Thêm 4 widget KPI Sale: thống kê tuần, nhắc hẹn hôm nay, lead bỏ quên, pipeline funnel |
| `src/components/AppSidebar.tsx` | Badge đếm lead cần follow-up hôm nay trên menu Leads |

#### Chi tiết Kanban mở rộng (11 cột)

```text
NEW → NO_ANSWER → CONTACTED → INTERESTED → PROFILE_SENT → QUOTE_SENT → NEGOTIATING → WON → LOST → NURTURE → DORMANT
```

- Kéo → LOST: popup bắt nhập `lost_reason`
- Kéo → WON: hiện nút "Chuyển thành KH"
- Kéo → NURTURE/DORMANT: popup bắt nhập `next_contact_date`
- Click card: mở `LeadDetailDialog`

#### Chi tiết Dashboard Widget (PersonalDashboard)

- **Widget 1 — Thống kê tuần**: Query `lead_care_history` 7 ngày → tổng liên hệ, tỷ lệ nhấc máy, lead quan tâm mới, tour chốt
- **Widget 2 — Nhắc hẹn hôm nay**: Query `leads` WHERE `follow_up_date <= today` AND status NOT IN (WON, LOST, DORMANT)
- **Widget 3 — Lead bỏ quên**: `last_contact_at` > 7 ngày AND status active
- **Widget 4 — Pipeline funnel**: Count leads theo status, tính conversion rate

### Thứ tự thực hiện

1. Migration 1 (cột + constraints)
2. Migration 2 (lead_care_history + triggers)
3. LeadFormDialog (redesign form)
4. LeadDetailDialog + CareHistoryTab + CareHistoryFormDialog
5. LostReasonDialog + Leads.tsx (Kanban mở rộng)
6. PersonalDashboard widgets
7. Sidebar badge

