## Fix 2 điểm nhỏ Dashboard CEO

### 1. Link tab Tài chính (CeoFinanceAlerts.tsx)

Finance.tsx hiện dùng `<Tabs defaultValue="overview">` với các value tiếng Anh (`debt`, `approval`, `estimates`, `settlements`...). **Chưa có** logic đọc `useSearchParams`. Cần làm cả 2 việc:

**A. Cập nhật 3 link trong `CeoFinanceAlerts.tsx`** — dùng đúng tab value của Finance.tsx (không phải slug tiếng Việt):
- Công nợ quá hạn (`FinanceOverdueAR`, line 58): `/tai-chinh` → `/tai-chinh?tab=debt`
- Chi phí chờ duyệt (`FinancePendingExpenses`, line 108 + line 121 ở từng row): `/tai-chinh` → `/tai-chinh?tab=approval`
- Dự toán/QT chờ (`FinancePendingBudgets`, line 176 + line 189 ở từng row): `/tai-chinh` → `/tai-chinh?tab=estimates`

**B. Thêm logic đọc query param trong `Finance.tsx`**:
- Import `useSearchParams` từ `react-router-dom`
- Whitelist các tab hợp lệ: `["overview","hr-approval","approval","cashbook","estimates","settlements","revenue","profit","cashflow","tax","debt","salary","office","marketing","other","opex"]`
- `const tabParam = searchParams.get("tab"); const activeTab = whitelist.includes(tabParam) ? tabParam : "overview";`
- Đổi `<Tabs defaultValue="overview">` thành `<Tabs value={activeTab} onValueChange={(v) => setSearchParams({ tab: v })}>` để URL ↔ tab đồng bộ 2 chiều
- Áp dụng cho main `Tabs` block (chỉ block Admin/Kế toán full view — submitter/manager view không có tabs nên bỏ qua)

### 2. Outflow logic (CeoScorecard.tsx, line 56–73)

Đơn giản hóa logic `outflow`:

**Trước:**
```typescript
const outflow = (txs || [])
  .filter((t: any) => (t.type || "").toUpperCase().includes("EXPENSE") || t.type === "OUT")
  .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
const outflowFinal = outflow > 0 ? outflow : (txs || []).reduce(...);
```

**Sau:**
```typescript
// Transactions trong hệ thống đều là chi phí; thu nằm ở payments
const outflow = (txs || []).reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
```

Cũng:
- Bỏ field `type` khỏi `.select()` (không còn dùng)
- Đổi `outflowFinal` → `outflow` ở `return` block và `cashflow: inflow - outflow`

### 3. Verify sau fix

- Click "Xem" ở 3 widget Finance → URL có `?tab=debt|approval|estimates`
- Mở `/tai-chinh?tab=debt` trực tiếp → tab "Công nợ" được active sẵn
- Click sang tab khác → URL update theo (`onValueChange` ghi lại param)
- Scorecard "Dòng tiền tháng": Thu = sum(payments.amount), Chi = sum(approved transactions.amount), không còn fallback phức tạp

### Files thay đổi
- `src/components/dashboard/CeoFinanceAlerts.tsx` — sửa 5 link `to`
- `src/pages/Finance.tsx` — thêm `useSearchParams` + đổi `Tabs` sang controlled
- `src/components/dashboard/CeoScorecard.tsx` — đơn giản hóa outflow
