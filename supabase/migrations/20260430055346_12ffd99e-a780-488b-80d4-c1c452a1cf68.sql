-- 2A: LEAD_WON
CREATE OR REPLACE FUNCTION public.notify_lead_won()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'WON' AND (OLD.status IS NULL OR OLD.status != 'WON') THEN
    INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority, is_read)
    SELECT p.id, 'LEAD_WON',
      format('🎉 Chốt tour thành công: %s', NEW.full_name),
      format('%s đã chốt tour: %s%s%s',
        COALESCE((SELECT full_name FROM profiles WHERE id = NEW.assigned_to), 'NV'),
        NEW.full_name,
        COALESCE(' — ' || NEW.company_name, ''),
        COALESCE(' — ' || NEW.interest_type, '')),
      'lead', NEW.id, 'high', false
    FROM profiles p
    WHERE p.role IN ('GDKD', 'MANAGER', 'ADMIN', 'SUPER_ADMIN')
      AND p.is_active = true
      AND p.id IS DISTINCT FROM NEW.assigned_to;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_lead_won ON leads;
CREATE TRIGGER trg_notify_lead_won
AFTER UPDATE OF status ON leads
FOR EACH ROW
EXECUTE FUNCTION notify_lead_won();

-- 2B: PAYMENT_RECEIVED
CREATE OR REPLACE FUNCTION public.notify_payment_received()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale_id UUID;
  v_customer_name TEXT;
  v_booking_code TEXT;
BEGIN
  SELECT b.sale_id, c.full_name, b.code 
  INTO v_sale_id, v_customer_name, v_booking_code
  FROM bookings b
  LEFT JOIN customers c ON c.id = b.customer_id
  WHERE b.id = NEW.booking_id;

  IF v_sale_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority, is_read)
    VALUES (
      v_sale_id, 'PAYMENT_RECEIVED',
      format('💰 KH đã thanh toán: %s', COALESCE(v_customer_name, 'N/A')),
      format('Booking %s — Số tiền: %s đ — %s',
        COALESCE(v_booking_code, ''),
        to_char(NEW.amount, 'FM999,999,999'),
        COALESCE(NEW.method, '')),
      'payment', NEW.id, 'high', false
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_payment_received ON payments;
CREATE TRIGGER trg_notify_payment_received
AFTER INSERT ON payments
FOR EACH ROW
EXECUTE FUNCTION notify_payment_received();

-- 2C: SETTLEMENT_VARIANCE_HIGH (>15%)
CREATE OR REPLACE FUNCTION public.notify_settlement_variance_high()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pct numeric;
  v_booking_code text;
BEGIN
  IF NEW.status IN ('completed','approved','COMPLETED','APPROVED','closed','CLOSED')
     AND (OLD.status IS NULL OR OLD.status NOT IN ('completed','approved','COMPLETED','APPROVED','closed','CLOSED'))
     AND COALESCE(NEW.total_estimated,0) > 0 THEN

    v_pct := ABS(COALESCE(NEW.total_actual,0) - COALESCE(NEW.total_estimated,0)) 
             / NEW.total_estimated * 100;

    IF v_pct > 15 THEN
      SELECT code INTO v_booking_code FROM bookings WHERE id = NEW.booking_id;

      INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority, is_read)
      SELECT p.id, 'SETTLEMENT_VARIANCE_HIGH',
        format('⚠️ Quyết toán chênh lệch cao: %s', COALESCE(v_booking_code, NEW.code, '')),
        format('Chênh lệch %s%% — DT: %s đ, TT: %s đ',
          to_char(v_pct, 'FM999.9'),
          to_char(NEW.total_estimated, 'FM999,999,999,999'),
          to_char(NEW.total_actual, 'FM999,999,999,999')),
        'budget_settlement', NEW.id, 'high', false
      FROM profiles p
      WHERE p.role IN ('GDKD','ADMIN','SUPER_ADMIN','KETOAN')
        AND p.is_active = true;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_settlement_variance ON budget_settlements;
CREATE TRIGGER trg_notify_settlement_variance
AFTER UPDATE OF status ON budget_settlements
FOR EACH ROW
EXECUTE FUNCTION notify_settlement_variance_high();