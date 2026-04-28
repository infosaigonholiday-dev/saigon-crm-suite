# BÁO CÁO AUDIT 10 TEST SCENARIOS (Option B — DB + Code + RPC)

## ✅ TÓM TẮT KẾT QUẢ

| # | Module | DB/Code | RPC/Logic | Kết luận |
|---|--------|---------|-----------|----------|
| 1 | Dashboard | ✅ | ❌ `rpc_dashboard_ceo` lỗi runtime | **BUG #1** |
| 2 | Leads + Kho Data | ✅ 4 leads, 610 raw_contacts | ✅ trigger audit OK | OK |
| 3 | Customers | ✅ 6 customers | ✅ trigger tier OK | OK |
| 4 | Bookings + Payments | ⚠️ 8 bookings, 0 payments | ❌ `remaining_amount=0` sai | **BUG #2** |
| 5 | Finance Import/Copy/Recurring | ✅ table tồn tại | ❌ RLS office_expenses sai + recurring leak | **BUG #3, #4** |
| 6 | HR Payroll/Leave/Recruit | ✅ 30 payroll, 34 leave, 2 candidates | ✅ trigger notify OK | OK |
| 7 | Quotations + Tour Packages | ⚠️ 0 quotations, 0 packages | ✅ schema OK | OK (chưa có data) |
| 8 | Campaigns + Tasks | ✅ table `campaigns`+`milestones`+`tasks` | ⚠️ 0 records — chưa test thực tế | OK |
| 9 | Notifications + Push | ✅ 103 notifications, push log OK | ✅ daily-reminders 200 (escalated 2) | OK |
| 10 | Settings + Staff | ✅ 13 COMPANY keys đầy đủ trong system_config | ✅ | OK |

**Daily-reminders edge function** test thực tế: `{escalated:2, recurring_generated:0, sent:0, total_candidates:17}` → chạy bình thường.

**Push send_log**: 5 lần gần nhất đều `status:200` từ OneSignal. Push code OK; "All included players are not subscribed" là do device user chưa cho phép, KHÔNG phải lỗi code.

---

## ❌ 4 BUGS PHÁT HIỆN — CẦN FIX

### BUG #1: `rpc_dashboard_ceo` CRASH (CRITICAL)
**Triệu chứng**: ADMIN/SUPER_ADMIN/GDKD/MANAGER/DIEUHAN/KETOAN mở Dashboard → block "CEO Dashboard / Doanh thu 12 tháng" lỗi.
**Nguyên nhân**: SQL `jsonb_agg(...) ORDER BY months.m` lồng trong `GROUP BY months.m` → Postgres báo `42803: aggregate function calls cannot be nested`.
**Fix**: Bỏ `GROUP BY months.m ORDER BY months.m` ở cuối, vì `jsonb_agg(... ORDER BY ...)` đã sort. Rewrite CTE thành 1 query phẳng.

### BUG #2: `bookings.remaining_amount` luôn = 0 khi tạo booking mới
**Triệu chứng**: Tạo booking total 84.95M, deposit 49.99M → DB lưu `remaining_amount=0` (đúng phải 34.96M). Báo cáo công nợ AR sai → ACC không thấy phải thu.
**Nguyên nhân**: Trigger `update_booking_remaining_amount` chỉ chạy AFTER INSERT/UPDATE/DELETE trên `payments`. Khi tạo booking mới (chưa có payment) → không trigger → `remaining_amount` giữ default (0 hoặc NULL).
**Fix**: Thêm trigger BEFORE INSERT/UPDATE trên `bookings` set `remaining_amount = total_value - deposit_amount - sum(non-deposit payments)`. Backfill record cũ.

### BUG #3: RLS `office_expenses` chặn HCNS đọc/ghi
**Triệu chứng**: HCNS được giao "nhập nhanh chi phí HCNS" nhưng RLS chỉ cho `KETOAN` (+ admin_full_access cho ADMIN). HCNS sẽ bị 403 khi import/copy/thêm vào tab CP Văn phòng.
**Nguyên nhân**: 3 policy `office_expenses_insert/read/update` chỉ check `has_role(auth.uid(),'KETOAN')`. Tương tự `marketing_expenses` & `other_expenses`.
**Fix**: Mở rộng RLS dùng `has_any_role(auth.uid(), ARRAY['KETOAN','HCNS','HR_MANAGER','SUPER_ADMIN'])` cho cả 3 bảng.

### BUG #4: `recurring_expenses_read` `USING (true)` — thiếu scope
**Triệu chứng**: Bất kỳ user authenticated nào (vd: SALE) cũng đọc được toàn bộ chi phí định kỳ của các phòng khác.
**Nguyên nhân**: Policy SELECT `qual:true` quá lỏng.
**Fix**: Đổi thành `has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','KETOAN','HCNS','HR_MANAGER','GDKD','MANAGER'])`.

---

## 📋 KẾ HOẠCH FIX (1 migration + 0 file code)

### Migration mới
```sql
-- BUG #1: Fix rpc_dashboard_ceo (rewrite revenue_chart CTE)
CREATE OR REPLACE FUNCTION public.rpc_dashboard_ceo(p_dept_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE ... -- giữ nguyên logic, chỉ sửa block revenue_chart:
  WITH months AS (SELECT generate_series(1,12) AS m),
       agg AS (
         SELECT EXTRACT(MONTH FROM created_at)::int AS m, SUM(total_value) AS rev
         FROM bookings
         WHERE created_at >= v_start_year AND created_at < v_end_year
           AND (p_dept_id IS NULL OR department_id = p_dept_id)
         GROUP BY 1
       )
  SELECT jsonb_agg(jsonb_build_object(
    'month','T'||months.m,
    'revenue', ROUND(COALESCE(agg.rev,0)/1000000.0)
  ) ORDER BY months.m)
  INTO v_revenue_chart
  FROM months LEFT JOIN agg USING (m);
END $$;

-- BUG #2: Trigger remaining_amount khi tạo/update booking
CREATE OR REPLACE FUNCTION public.set_booking_remaining_on_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _paid numeric;
BEGIN
  SELECT COALESCE(SUM(amount),0) INTO _paid
  FROM payments
  WHERE booking_id = NEW.id AND payment_type != 'Đặt cọc';
  NEW.remaining_amount := COALESCE(NEW.total_value,0) - COALESCE(NEW.deposit_amount,0) - _paid;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_set_booking_remaining
BEFORE INSERT OR UPDATE OF total_value, deposit_amount ON bookings
FOR EACH ROW EXECUTE FUNCTION set_booking_remaining_on_change();

-- Backfill 8 record cũ
UPDATE bookings b SET remaining_amount = COALESCE(b.total_value,0) - COALESCE(b.deposit_amount,0)
  - COALESCE((SELECT SUM(amount) FROM payments WHERE booking_id=b.id AND payment_type!='Đặt cọc'),0);

-- BUG #3: Mở rộng RLS office_expenses + marketing_expenses + other_expenses
DROP POLICY IF EXISTS office_expenses_insert ON office_expenses;
DROP POLICY IF EXISTS office_expenses_read   ON office_expenses;
DROP POLICY IF EXISTS office_expenses_update ON office_expenses;
CREATE POLICY office_expenses_insert ON office_expenses FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['KETOAN','HCNS','HR_MANAGER','SUPER_ADMIN']));
CREATE POLICY office_expenses_read   ON office_expenses FOR SELECT TO authenticated
  USING      (has_any_role(auth.uid(), ARRAY['KETOAN','HCNS','HR_MANAGER','SUPER_ADMIN','GDKD','MANAGER']));
CREATE POLICY office_expenses_update ON office_expenses FOR UPDATE TO authenticated
  USING      (has_any_role(auth.uid(), ARRAY['KETOAN','HCNS','HR_MANAGER','SUPER_ADMIN']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['KETOAN','HCNS','HR_MANAGER','SUPER_ADMIN']));
-- (Lặp lại cho marketing_expenses, other_expenses)

-- BUG #4: Siết RLS recurring_expenses_read
DROP POLICY IF EXISTS recurring_expenses_read ON recurring_expenses;
CREATE POLICY recurring_expenses_read ON recurring_expenses FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','KETOAN','HCNS','HR_MANAGER','GDKD','MANAGER']));
```

### Sau migration → re-test
1. `SELECT rpc_dashboard_ceo(NULL)` → trả jsonb có `revenue_chart` 12 tháng (không lỗi).
2. `SELECT remaining_amount FROM bookings` → 8 booking đều có giá trị > 0 đúng công thức.
3. Login HCNS test insert vào `office_expenses` → không 403.
4. Login SALE test SELECT `recurring_expenses` → Postgres trả 0 hoặc empty (theo policy mới).

**Không cần sửa file TS/TSX nào** — toàn bộ là migration DB.

---

## 👉 Approve để tôi switch sang default mode và chạy migration ngay.