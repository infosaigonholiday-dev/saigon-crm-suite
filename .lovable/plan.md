

## Fix 4 nút "Thêm mới" không hoạt động

Hiện tại cả 4 nút chỉ là `<Button>` không có `onClick` hay dialog nào. Cần tạo form dialog cho từng trang.

### Thay đổi

**1. Tạo `src/components/customers/CustomerFormDialog.tsx`**

Dialog form thêm khách hàng với các trường:
- `full_name` (required), `type` (required, select: CÁ NHÂN / DOANH NGHIỆP)
- `phone`, `email` (validate format), `company_name`, `address`, `tax_code`, `zalo_id`
- `segment` (select: NEW/SILVER/GOLD/DIAMOND, default NEW)
- `notes`

Submit: insert vào bảng `customers`, invalidate query `["customers"]`, toast thành công.

**2. Tạo `src/components/leads/LeadFormDialog.tsx`**

Dialog form thêm lead:
- `full_name` (required), `phone`, `email`
- `channel` (select: Facebook/Zalo/Website/Referral/Other)
- `interest_type`, `company_name`, `expected_value` (number)
- `status` default "NEW"

Submit: insert vào `leads`, invalidate `["leads"]`, toast.

**3. Tạo `src/components/bookings/BookingFormDialog.tsx`**

Dialog form tạo booking:
- `code` (required, text), `customer_id` (required, select từ danh sách customers)
- `pax_total` (number), `total_value` (number)
- `deposit_amount`, `deposit_due_at` (date), `remaining_due_at` (date)
- `status` default "PENDING"

Submit: insert vào `bookings`, invalidate `["bookings"]`, toast.

**4. Tạo `src/components/payments/PaymentFormDialog.tsx`**

Dialog form thêm thanh toán:
- `booking_id` (required, select từ danh sách bookings — hiển thị code)
- `amount` (required, number)
- `payment_type` (select: DEPOSIT/REMAINING/FULL/REFUND)
- `method` (select: BANK_TRANSFER/CASH/CARD)
- `paid_at` (date), `bank_ref_code`, `notes`

Submit: insert vào `payments`, invalidate `["payments"]`, toast.

**5. Cập nhật 4 trang chính**

| File | Thay đổi |
|------|----------|
| `src/pages/Customers.tsx` | Import `CustomerFormDialog`, thêm state `open`, nút onClick mở dialog |
| `src/pages/Leads.tsx` | Import `LeadFormDialog`, thêm state `open`, nút onClick mở dialog |
| `src/pages/Bookings.tsx` | Import `BookingFormDialog`, thêm state `open`, nút onClick mở dialog |
| `src/pages/Payments.tsx` | Import `PaymentFormDialog`, thêm state `open`, nút onClick mở dialog |

### Chi tiết kỹ thuật

- Mỗi dialog dùng `Dialog` + `DialogContent` từ shadcn, form state bằng `useState`
- Validation: required fields check trước submit, email regex, phone chỉ số
- Submit dùng `useMutation` + `useQueryClient().invalidateQueries()` để refresh danh sách
- Toast dùng `useToast` từ `@/hooks/use-toast`
- Tổng cộng 4 file mới + 4 file sửa

