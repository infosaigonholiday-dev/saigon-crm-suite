
CREATE OR REPLACE FUNCTION public.auto_update_customer_tier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _customer_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    _customer_id := OLD.booking_id;
  ELSE
    _customer_id := NEW.booking_id;
  END IF;

  IF _customer_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Get customer_id from booking
  SELECT customer_id INTO _customer_id FROM bookings WHERE id = _customer_id;

  IF _customer_id IS NOT NULL THEN
    UPDATE customers SET tier = CASE
      WHEN total_revenue >= 500000000 THEN 'Diamond'
      WHEN total_revenue >= 100000000 THEN 'Gold'
      WHEN total_revenue >= 20000000 THEN 'Silver'
      ELSE 'Mới'
    END
    WHERE id = _customer_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_tier ON payments;
CREATE TRIGGER trg_auto_tier
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW EXECUTE FUNCTION auto_update_customer_tier();
