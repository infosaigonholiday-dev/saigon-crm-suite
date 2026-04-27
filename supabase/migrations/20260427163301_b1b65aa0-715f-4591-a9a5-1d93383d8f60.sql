-- 1. accounts_receivable trigger
CREATE OR REPLACE FUNCTION public.sync_accounts_receivable()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_remaining numeric;
  v_paid numeric;
  v_due date;
BEGIN
  DELETE FROM accounts_receivable WHERE booking_id = NEW.id;
  v_remaining := COALESCE(NEW.remaining_amount, COALESCE(NEW.total_value,0) - COALESCE(NEW.deposit_amount,0), 0);
  v_paid := COALESCE(NEW.total_value,0) - v_remaining;
  v_due := COALESCE(NEW.remaining_due_at, NEW.deposit_due_at, (now() + interval '30 days')::date);
  IF v_remaining > 0 AND COALESCE(NEW.status,'') NOT IN ('cancelled','CANCELLED') THEN
    INSERT INTO accounts_receivable (
      customer_id, booking_id, amount_due, amount_paid, amount_remaining,
      due_date, status, created_at
    ) VALUES (
      NEW.customer_id, NEW.id, COALESCE(NEW.total_value, 0), v_paid, v_remaining, v_due,
      CASE WHEN v_due < CURRENT_DATE THEN 'overdue' ELSE 'pending' END, now()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_ar ON public.bookings;
CREATE TRIGGER trg_sync_ar
AFTER INSERT OR UPDATE OF total_value, deposit_amount, remaining_amount, remaining_due_at, deposit_due_at, customer_id, status
ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.sync_accounts_receivable();

-- 2. revenue_records monthly aggregation (source_type must be in allowed list)
CREATE OR REPLACE FUNCTION public.generate_monthly_revenue(p_year INT, p_month INT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_start date := make_date(p_year, p_month, 1);
  v_end date := (v_start + interval '1 month')::date;
  v_count int;
BEGIN
  DELETE FROM revenue_records WHERE year = p_year AND month = p_month;

  INSERT INTO revenue_records (
    year, month, department_id, source_type,
    gross_revenue, refunds, net_revenue,
    tour_count, booking_count, avg_deal_size, created_at
  )
  SELECT
    p_year, p_month, b.department_id, 'OTHER',
    COALESCE(SUM(b.total_value), 0),
    0,
    COALESCE(SUM(b.total_value), 0),
    COUNT(*),
    COUNT(*),
    CASE WHEN COUNT(*) > 0 THEN ROUND(COALESCE(SUM(b.total_value),0)/COUNT(*),0) ELSE 0 END,
    now()
  FROM bookings b
  WHERE b.created_at >= v_start AND b.created_at < v_end
    AND COALESCE(b.status,'') NOT IN ('cancelled','CANCELLED')
  GROUP BY b.department_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count = 0 THEN
    INSERT INTO revenue_records (
      year, month, source_type, gross_revenue, refunds, net_revenue,
      tour_count, booking_count, avg_deal_size, created_at
    ) VALUES (p_year, p_month, 'OTHER', 0, 0, 0, 0, 0, 0, now());
  END IF;
END;
$$;

-- 3. cashflow_monthly
CREATE OR REPLACE FUNCTION public.generate_monthly_cashflow(p_year INT, p_month INT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_start date := make_date(p_year, p_month, 1);
  v_end date := (v_start + interval '1 month')::date;
  v_in_dep numeric := 0; v_in_rem numeric := 0; v_in_other numeric := 0; v_out numeric := 0;
BEGIN
  DELETE FROM cashflow_monthly WHERE year = p_year AND month = p_month;
  SELECT
    COALESCE(SUM(amount) FILTER (WHERE payment_type = 'Đặt cọc'), 0),
    COALESCE(SUM(amount) FILTER (WHERE payment_type = 'Thanh toán cuối'), 0),
    COALESCE(SUM(amount) FILTER (WHERE payment_type NOT IN ('Đặt cọc','Thanh toán cuối') OR payment_type IS NULL), 0)
  INTO v_in_dep, v_in_rem, v_in_other
  FROM payments WHERE created_at >= v_start AND created_at < v_end;

  SELECT COALESCE(SUM(amount), 0) INTO v_out
  FROM transactions WHERE created_at >= v_start AND created_at < v_end
    AND COALESCE(approval_status,'APPROVED') = 'APPROVED';

  INSERT INTO cashflow_monthly (
    year, month, opening_balance,
    inflow_deposits, inflow_remaining, inflow_other, total_inflow,
    outflow_suppliers, outflow_salary, outflow_commission, outflow_office, outflow_tax, outflow_other, total_outflow,
    net_cashflow, closing_balance
  ) VALUES (
    p_year, p_month, 0,
    v_in_dep, v_in_rem, v_in_other, v_in_dep + v_in_rem + v_in_other,
    0, 0, 0, 0, 0, v_out, v_out,
    (v_in_dep + v_in_rem + v_in_other) - v_out,
    (v_in_dep + v_in_rem + v_in_other) - v_out
  );
END;
$$;

-- 4. profit_loss_monthly
CREATE OR REPLACE FUNCTION public.generate_monthly_profit(p_year INT, p_month INT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_start date := make_date(p_year, p_month, 1);
  v_end date := (v_start + interval '1 month')::date;
  v_revenue numeric := 0; v_cogs numeric := 0; v_opex numeric := 0;
  v_gross numeric; v_net numeric;
BEGIN
  DELETE FROM profit_loss_monthly WHERE year = p_year AND month = p_month;
  SELECT COALESCE(SUM(total_value), 0) INTO v_revenue
  FROM bookings WHERE created_at >= v_start AND created_at < v_end
    AND COALESCE(status,'') NOT IN ('cancelled','CANCELLED');
  SELECT COALESCE(SUM(total_actual), 0) INTO v_cogs
  FROM budget_settlements WHERE created_at >= v_start AND created_at < v_end AND status = 'closed';
  SELECT COALESCE(SUM(amount), 0) INTO v_opex
  FROM transactions WHERE created_at >= v_start AND created_at < v_end
    AND COALESCE(approval_status,'APPROVED') = 'APPROVED';
  v_gross := v_revenue - v_cogs;
  v_net := v_gross - v_opex;
  INSERT INTO profit_loss_monthly (
    year, month, gross_revenue, tour_direct_cost, gross_profit, gross_margin_pct,
    salary_cost, commission_cost, marketing_cost, office_cost, other_cost, total_opex,
    ebitda, tax_amount, net_profit, net_margin_pct, generated_at
  ) VALUES (
    p_year, p_month, v_revenue, v_cogs, v_gross,
    CASE WHEN v_revenue > 0 THEN ROUND(v_gross / v_revenue * 100, 2) ELSE 0 END,
    0, 0, 0, 0, v_opex, v_opex, v_net, 0, v_net,
    CASE WHEN v_revenue > 0 THEN ROUND(v_net / v_revenue * 100, 2) ELSE 0 END,
    now()
  );
END;
$$;

-- 5. commission_records trigger
CREATE OR REPLACE FUNCTION public.sync_commission_on_booking()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_emp_id uuid; v_dept_id uuid; v_rate numeric;
BEGIN
  IF COALESCE(NEW.status,'') NOT IN ('confirmed','completed','WON','CONFIRMED','COMPLETED') THEN RETURN NEW; END IF;
  IF COALESCE(OLD.status,'') = COALESCE(NEW.status,'') THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM commission_records WHERE booking_id = NEW.id) THEN RETURN NEW; END IF;
  IF NEW.sale_id IS NULL THEN RETURN NEW; END IF;

  SELECT id, department_id INTO v_emp_id, v_dept_id FROM employees WHERE profile_id = NEW.sale_id LIMIT 1;
  IF v_emp_id IS NULL THEN RETURN NEW; END IF;

  SELECT base_percent INTO v_rate FROM commission_rules
  WHERE department_id = v_dept_id AND (effective_from IS NULL OR effective_from <= CURRENT_DATE)
  ORDER BY effective_from DESC NULLS LAST LIMIT 1;
  v_rate := COALESCE(v_rate, 5);

  INSERT INTO commission_records (
    employee_id, booking_id, month, year, revenue_base, profit_base,
    commission_rate, commission_amount, status, created_at
  ) VALUES (
    v_emp_id, NEW.id,
    EXTRACT(MONTH FROM COALESCE(NEW.created_at, now()))::int,
    EXTRACT(YEAR  FROM COALESCE(NEW.created_at, now()))::int,
    COALESCE(NEW.total_value, 0), 0, v_rate,
    ROUND(COALESCE(NEW.total_value, 0) * v_rate / 100, 0),
    'pending', now()
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_commission_booking ON public.bookings;
CREATE TRIGGER trg_commission_booking
AFTER UPDATE OF status ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.sync_commission_on_booking();

-- 6. Backfill AR
INSERT INTO accounts_receivable (
  customer_id, booking_id, amount_due, amount_paid, amount_remaining, due_date, status, created_at
)
SELECT
  b.customer_id, b.id, COALESCE(b.total_value, 0),
  COALESCE(b.total_value, 0) - COALESCE(b.remaining_amount, COALESCE(b.total_value,0) - COALESCE(b.deposit_amount,0), 0),
  COALESCE(b.remaining_amount, COALESCE(b.total_value,0) - COALESCE(b.deposit_amount,0), 0),
  COALESCE(b.remaining_due_at, b.deposit_due_at, (now() + interval '30 days')::date),
  CASE WHEN COALESCE(b.remaining_due_at, b.deposit_due_at, (now()+interval '30 days')::date) < CURRENT_DATE
       THEN 'overdue' ELSE 'pending' END, now()
FROM bookings b
WHERE COALESCE(b.remaining_amount, COALESCE(b.total_value,0) - COALESCE(b.deposit_amount,0), 0) > 0
  AND COALESCE(b.status,'') NOT IN ('cancelled','CANCELLED')
  AND NOT EXISTS (SELECT 1 FROM accounts_receivable a WHERE a.booking_id = b.id);

-- 7. Backfill 4 months 2026
SELECT public.generate_monthly_revenue(2026, 1);
SELECT public.generate_monthly_revenue(2026, 2);
SELECT public.generate_monthly_revenue(2026, 3);
SELECT public.generate_monthly_revenue(2026, 4);
SELECT public.generate_monthly_cashflow(2026, 1);
SELECT public.generate_monthly_cashflow(2026, 2);
SELECT public.generate_monthly_cashflow(2026, 3);
SELECT public.generate_monthly_cashflow(2026, 4);
SELECT public.generate_monthly_profit(2026, 1);
SELECT public.generate_monthly_profit(2026, 2);
SELECT public.generate_monthly_profit(2026, 3);
SELECT public.generate_monthly_profit(2026, 4);