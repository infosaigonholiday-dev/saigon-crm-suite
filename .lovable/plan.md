# Plan: Verify & hoàn thiện Push Notification (3 mục)

## Kết quả VERIFY (đã đọc DB & code)

### Mục 1: Pipeline cơ bản — ✅ ĐÚNG
- Trigger `trg_notifications_push AFTER INSERT ON notifications` đã active.
- Function `notify_push_on_insert` gọi đúng `send-notification` Edge Function (không gọi trực tiếp OneSignal).
- Edge Function nhận payload, gọi OneSignal `https://api.onesignal.com/notifications` với `include_aliases.external_id = [user_id]`.
- Secrets `ONESIGNAL_APP_ID` (36 ký tự) và `ONESIGNAL_REST_API_KEY` (113 ký tự, prefix `os_v2_`) đã có trong `system_config`.
- 10 push gần nhất đều `status_code: 200` từ OneSignal.

**ROOT CAUSE push không tới máy** (qua đọc `net._http_response`):
OneSignal trả `"All included players are not subscribed"` và `"invalid_aliases.external_id"` → **các tài khoản test CHƯA bật Web Push trên trình duyệt** (chưa có subscription gắn `external_id = user_id`).
→ Cần user mở `Settings → Thông báo → bật toggle` trên TỪNG thiết bị muốn nhận, rồi mới có thể test push thật. UI test push đã có sẵn ở `PushNotificationToggle`.

### Mục 2: KPI Achievement — Cần bổ sung
Hiện trigger chưa map `entity_type='kpi_achievement'` → URL. Cần migration nhỏ.

### Mục 3: Trang lịch sử thông báo — Chưa có
RLS bảng `notifications` đã đúng spec: `admin_full_access` (ADMIN/SUPER_ADMIN xem tất cả) + `notifications_own` (user xem của mình). Không cần đụng RLS, chỉ cần build UI tab.

---

## Triển khai

### A. Migration database (1 file SQL)

**A1. Cập nhật `notify_push_on_insert`** — thêm 3 entity routes:
```
WHEN 'payroll' THEN '/bang-luong'
WHEN 'kpi_achievement' THEN '/bang-luong'
WHEN 'dashboard' THEN '/'
```
Click thông báo KPI/Phiếu lương sẽ mở `/bang-luong`.

**A2. RPC `send_kpi_achievement_notification(user_id, employee_name, commission_pct)`**:
- SECURITY DEFINER, chỉ ADMIN/SUPER_ADMIN/HR_MANAGER/HCNS được gọi.
- Insert vào `notifications` với:
  - `type='KPI_ACHIEVEMENT'`
  - `title='🏆 Chúc mừng <tên>! 🎉'`
  - `message='Bạn đã vượt KPI tháng và đạt mức hoa hồng X%!'`
  - `entity_type='kpi_achievement'`, `priority='high'`
- Trigger sẽ tự động đẩy push qua OneSignal với click → `/bang-luong`.

### B. Frontend (3 files)

**B1. Tạo `src/components/settings/SettingsNotificationHistoryTab.tsx`**:
- Card chứa toolbar: ô tìm theo title/message + dropdown lọc theo type + nút "Tải lại" + nút "Gửi thông báo test" (gọi `rpc_send_test_push`).
- Bảng 5 cột: **Loại** (badge có emoji + badge priority Cao/Khẩn) | **Tiêu đề** (title + message line-clamp) | **Người nhận** (full_name từ join `profiles`) | **Thời gian gửi** (`dd/MM/yyyy HH:mm`) | **Trạng thái** (badge "Đã đọc" xanh dương / "Chưa đọc" xám).
- Query: `notifications` join `profiles!notifications_user_id_fkey`, `order created_at DESC limit 50`.
- TYPE_LABELS map ~17 loại thông báo phổ biến (TEST_PUSH, FOLLOW_UP, LEAD_WON, KPI_ACHIEVEMENT, DAILY_DIGEST, BROADCAST...).
- RLS sẽ tự lọc → chỉ ADMIN/SUPER_ADMIN thấy hết.

**B2. Sửa `src/pages/Settings.tsx`**:
- Import `SettingsNotificationHistoryTab`.
- Thêm flag `showNotificationHistory = isAdmin` (chỉ ADMIN/SUPER_ADMIN, không cho HR).
- Chèn tab `{ value: "notif_history", label: "Lịch sử thông báo" }` vào mảng `tabs` (sau "Nhật ký thay đổi").
- Render `<TabsContent value="notif_history">` tương ứng.

**B3. (Tùy chọn nhỏ) PersonalDashboard hoặc HRDashboard** — không thay đổi gì (KPI achievement gửi qua RPC, không cần UI riêng cho người nhận).

---

## Test sau khi build

1. **Mục 1**: Vào `Settings → Thông báo`, bấm **Gửi thử push** → Toast hiển thị status từ OneSignal. Nếu device chưa subscribe, sẽ thấy `"All included players are not subscribed"` ở console log của edge function (không phải lỗi pipeline).
2. **Mục 2**: Mở SQL Editor chạy `SELECT public.send_kpi_achievement_notification('<user_id>', 'Mai Khánh', 12);` → Kiểm tra:
   - Bảng `notifications` có record mới `type='KPI_ACHIEVEMENT'`.
   - Bảng `push_send_log` có record mới với `request_id`.
   - User đã subscribe push sẽ nhận thông báo, click vào → mở `/bang-luong`.
3. **Mục 3**: Login Admin → `Settings → Lịch sử thông báo` → thấy 50 thông báo gần nhất, lọc/tìm hoạt động, nút test push gửi được. Login Sale (KETOAN/SALE bất kỳ) → tab "Lịch sử thông báo" KHÔNG hiển thị.

## Files thay đổi
- (DB) Migration: cập nhật `notify_push_on_insert` + tạo RPC `send_kpi_achievement_notification`.
- `src/components/settings/SettingsNotificationHistoryTab.tsx` (mới).
- `src/pages/Settings.tsx` (thêm tab).
