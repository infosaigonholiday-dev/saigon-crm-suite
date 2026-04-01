

# KIỂM TRA DATA FLOW GIỮA CÁC MODULE

---

## A. LUỒNG LEAD → KH → BOOKING → HĐ → THANH TOÁN → TÀI CHÍNH

**1. Tạo Lead mới → thấy trên Kanban?**
✅ OK — `LeadFormDialog` insert vào `leads`, invalidate `["leads"]`. `Leads.tsx` query leads theo status, filter vào columns Kanban.

**2. Lead chuyển đổi → tạo Customer tự động? assigned_sale_id đúng?**
✅ OK — `convertToCustomer` mutation trong `Leads.tsx`: insert customer với `assigned_sale_id: lead.assigned_to`, update lead `status='WON'` + `customer_id`.

**3. Tạo Booking từ Customer → booking.customer_id reference đúng?**
❌ **CẦN FIX** — `BookingFormDialog.tsx` insert booking với `customer_id: form.customer_id` ✅ nhưng **KHÔNG set `sale_id`**. Booking insert không có `sale_id: user.id`. Hệ quả:
- RLS `bookings_read` check `sale_id = auth.uid()` → Sale tạo booking nhưng **không thấy booking đó** (vì sale_id = null)
- RLS `bookings_update` check `sale_id = auth.uid()` → Sale không thể sửa booking mình tạo
- **File cần fix**: `src/components/bookings/BookingFormDialog.tsx` — thêm `sale_id: user.id` vào insert payload (cần import useAuth)

**4. Tạo Hợp đồng từ Booking → auto-fill đúng?**
✅ OK — `ContractFormDialog.tsx` select booking → fill customer_id + total_value.

**5. Payment → booking.remaining_amount cập nhật? Customer.total_paid cập nhật?**
⚠️ **PARTIAL** — Customer.total_paid: ✅ cập nhật qua DB trigger `trg_payment_customer_stats` (function `update_customer_payment_stats`).
Booking.remaining_amount: ❌ **KHÔNG tự động cập nhật**. Không có trigger nào update `bookings.remaining_amount` khi payment được thêm. `remaining_amount` chỉ được set lúc tạo booking (giá trị tĩnh ban đầu). **Cần tạo trigger** hoặc tính toán `remaining_amount = total_value - SUM(payments.amount)` dynamically.

**6. Payment xong → Customer tier tự động nâng hạng?**
✅ OK — DB trigger `trg_auto_tier` trên bảng `payments` gọi function `auto_update_customer_tier()`. Tuy nhiên, function logic dùng `total_revenue` (từ bookings), không phải `total_paid`. Điều này đúng nghiệp vụ — tier dựa trên doanh thu (tổng giá trị booking), không phải tiền đã thanh toán.

**7. Tạo Dự toán cho Booking → liên kết đúng booking_id?**
✅ OK — `BudgetEstimatesTab` create mutation: `booking_id: formBookingId`, `created_by: user!.id`.

**8. KT duyệt dự toán → status chuyển approved?**
✅ OK — `reviewMutation` update status = "approved" hoặc "rejected" + `reviewed_by`, `reviewed_at`, `review_note`.

**9. Tạo Quyết toán từ Dự toán → copy hạng mục + số dự toán đúng?**
✅ OK — `BudgetSettlementsTab` chỉ cho chọn dự toán `status = "disbursed"`. `loadEstimateItems` fetch estimate items → map sang settlement items với `estimated_amount = unit_price * quantity`, `actual_amount = 0` để DH nhập thực chi.

**10. DH submit → KT duyệt → CEO duyệt → booking status = 'completed'?**
✅ OK — Flow: `draft → pending_accountant → pending_ceo → closed`. `ceoApproveMutation` update settlement `status='closed'` rồi `bookings.update({ status: 'COMPLETED' })`.

**11. Booking completed → không ai sửa được?**
❌ **CẦN FIX** — Không có logic nào trong UI hoặc RLS ngăn chặn sửa booking khi status = 'COMPLETED'. `BookingDetail.tsx` và `BookingFormDialog.tsx` không check status trước khi cho sửa. Cần:
- UI: disable edit khi `status === 'COMPLETED'` hoặc `'CANCELLED'`
- Hoặc: RLS policy thêm condition `status NOT IN ('COMPLETED','CANCELLED')`

---

## B. LUỒNG HCNS NHẬP CHI PHÍ

**12. HCNS nhập chi phí → approval_status = 'pending_review', submitted_by = HCNS?**
✅ OK — `TransactionFormDialog.tsx` line 121-123: `if (isSubmitter) { payload.submitted_by = user?.id; payload.approval_status = "PENDING_REVIEW"; }`. `isSubmitter = hasPermission("finance.submit") && !hasPermission("finance.view")` → đúng cho HCNS.

**13. KT thấy trong tab "Duyệt chi phí"?**
✅ OK — `ApprovalTab.tsx` query `.eq("approval_status", "PENDING_REVIEW")`.

**14. KT duyệt → approved. KT từ chối → rejected + review_note?**
✅ OK — `approveMutation`: update `approval_status: "APPROVED"`. `rejectMutation`: update `approval_status: "REJECTED"`, `review_note: note`.

**15. HCNS thấy status cập nhật? Sửa lại record bị từ chối?**
✅ OK — `TransactionListTab submitterOnly`: query `submitted_by = user.id` → thấy tất cả records mình tạo (kể cả APPROVED, REJECTED). `canEditRow`: cho sửa khi `["DRAFT", "REJECTED"].includes(t.approval_status)`. Khi sửa record REJECTED → `approval_status = "PENDING_REVIEW"` (resubmit).

---

## C. LUỒNG PHÂN QUYỀN CEO OVERRIDE

**16. CEO vào Settings → chọn NV → tick can_delete cho customers?**
✅ OK — `PermissionEditDialog.tsx`: checkbox matrix, upsert vào `employee_permissions` với `granted = true/false`.

**17. NV Sale đăng nhập → thấy nút Xóa?**
✅ OK — `usePermissions` load overrides từ `employee_permissions`, merge với DEFAULT_PERMISSIONS. Nếu `customers.delete` được grant → `hasPermission("customers.delete")` = true → nút Xóa hiện.

**18. CEO untick → NV không còn thấy nút Xóa?**
✅ OK — Override bị xóa hoặc set `granted = false` → fallback về DEFAULT_PERMISSIONS (không có `customers.delete` cho SALE) → nút ẩn.

**19. CEO thêm finance.view cho MANAGER → MANAGER thấy thêm menu Tài chính?**
✅ OK — Override `finance.view` grant → `hasPermission("finance.view")` = true → sidebar filter pass → menu hiện. Và Finance.tsx sẽ render `FullFinanceView` thay vì `ManagerFinanceView`.

---

## D. NOTIFICATIONS

**20. Edge Function daily-reminders: birthday → notification?**
✅ OK — Function query customers có `date_of_birth` trong 0-3 ngày tới, deduplicate, insert vào `notifications`.

**21. Sale đăng nhập → bell hiện badge đỏ?**
✅ OK — `NotificationBell` query `notifications.is_read = false` cho `user_id`, hiển thị count.

**22. Click notification → navigate đúng trang KH?**
✅ OK — `markAsRead` navigate to `/khach-hang/${entityId}`.
⚠️ **MINOR**: Notification cho leads (type='follow_up') cũng navigate to `/khach-hang/${entityId}` nhưng entity_id là lead ID, không phải customer ID. Sẽ ra 404 hoặc sai trang.
**File cần fix**: `src/components/NotificationBell.tsx` — check `entity_type` để navigate đúng route (`/leads/${id}` cho lead, `/khach-hang/${id}` cho customer).

**23. Lead follow_up_date = hôm nay → hiện trên PersonalDashboard?**
✅ OK — `PersonalDashboard.tsx` query leads `assigned_to = user.id`, `follow_up_date <= threeDaysLater`, order by follow_up_date. Hiển thị card "Lead cần follow-up".

---

## E. BOOKING LƯU Ý

**24. Tạo lưu ý priority='high' → banner đỏ đầu BookingDetail?**
✅ OK — `BookingDetail.tsx` line 107: `Alert variant="destructive"` khi `highNotes.length > 0`.

**25. Danh sách Bookings → icon cảnh báo cạnh booking?**
✅ OK — `Bookings.tsx` query `booking_special_notes` priority='high', hiển thị `AlertTriangle` icon.

**26. HDV (TOUR) → xem được lưu ý read-only?**
✅ OK — RLS `booking_notes_read` include `TOUR` trong `has_any_role` list. Frontend: `BookingSpecialNotesTab` chỉ hiện form thêm khi `canEditNotes` = `hasPermission("bookings.edit")`. TOUR không có `bookings.edit` → read-only.

---

## TÓM TẮT

| # | Mục | Trạng thái | Vấn đề |
|---|-----|-----------|--------|
| 1 | Lead → Kanban | ✅ | — |
| 2 | Lead → Customer | ✅ | — |
| **3** | **Booking insert** | **❌** | **Thiếu `sale_id` → Sale không thấy booking mình tạo** |
| 4 | Booking → HĐ | ✅ | — |
| **5** | **Payment → remaining** | **❌** | **booking.remaining_amount không tự cập nhật** |
| 6 | Payment → tier | ✅ | — |
| 7 | Dự toán → booking | ✅ | — |
| 8 | KT duyệt dự toán | ✅ | — |
| 9 | QT copy từ DT | ✅ | — |
| 10 | 3-lớp duyệt QT | ✅ | — |
| **11** | **Completed lock** | **❌** | **Booking completed vẫn sửa được** |
| 12 | HCNS nhập chi phí | ✅ | — |
| 13 | KT thấy tab duyệt | ✅ | — |
| 14 | KT duyệt/từ chối | ✅ | — |
| 15 | HCNS sửa rejected | ✅ | — |
| 16-18 | CEO permission override | ✅ | — |
| 19 | CEO override finance | ✅ | — |
| 20 | Birthday notification | ✅ | — |
| 21 | Bell badge | ✅ | — |
| **22** | **Click notification nav** | **⚠️** | **Lead notification navigate sai route** |
| 23 | Follow-up dashboard | ✅ | — |
| 24 | Banner lưu ý | ✅ | — |
| 25 | Icon cảnh báo | ✅ | — |
| 26 | TOUR read-only | ✅ | — |

---

## KẾ HOẠCH FIX (4 mục)

### Fix 1: BookingFormDialog — thêm sale_id (CRITICAL)
**File**: `src/components/bookings/BookingFormDialog.tsx`
- Import `useAuth` từ `@/contexts/AuthContext`
- Trong mutation insert, thêm `sale_id: user?.id` vào payload
- Đây là lỗi nghiêm trọng: Sale tạo booking nhưng RLS chặn không cho xem lại

### Fix 2: Booking remaining_amount — tạo trigger DB
**Migration SQL**: Tạo trigger trên bảng `payments` (AFTER INSERT/UPDATE/DELETE) → recalculate `bookings.remaining_amount = total_value - deposit_amount - SUM(payments.amount WHERE booking_id)`.
Hoặc đơn giản hơn: `remaining_amount = total_value - (SELECT COALESCE(SUM(amount),0) FROM payments WHERE booking_id = bookings.id)`.

### Fix 3: Lock booking khi COMPLETED
**File**: `src/pages/BookingDetail.tsx`
- Thêm `const isLocked = status === "COMPLETED" || status === "CANCELLED"`
- Disable edit buttons, form submissions khi `isLocked`
- Hiện badge "Đã đóng — không thể chỉnh sửa" cho booking completed

### Fix 4: NotificationBell — navigate theo entity_type
**File**: `src/components/NotificationBell.tsx`
- Trong `markAsRead`: check `n.entity_type`:
  - `"customer"` → `/khach-hang/${entityId}`
  - `"lead"` → `/leads` (hoặc nếu có lead detail page)
  - Default → không navigate

