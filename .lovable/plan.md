## 🎯 Mục tiêu
1. Sắp xếp lại sidebar: Khách hàng → Tiềm năng → Kho Data → LKH Tour 2026
2. Ẩn bảng "Quyền hạn hệ thống" khỏi role không phải Admin/HR
3. Nâng cấp NotificationBell: tabs + filter + group ngày
4. Tự động đánh dấu đã đọc khi vào trang chi tiết
5. Tạo trang Cảnh báo (`/canh-bao`)
6. **FIX LỖI**: `notifications_type_check` chặn các type mới khiến tạo đơn nghỉ phép thất bại

---

## 🔧 Phần E — Fix lỗi constraint (BẮT BUỘC làm đầu)

Migration mới mở rộng constraint chấp nhận tất cả type đang dùng:

```sql
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
CHECK (type IN (
  'birthday','company_anniversary','follow_up','payment_due','contract_expiry','internal_note',
  'LEAD_FORGOTTEN','FOLLOW_UP_OVERDUE','TRAVEL_DATE_NEAR',
  'mention','system','reminder',
  'BOOKING_DEPARTURE_NEAR','PAYMENT_DUE','CONTRACT_APPROVAL_OVERDUE','QUOTATION_NO_RESPONSE',
  'EMPLOYEE_BIRTHDAY','EMPLOYEE_CONTRACT_EXPIRING',
  'ESCALATION_LV1','ESCALATION_LV2','ESCALATION_LV3',
  'LEAVE_REQUEST_NEW','LEAVE_REQUEST_RESULT',
  'BUDGET_ESTIMATE_NEW','BUDGET_ESTIMATE_RESULT',
  'BUDGET_SETTLEMENT_STATUS','BUDGET_SETTLEMENT_CLOSED','BUDGET_SETTLEMENT_REJECTED',
  'TRANSACTION_APPROVAL','TRANSACTION_APPROVED','TRANSACTION_REJECTED'
));
```

---

## 📁 Phần A — Sidebar & Settings

### `src/components/AppSidebar.tsx`
- Đổi thứ tự `crmItems`:
  1. Khách hàng (`/khach-hang`)
  2. Tiềm năng (`/tiem-nang`)
  3. Kho Data (`/kho-data`)
  4. LKH Tour 2026 (`/b2b-tours`)
  5. ... (giữ nguyên các mục còn lại)
- Thêm mục "Cảnh báo" (`/canh-bao`, icon `AlertTriangle`) với badge đếm notifications priority='high' chưa đọc.

### `src/pages/Settings.tsx`
- Đổi `const showRoles = true` → `const showRoles = isAdmin || isHR;`
- Chỉ ADMIN, SUPER_ADMIN, HCNS, HR_MANAGER thấy tab "Quyền hạn".

---

## 🔔 Phần B — NotificationBell nâng cao

### `src/components/NotificationBell.tsx` (rewrite)
- Mở rộng popover lên `w-[420px]`.
- 2 tabs: **Tất cả** / **Chưa đọc**.
- Filter dropdown theo nhóm dựa vào `entity_type`:
  - Tài chính: `transaction`, `budget_estimate`, `budget_settlement`, `payment`
  - CRM: `lead`, `customer`, `raw_contact`
  - Tour: `booking`, `b2b_tour`, `quotation`, `contract`
  - Nhân sự: `leave_request`, `employee`
  - Khác
- Group theo ngày: Hôm nay / Hôm qua / Tuần này / Cũ hơn (dùng `date-fns`).
- Click → điều hướng + tự `mark as read`.
- Query `notifications` lấy 50 bản ghi gần nhất (cả đọc/chưa đọc) thay vì chỉ 20 unread.

---

## 🪝 Phần C — Auto-mark as Read

### `src/hooks/useAutoMarkNotificationsRead.ts` (mới)
```ts
export function useAutoMarkNotificationsRead(entityType: string, entityId?: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  useEffect(() => {
    if (!user?.id || !entityId) return;
    (async () => {
      await supabase.from("notifications").update({ is_read: true })
        .match({ user_id: user.id, entity_type: entityType, entity_id: entityId, is_read: false });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    })();
  }, [user?.id, entityType, entityId]);
}
```

### Tích hợp:
- `src/pages/BookingDetail.tsx` → `useAutoMarkNotificationsRead("booking", id)`
- `src/pages/CustomerDetail.tsx` → `useAutoMarkNotificationsRead("customer", id)`
- `src/pages/EmployeeDetail.tsx` → `useAutoMarkNotificationsRead("employee", id)`

---

## 🚨 Phần D — Trang Cảnh báo

### `src/pages/AlertsCenter.tsx` (mới) — route `/canh-bao`
3 tabs:

1. **Khẩn cấp** — `notifications` `priority='high'` chưa đọc của user hiện tại (cả mention, escalation, overdue).
2. **Tài chính**:
   - `transactions` status `PENDING_HR_APPROVAL`/`PENDING_REVIEW`
   - `budget_settlements` status `pending_accountant`/`pending_ceo`
   - `payments` quá hạn `due_date < today AND status != PAID`
3. **Vận hành**:
   - `bookings` có `departure_date` trong 7 ngày tới
   - `booking_special_notes` priority `high` chưa xử lý
   - `contracts` status `PENDING_APPROVAL` quá 3 ngày

Mỗi item có nút "Đi tới" điều hướng đến trang chi tiết tương ứng.

### `src/App.tsx`
Thêm route:
```tsx
<Route path="/canh-bao" element={<ErrorBoundary><AlertsCenter /></ErrorBoundary>} />
```
(Không cần PermissionGuard — RLS lọc dữ liệu tự động.)

---

## ✅ Verify sau khi triển khai
1. Tạo thử đơn nghỉ phép → không còn lỗi `notifications_type_check`.
2. Mở `/canh-bao` → 3 tab load OK.
3. Vào BookingDetail của booking có notification → notification biến mất khỏi bell.
4. NotificationBell hiển thị tabs + filter đúng.
5. Sidebar đúng thứ tự + có mục Cảnh báo.
6. Settings: SALE/KETOAN/DIEUHAN không thấy tab "Quyền hạn".
