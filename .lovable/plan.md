## Mục tiêu
Bổ sung 8 loại notification mới vào hệ thống (đẩy push tự động qua trigger `trg_notifications_push` đã có). Không tạo function/trigger push mới.

---

## Phát hiện schema thực tế (đã verify bằng SQL)

| Yêu cầu spec | Thực tế DB | Quyết định |
|---|---|---|
| `bookings.departure_date` | KHÔNG có | Dùng `bookings.remaining_due_at` (ngày phải thanh toán đủ trước tour) làm proxy ngày khởi hành |
| `bookings.payment_deadline` | KHÔNG có | Dùng `remaining_due_at < today AND remaining_amount > 0` |
| `contracts.end_date`, `sale_id` | KHÔNG có | Dùng `contracts.full_payment_due_at` làm proxy hết hạn; lấy sale qua `bookings.sale_id` |
| `leads.source` | KHÔNG có (chỉ `channel`) | B3 đổi thành `channel IN ('FB','ZALO')` (lead online) |
| `budget_estimates` status `pending_dh/kt/ceo` | Chỉ có `pending_review/approved/rejected` | Mở rộng trigger `notify_budget_estimate_change` cũ |
| `employees.status='active'` | Giá trị thực: `ACTIVE/INTERN/PROBATION` | Trigger AFTER INSERT bất kỳ status nào |

---

## Migration 1 — Mở rộng trigger TÀI CHÍNH (A1, A2)

### A1. `notify_budget_estimate_change` (REPLACE)
- Khi `status='pending_review'`: notify **TẤT CẢ KETOAN active** + **TẤT CẢ ADMIN/SUPER_ADMIN active** (thay vì 1 người)
- Title: `📋 Dự toán chờ duyệt: {code}`
- Message: `Booking {booking.code} — {total_estimated VNĐ}` (JOIN bookings để lấy code)
- Khi `approved/rejected`: giữ logic cũ notify `created_by`

### A2. `notify_budget_settlement_change` (REPLACE)
- Khi `status='pending_accountant'`: notify **TẤT CẢ KETOAN active**
- Khi `status='pending_ceo'`: notify **TẤT CẢ ADMIN/SUPER_ADMIN active**
- Title: `📑 Quyết toán chờ duyệt: {code}`
- Message: `Booking {booking.code} — Chênh lệch: {(total_actual - total_estimated) VNĐ}` (lấy từ bảng)
- Giữ logic `closed/rejected` cũ

---

## Migration 2 — Trigger LEAD MỚI ONLINE (B3)

```sql
CREATE OR REPLACE FUNCTION public.notify_new_online_lead() ...
DROP TRIGGER IF EXISTS trg_notify_new_online_lead ON public.leads;
CREATE TRIGGER trg_notify_new_online_lead AFTER INSERT ON public.leads
  FOR EACH ROW WHEN (NEW.channel IN ('FB','ZALO'))
  EXECUTE FUNCTION public.notify_new_online_lead();
```
- Notify **TẤT CẢ GDKD + MANAGER active**
- Type: `new_online_lead`
- Title: `🌐 Lead mới từ {channel}`
- Message: `{full_name} — {phone} — {COALESCE(interest_type,'?')}`

---

## Migration 3 — Trigger NV MỚI ONBOARD (C2)

```sql
CREATE OR REPLACE FUNCTION public.notify_new_employee() ...
DROP TRIGGER IF EXISTS trg_notify_new_employee ON public.employees;
CREATE TRIGGER trg_notify_new_employee AFTER INSERT ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_employee();
```
- Notify **HR_MANAGER + HCNS active** + **manager phòng** (`departments.manager_id`)
- Type: `new_employee`
- Title: `👤 Nhân viên mới: {full_name}`
- Message: `Phòng {department.name} — Vị trí: {position}`

---

## Edit Edge Function `daily-reminders` — thêm 3 cảnh báo (A3, B1, B2)

File: `supabase/functions/daily-reminders/index.ts`

### A3. Payment Overdue
- Query `bookings` WHERE `remaining_amount > 0 AND remaining_due_at < today`
- Notify `sale_id` + tất cả `KETOAN`
- Type: `payment_overdue`
- Dedupe: SKIP nếu đã có notification cùng `entity_id + type` trong ngày hôm nay

### B1. Contract Expiry (dùng `full_payment_due_at` làm proxy)
- Query `contracts` WHERE `full_payment_due_at BETWEEN today AND today+7` AND `status='active'` (nếu null thì coi như active)
- JOIN bookings → notify `bookings.sale_id` + tất cả `DIEUHAN`
- Type: `contract_expiry`
- Title: `📄 HĐ sắp đến hạn thanh toán: {contract.code}`
- Dedupe theo ngày

### B2. Tour Departure (dùng `remaining_due_at` làm proxy)
- Query `bookings` WHERE `remaining_due_at BETWEEN today AND today+3` AND `status NOT IN ('CANCELLED','closed')`
- Notify `sale_id` + tất cả `DIEUHAN` + tất cả `TOUR`
- Type: `tour_departure`
- Title: `✈️ Tour sắp khởi hành: {code}`
- Message: `{customer.full_name} — {pax_total} khách — Hạn TT: {remaining_due_at}`
- Dedupe theo ngày

Tất cả check `notifications` table với `entity_id + type + created_at::date = today` trước khi insert để tránh trùng.

---

## Test sau khi deploy

1. Manually trigger daily-reminders qua `curl_edge_functions` POST `/daily-reminders` → đọc log
2. Insert test notification thủ công cho mỗi type (5 loại mới: `payment_overdue`, `contract_expiry`, `tour_departure`, `new_online_lead`, `new_employee`) cho user `21587d06-9c1e-47c2-aa78-f7daadea4ddb` → verify trigger `trg_notifications_push` gọi `send-notification` thành công
3. Đọc `push_send_log` để verify status_code = 200 từ OneSignal
4. Báo cáo: số trigger đã tạo/replace, status code từng test push, số bookings/contracts khớp điều kiện trong daily-reminders dry-run

---

## Phạm vi KHÔNG đụng tới
- Không sửa schema bảng `notifications` (cột `type` text tự do, không thêm constraint)
- Không tạo Edge Function mới
- Không tạo function/trigger push mới (dùng `trg_notifications_push` → `send-notification` đã hoạt động)
- Không thêm cột mới vào `bookings/contracts/employees`
