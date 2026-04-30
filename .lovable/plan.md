## Mục tiêu

Tách trang **Settings → Thống kê thông báo** thành 3 section, có filter đầy đủ và bảng audit chi tiết từng notification. Admin/CEO biết được mỗi nhân sự đã đọc/xử lý thông báo nào.

---

## Section 1 — KPI tổng (clickable)

Giữ 4 card hiện có (Đã gửi 7d / Chưa đọc / Cần xử lý / Quá hạn). Mỗi card gắn `onClick` set một preset filter cho Section 3:

| Card | Preset filter Section 3 |
|---|---|
| Đã gửi 7 ngày | range = 7d, reset filter khác |
| Chưa đọc | read_status = `unread` |
| Cần xử lý | action_status ∈ {`pending`, `in_progress`} |
| Quá hạn xử lý | action_status = `overdue` |

Card được chọn highlight border `border-primary`. Auto scroll xuống Section 3.

---

## Section 2 — Tình trạng đọc theo nhân sự

Dùng RPC `rpc_notification_stats_by_user` (đã chạy được). Bổ sung cột **Email**, **Vai trò**, nút **"Xem chi tiết"**.

Vì RPC hiện trả `full_name, email, department` chưa có `role`, sẽ cập nhật RPC join thêm `profiles.role`.

Click "Xem chi tiết" → set `userFilter = user_id` cho Section 3 + scroll xuống.

---

## Section 3 — Bảng audit chi tiết notification (mới)

### Data source
Query trực tiếp từ client:
```ts
supabase.from('notifications')
  .select(`
    id, user_id, type, title, message, priority,
    created_at, is_read, read_at,
    action_required, action_status, action_due_at, action_completed_at,
    related_entity_type, related_entity_id, entity_type, entity_id, action_url,
    profiles:user_id ( full_name, email, department, role )
  `)
  .order('created_at', { ascending: false })
  .limit(500);
```

RLS hiện tại của `notifications` chỉ cho user đọc record của mình → cần **RPC mới** `rpc_notification_audit_list(p_range, p_user_id, p_department, p_type, p_group, p_read_status, p_action_status, p_search)` chạy `SECURITY DEFINER`, gate bằng `has_role(auth.uid(), 'ADMIN'/'SUPER_ADMIN'/'HR_MANAGER'/'GDKD'/'MANAGER')`. Trả về tối đa 500 dòng theo filter, kèm `full_name/email/department/role` từ `profiles`.

### Filter bar (8 control)
1. **Khoảng thời gian** (Select): 7/30/90/all
2. **Nhân sự** (Combobox search): `Tất cả` + danh sách từ profiles active
3. **Phòng ban** (Select): Tất cả / SALE / OPS / ACC / HR / MKT / MANAGEMENT
4. **Loại thông báo** (Select): liệt kê 21 type có trong DB + `Tất cả`
5. **Nhóm thông báo** (Select) — mapping client-side:
   - `Lead/CRM`: FOLLOW_UP, FOLLOW_UP_OVERDUE, LEAD_FORGOTTEN, LEAD_NO_SCHEDULE, LEAD_ASSIGNED, LEAD_WON, NEW_ONLINE_LEAD, ESCALATION_LV1
   - `Booking/Tour`: BOOKING_DEPARTURE_NEAR, TRAVEL_DATE_NEAR, TOUR_DEPARTURE
   - `Tài chính`: PAYMENT_DUE, PAYMENT_OVERDUE, PAYMENT_RECEIVED, TRANSACTION_APPROVAL, TRANSACTION_APPROVED, TRANSACTION_REJECTED, BUDGET_ESTIMATE_PENDING, BUDGET_SETTLEMENT_PENDING, CASHFLOW_NEGATIVE
   - `Nhân sự`: LEAVE_REQUEST_NEW, LEAVE_REQUEST_RESULT, BIRTHDAY, COMPANY_ANNIVERSARY, NEW_EMPLOYEE
   - `Hợp đồng`: CONTRACT_APPROVAL_OVERDUE, CONTRACT_EXPIRY
   - `Hệ thống/Broadcast`: BROADCAST, TEST_PUSH, WELCOME, DAILY_DIGEST, KPI_ACHIEVEMENT, INTERNAL_NOTE
6. **Trạng thái đọc**: Tất cả / Đã đọc / Chưa đọc / Khẩn chưa đọc (priority ∈ high/critical & !is_read) / Chưa đọc >24h
7. **Trạng thái xử lý**: Tất cả / Không cần xử lý (action_required=false) / Chờ xử lý / Đang xử lý / Quá hạn / Đã xử lý / **Đã đọc nhưng chưa xử lý** (is_read=true & action_required=true & action_status ∈ pending/in_progress/overdue)
8. **Ô tìm kiếm** debounce 300ms: ILIKE trên `title`, `message`, `profiles.full_name`, `profiles.email`

Có nút **"Xoá lọc"** reset toàn bộ + clear preset từ Section 1/2.

### Cột bảng (16 cột — horizontal scroll)
Người nhận | Email | Phòng ban | Vai trò | Loại | Nhóm | Tiêu đề | Nội dung (truncate 80 ký tự, tooltip full) | Mức độ (badge) | Gửi lúc | Trạng thái đọc | Đọc lúc | Chưa đọc bao lâu | Cần xử lý | Trạng thái xử lý | Xử lý lúc | Entity | Mở

- "Mở" = button link tới `action_url` (nếu có) hoặc dùng `notificationActions.ts` với `related_entity_type/id`.
- Pagination 50/page client-side (RPC trả tối đa 500 đã filter).

---

## Quy tắc nghiệp vụ (giữ nguyên)
- Click notification chỉ set `is_read=true, read_at=now()`. **Không** đổi `action_status`.
- `action_status='completed'` chỉ khi nghiệp vụ thực sự hoàn tất qua flow tương ứng.
- Đã có sẵn trong `markNotificationRead.ts` và `rpc_notification_complete_action` — không sửa.

---

## Thay đổi kỹ thuật

### Migration SQL
1. **Update** `rpc_notification_stats_by_user`: bổ sung `role` (text) lấy từ `profiles.role`.
2. **Create** `rpc_notification_audit_list(p_range_days int, p_user_id uuid, p_department text, p_type text, p_group text, p_read_status text, p_action_status text, p_search text)`:
   - `SECURITY DEFINER`, `SET search_path = public`
   - Gate: `has_role(auth.uid(),'ADMIN') OR ... 'SUPER_ADMIN' OR 'HR_MANAGER' OR 'GDKD' OR 'MANAGER'`; nếu không có quyền → `RAISE EXCEPTION`.
   - SELECT từ `notifications n LEFT JOIN profiles p ON p.id = n.user_id`, áp filter động, `ORDER BY n.created_at DESC LIMIT 500`.
   - GRANT EXECUTE TO authenticated.

### File code
- **Sửa** `src/components/settings/SettingsNotificationStatsTab.tsx`:
  - Thêm state `filters` + `presetFromCard`.
  - Card KPI thành button có active state.
  - Bảng Section 2: thêm cột Email, Vai trò, nút "Xem chi tiết".
  - Thêm Section 3 (filter bar + table + pagination) gọi `rpc_notification_audit_list`.
  - Bỏ widget "Top nhân sự nhiều thông báo chưa đọc" (đã trùng Section 2) — gộp dữ liệu vào Section 2.
  - Giữ widget "Cao/Khẩn chưa đọc quá 24h" như cảnh báo collapse mặc định.
- **Tạo** `src/lib/notificationGroups.ts`: hằng số mapping type → group, label tiếng Việt cho type/group, danh sách phòng ban.

### Test nghiệm thu (theo yêu cầu user)
Sau khi triển khai sẽ chạy SQL `INSERT` 5 notification cho 2 user test, mở trang, chụp kết quả từng filter (FOLLOW_UP_OVERDUE / BROADCAST / "Đã đọc nhưng chưa xử lý" / "Khẩn chưa đọc") để xác nhận DoD.

---

## Definition of Done
- 3 section riêng biệt, không còn mix vào widget khẩn cấp.
- KPI card click filter được Section 3.
- Section 2 có Email, Vai trò, "Xem chi tiết" → đẩy filter sang Section 3.
- Section 3 có 8 filter + ô tìm kiếm + bảng 16 cột + pagination.
- Khi KPI "Chưa đọc" > 0, bảng chi tiết với filter "Chưa đọc" không rỗng.
- RLS giữ nguyên; admin truy cập qua RPC `SECURITY DEFINER`.
