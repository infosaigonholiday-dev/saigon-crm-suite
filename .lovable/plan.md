

## Dashboard Hiệu Suất & Hệ Thống Cảnh Báo cho Admin

### Phân tích hiện trạng

**Đã có:**
- Bảng `notifications` (user_id, type, title, message, entity_type, entity_id, is_read) + NotificationBell component
- Edge function `daily-reminders` ghi birthday/follow-up notifications
- Dashboard phân loại theo role: Business (ADMIN/KETOAN), Manager (GDKD/MANAGER), Personal (SALE_*), HR
- `convertToCustomer` mutation trong Leads.tsx (đơn giản, chỉ copy vài field)
- `customer_id` trên leads (KHÔNG có `converted_customer_id`)
- `lead_care_history` table + triggers
- PersonalDashboard có weekly stats, pipeline funnel, follow-up reminders

**Chưa có:**
- `converted_customer_id` trên leads (cần thêm để liên kết ngược)
- Giới hạn tạo Customer trực tiếp (chỉ ADMIN)
- Dashboard hiệu suất NV (bảng xếp hạng, funnel toàn phòng, trend tuần)
- Cảnh báo tự động cho lead bỏ quên, sửa đổi bất thường
- Báo cáo tuần tự động

---

### Thay đổi chi tiết

#### Migration 1: Schema

```sql
-- Thêm converted_customer_id vào leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS converted_customer_id UUID REFERENCES customers(id);

-- Cập nhật data cũ: sync customer_id → converted_customer_id
UPDATE leads SET converted_customer_id = customer_id WHERE customer_id IS NOT NULL AND converted_customer_id IS NULL;
```

#### Phần 1: Lead → Customer flow

| File | Thay đổi |
|------|----------|
| `src/pages/Customers.tsx` | Ẩn nút "Tạo KH mới" cho role != ADMIN |
| `src/pages/Leads.tsx` | Nâng cấp `convertToCustomer`: validate WON, auto-fill đầy đủ (company, contact_person, contact_position, source, tour_interest, type), set `converted_customer_id`, redirect sang tạo Booking |
| `src/pages/CustomerDetail.tsx` | Thêm section "Nguồn gốc" — query leads WHERE converted_customer_id = customer.id, hiện link về lead gốc + ngày chuyển đổi |

#### Phần 2: Dashboard hiệu suất (BusinessDashboard mở rộng)

| File | Thay đổi |
|------|----------|
| `src/components/dashboard/SalePerformanceTable.tsx` | **Tạo mới** — Bảng xếp hạng NV: leads mới, lượt liên hệ, tỷ lệ nhấc máy, leads quan tâm, tour chốt, conversion %, badge trạng thái |
| `src/components/dashboard/PipelineFunnel.tsx` | **Tạo mới** — Funnel chart toàn phòng: NEW → CONTACTED → INTERESTED → QUOTE_SENT → WON với tỷ lệ chuyển đổi mỗi bước |
| `src/components/dashboard/WeeklyTrendChart.tsx` | **Tạo mới** — Line chart 4 tuần: leads mới, lượt liên hệ, tour chốt |
| `src/pages/Dashboard.tsx` | ADMIN/GDKD dashboard: 4 KPI cards (leads mới, lượt chăm sóc, leads quan tâm, tour chốt) + dropdown chọn phòng ban (ADMIN) + tích hợp 3 components trên |

**KPI cards tính toán:**
- Leads mới: COUNT leads created_at >= đầu tháng, filter by dept
- Lượt chăm sóc: COUNT lead_care_history contacted_at >= đầu tháng
- Leads quan tâm: COUNT leads WHERE status IN (INTERESTED, PROFILE_SENT, QUOTE_SENT, NEGOTIATING)
- Tour chốt: COUNT leads WHERE status = WON AND updated_at >= đầu tháng

**Bảng xếp hạng — Badge logic:**
- Tốt (xanh): conversion ≥ 2% HOẶC tour chốt ≥ 1
- Trung bình (vàng): conversion ≥ 1% HOẶC leads quan tâm ≥ 5
- Cần hỗ trợ (đỏ): lượt liên hệ > 100 nhưng conversion = 0%

#### Phần 3: Cảnh báo tự động

| File | Thay đổi |
|------|----------|
| `supabase/functions/daily-reminders/index.ts` | Mở rộng thêm 3 loại cảnh báo: (1) Lead bỏ quên > 7 ngày → thông báo NV + Leader nếu > 14 ngày, (2) Follow-up quá hạn, (3) Sắp đến ngày đi tour (≤ 60 ngày). Dùng notifications table hiện có (user_id, type, entity_type, entity_id) |

**KHÔNG tạo cron job mới** — tận dụng edge function `daily-reminders` đã có cron schedule. Thêm logic vào cuối function hiện tại.

**KHÔNG tạo trigger abnormal_edit** — quá phức tạp, dễ gây performance issue. Thay vào đó thêm widget "Sửa đổi gần đây" trên admin dashboard query từ audit_logs.

#### Phần 4: Notifications — không cần thay đổi

NotificationBell đã hoạt động, bảng notifications đã có. Sidebar badge cho leads đã có. Chỉ cần thêm type mới vào `typeIcons` trong NotificationBell.

### Thứ tự thực hiện

1. Migration (converted_customer_id + sync data cũ)
2. Lead→Customer conversion flow (Leads.tsx, Customers.tsx, CustomerDetail.tsx)
3. Dashboard components (SalePerformanceTable, PipelineFunnel, WeeklyTrendChart)
4. Dashboard.tsx tích hợp cho ADMIN/GDKD
5. Mở rộng daily-reminders edge function
6. NotificationBell cập nhật icons

