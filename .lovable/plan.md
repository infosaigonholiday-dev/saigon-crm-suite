

## Tạo tab "Duyệt chi phí" cho Kế toán

### Tổng quan
Tạo component `ApprovalTab` chuyên dụng cho KETOAN/ADMIN/DIRECTOR để duyệt chi phí pending, với batch approve, filters, và badge count. Đồng thời cải thiện view HCNS để hiển thị rõ trạng thái từ chối + cho phép resubmit.

### Kế hoạch

**1. Tạo `src/components/finance/ApprovalTab.tsx`** (file mới)

- Query: `transactions` where `approval_status = 'PENDING_REVIEW'`, join `profiles` on `submitted_by` để lấy `full_name`
- Hiển thị: ngày, người nhập, danh mục, mô tả, số tiền, trạng thái
- Filter: danh mục (Select), người nhập (Select từ distinct submitters), khoảng ngày (2 input date)
- Sort: `created_at DESC`
- Checkbox chọn nhiều dòng + nút "Duyệt hàng loạt"
- Nút "Duyệt" (xanh): update `approval_status='APPROVED'`, `reviewed_by`, `reviewed_at`
- Nút "Từ chối" (đỏ): mở Dialog nhập lý do → update `approval_status='REJECTED'`, `review_note`, `reviewed_by`, `reviewed_at`
- Batch approve: dùng Promise.all update tất cả selected IDs

**2. Cập nhật `src/pages/Finance.tsx`**

- Import `ApprovalTab`
- Thêm tab "Duyệt chi phí" với badge đỏ hiển thị pending count
- Query count pending: `supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('approval_status', 'PENDING_REVIEW')`
- Tab chỉ hiện khi `isFullAccess` (ADMIN/DIRECTOR/KETOAN)

**3. Cập nhật `TransactionListTab.tsx` (submitter view)**

- Khi `submitterOnly`: record bị REJECTED hiển thị badge đỏ + `review_note` rõ ràng hơn (không truncate quá ngắn)
- Khi HCNS sửa record REJECTED và submit lại: trong `TransactionFormDialog`, nếu đang edit record có `approval_status = 'REJECTED'` → set lại thành `PENDING_REVIEW`

**4. Cập nhật `TransactionFormDialog.tsx`**

- Khi edit record có `approval_status = 'REJECTED'` bởi submitter → tự động set `approval_status = 'PENDING_REVIEW'` khi save (resubmit)

### Files thay đổi
- `src/components/finance/ApprovalTab.tsx` — mới
- `src/pages/Finance.tsx` — thêm tab + badge count
- `src/components/finance/TransactionFormDialog.tsx` — resubmit logic
- `src/components/finance/TransactionListTab.tsx` — cải thiện rejected display

