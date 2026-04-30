-- TEST 1A: LEAD_ASSIGNED — đổi assigned_to lead Yuqing Li
UPDATE leads SET assigned_to = '2937bb9c-48d1-4e0d-948c-d945fe8fcd39' 
WHERE id = '8b1adae0-b540-47a0-8b5c-4781365801b1';

-- TEST 2A: LEAD_WON — đổi status sang WON 
UPDATE leads SET status = 'WON' WHERE id = 'ba14967c-2613-4120-bd41-4940846cf237';

-- TEST 1C: QUOTATION_SENT — chỉ test nếu có quotation draft
DO $$
DECLARE v_qid uuid;
BEGIN
  SELECT id INTO v_qid FROM quotations WHERE status NOT IN ('SENT','sent') LIMIT 1;
  IF v_qid IS NOT NULL THEN
    UPDATE quotations SET status = 'SENT' WHERE id = v_qid;
    -- rollback
    UPDATE quotations SET status = 'DRAFT' WHERE id = v_qid;
  END IF;
END $$;

-- TEST 2B: PAYMENT_RECEIVED — insert 1 payment test
DO $$
DECLARE v_bid uuid; v_acc uuid; v_payid uuid;
BEGIN
  SELECT id INTO v_bid FROM bookings WHERE sale_id IS NOT NULL LIMIT 1;
  SELECT id INTO v_acc FROM profiles WHERE role = 'KETOAN' AND is_active=true LIMIT 1;
  IF v_bid IS NOT NULL AND v_acc IS NOT NULL THEN
    INSERT INTO payments (booking_id, amount, method, paid_at, payment_type, currency, received_by, created_by)
    VALUES (v_bid, 5000000, 'BANK_TRANSFER', now(), 'DEPOSIT', 'VND', v_acc, v_acc)
    RETURNING id INTO v_payid;
    -- rollback payment ngay sau khi trigger chạy
    DELETE FROM payments WHERE id = v_payid;
  END IF;
END $$;

-- ROLLBACK lead status
UPDATE leads SET status = 'NEW' WHERE id = 'ba14967c-2613-4120-bd41-4940846cf237';