DO $$
DECLARE v_bid uuid; v_user uuid; v_payid uuid;
BEGIN
  SELECT id INTO v_bid FROM bookings WHERE sale_id IS NOT NULL LIMIT 1;
  SELECT id INTO v_user FROM profiles WHERE is_active=true LIMIT 1;
  INSERT INTO payments (booking_id, amount, method, paid_at, payment_type, currency, received_by, created_by)
  VALUES (v_bid, 5000000, 'BANK_TRANSFER', now(), 'DEPOSIT', 'VND', v_user, v_user)
  RETURNING id INTO v_payid;
  DELETE FROM payments WHERE id = v_payid;
END $$;