-- Fix dữ liệu vi phạm hiện tại trước khi thêm constraint
UPDATE public.bookings
SET deposit_amount = total_value
WHERE COALESCE(deposit_amount, 0) > COALESCE(total_value, 0);

-- Thêm CHECK constraint: deposit không được vượt total
ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS chk_deposit_lte_total;

ALTER TABLE public.bookings
  ADD CONSTRAINT chk_deposit_lte_total
  CHECK (COALESCE(deposit_amount, 0) <= COALESCE(total_value, 0));

-- Thêm CHECK: total và deposit không được âm, pax_total >= 0
ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS chk_total_value_non_negative;
ALTER TABLE public.bookings
  ADD CONSTRAINT chk_total_value_non_negative
  CHECK (COALESCE(total_value, 0) >= 0);

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS chk_deposit_amount_non_negative;
ALTER TABLE public.bookings
  ADD CONSTRAINT chk_deposit_amount_non_negative
  CHECK (COALESCE(deposit_amount, 0) >= 0);

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS chk_pax_total_non_negative;
ALTER TABLE public.bookings
  ADD CONSTRAINT chk_pax_total_non_negative
  CHECK (COALESCE(pax_total, 0) >= 0);