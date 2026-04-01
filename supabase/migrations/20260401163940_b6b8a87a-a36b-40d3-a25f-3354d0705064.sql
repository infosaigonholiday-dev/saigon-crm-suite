
CREATE OR REPLACE FUNCTION public.update_booking_remaining_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _booking_id uuid;
  _total_payments numeric;
BEGIN
  -- Determine the booking_id from the affected row
  IF TG_OP = 'DELETE' THEN
    _booking_id := OLD.booking_id;
  ELSE
    _booking_id := NEW.booking_id;
  END IF;

  -- Skip if no booking linked
  IF _booking_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Sum all non-deposit payments for this booking
  SELECT COALESCE(SUM(amount), 0) INTO _total_payments
  FROM payments
  WHERE booking_id = _booking_id
    AND payment_type != 'Đặt cọc';

  -- Update remaining_amount = total_value - deposit_amount - other_payments
  UPDATE bookings
  SET remaining_amount = COALESCE(total_value, 0) - COALESCE(deposit_amount, 0) - _total_payments
  WHERE id = _booking_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_update_booking_remaining
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.update_booking_remaining_amount();
