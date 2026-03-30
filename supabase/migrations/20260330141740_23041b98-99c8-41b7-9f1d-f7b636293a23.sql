-- Add missing columns
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS total_paid numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS first_booking_date date;

-- Function: update customer stats when booking changes
CREATE OR REPLACE FUNCTION public.update_customer_booking_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _customer_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    _customer_id := OLD.customer_id;
  ELSE
    _customer_id := NEW.customer_id;
  END IF;

  IF _customer_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  UPDATE customers SET
    total_bookings = COALESCE((SELECT count(*) FROM bookings WHERE customer_id = _customer_id), 0),
    total_revenue = COALESCE((SELECT sum(total_value) FROM bookings WHERE customer_id = _customer_id), 0),
    last_booking_date = (SELECT max(created_at)::date FROM bookings WHERE customer_id = _customer_id),
    first_booking_date = (SELECT min(created_at)::date FROM bookings WHERE customer_id = _customer_id)
  WHERE id = _customer_id;

  IF TG_OP = 'UPDATE' AND OLD.customer_id IS DISTINCT FROM NEW.customer_id AND OLD.customer_id IS NOT NULL THEN
    UPDATE customers SET
      total_bookings = COALESCE((SELECT count(*) FROM bookings WHERE customer_id = OLD.customer_id), 0),
      total_revenue = COALESCE((SELECT sum(total_value) FROM bookings WHERE customer_id = OLD.customer_id), 0),
      last_booking_date = (SELECT max(created_at)::date FROM bookings WHERE customer_id = OLD.customer_id),
      first_booking_date = (SELECT min(created_at)::date FROM bookings WHERE customer_id = OLD.customer_id)
    WHERE id = OLD.customer_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Function: update customer total_paid when payment changes
CREATE OR REPLACE FUNCTION public.update_customer_payment_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _booking_id uuid;
  _customer_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    _booking_id := OLD.booking_id;
  ELSE
    _booking_id := NEW.booking_id;
  END IF;

  IF _booking_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT customer_id INTO _customer_id FROM bookings WHERE id = _booking_id;

  IF _customer_id IS NOT NULL THEN
    UPDATE customers SET
      total_paid = COALESCE((
        SELECT sum(p.amount) FROM payments p
        JOIN bookings b ON b.id = p.booking_id
        WHERE b.customer_id = _customer_id
      ), 0)
    WHERE id = _customer_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers
CREATE TRIGGER trg_booking_customer_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_customer_booking_stats();

CREATE TRIGGER trg_payment_customer_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_customer_payment_stats();

-- Backfill existing data
UPDATE customers c SET
  total_bookings = COALESCE(s.cnt, 0),
  total_revenue = COALESCE(s.rev, 0),
  last_booking_date = s.last_dt,
  first_booking_date = s.first_dt
FROM (
  SELECT customer_id,
    count(*) as cnt,
    sum(total_value) as rev,
    max(created_at)::date as last_dt,
    min(created_at)::date as first_dt
  FROM bookings
  WHERE customer_id IS NOT NULL
  GROUP BY customer_id
) s
WHERE c.id = s.customer_id;

UPDATE customers c SET
  total_paid = COALESCE(s.paid, 0)
FROM (
  SELECT b.customer_id, sum(p.amount) as paid
  FROM payments p
  JOIN bookings b ON b.id = p.booking_id
  WHERE b.customer_id IS NOT NULL
  GROUP BY b.customer_id
) s
WHERE c.id = s.customer_id;