

## Luồng Quyết toán sau tour

### Tổng quan
Thêm luồng quyết toán 3 bước (Điều hành → Kế toán → CEO) vào module Tài chính. Tạo từ dự toán đã giải ngân, so sánh dự toán vs thực chi, tự động tính hoàn ứng/chi bù, và đóng booking khi CEO duyệt.

### Kế hoạch thực hiện

**1. Migration SQL** — Tạo bảng `budget_settlements` và `settlement_items`

- `budget_settlements`: code (QT-YYYY-NNNN), status 6 bước (draft → pending_accountant → accountant_approved → pending_ceo → ceo_approved → closed), generated columns cho variance/refund/additional
- `settlement_items`: so sánh estimated vs actual, có receipt_url
- Sequence `budget_settlement_seq` + trigger `generate_settlement_code` (pattern giống estimate)
- Trigger `update_settlement_total` cập nhật `total_actual` khi items thay đổi
- Trigger `update_variance_pct` tính % chênh lệch
- RLS: DIEUHAN tạo, KETOAN/DIRECTOR/ADMIN duyệt, đọc theo created_by hoặc role

**2. Component `BudgetSettlementsTab.tsx`** — Tab "Quyết toán" mới

Theo pattern `BudgetEstimatesTab.tsx`:

- **Danh sách**: bảng settlements với filter trạng thái, 6 status badge màu
- **Tạo quyết toán**: chọn từ estimates đã giải ngân (status=disbursed) → copy items sang settlement_items với estimated_amount, nhập actual_amount + receipt_url
- **Bảng so sánh**: Hạng mục | Dự toán | Thực chi | Chênh lệch | % — highlight đỏ nếu > 10%
- **Tự động tính**: hoàn ứng (advance - actual nếu dương), chi bù (actual - advance nếu dương)
- **Banner cảnh báo**: variance_pct > 10% → banner đỏ "Chênh lệch vượt 10%"
- **Luồng duyệt**:
  - Điều hành: nút "Gửi KT duyệt" → status=pending_accountant
  - Kế toán (KETOAN): nút "Duyệt KT" → status=pending_ceo
  - CEO (DIRECTOR/ADMIN): nút "Duyệt & Đóng" → status=closed + UPDATE bookings.status='COMPLETED'

**3. Tích hợp Finance.tsx**

- Thêm tab "Quyết toán" vào TabsList (grid-cols-9)
- Import và render `BudgetSettlementsTab`

### Chi tiết kỹ thuật

- Trigger functions dùng `SECURITY DEFINER` + `SET search_path TO 'public'`
- Generated columns: `variance`, `refund_amount`, `additional_amount` dùng `GENERATED ALWAYS AS ... STORED`
- `variance_pct` tính bằng trigger (vì cần chia cho total_estimated, không immutable)
- Khi closed: mutation gọi thêm `supabase.from("bookings").update({ status: "COMPLETED" })`
- Estimate status cập nhật thành 'settled' khi tạo quyết toán

### Files thay đổi
- Migration SQL mới (budget_settlements, settlement_items, triggers, RLS)
- `src/components/finance/BudgetSettlementsTab.tsx` (mới)
- `src/pages/Finance.tsx` (thêm tab)
- `src/integrations/supabase/types.ts` (tự động cập nhật)

