CREATE OR REPLACE FUNCTION public.generate_unique_booking_code(base TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean_base TEXT;
  candidate TEXT;
  max_suffix INT;
  next_suffix INT;
  base_pattern TEXT;
BEGIN
  clean_base := trim(base);
  IF clean_base IS NULL OR clean_base = '' THEN
    RAISE EXCEPTION 'base code không được rỗng';
  END IF;

  -- Strip suffix -NN nếu base truyền vào sẵn (vd "BK-X-02" → "BK-X")
  clean_base := regexp_replace(clean_base, '-\d{2,}$', '');

  -- Advisory lock theo hash của base, scope transaction → chống race 2 tab cùng tạo
  PERFORM pg_advisory_xact_lock(hashtext('booking_code:' || clean_base));

  -- Escape regex special chars trong base để build pattern an toàn
  base_pattern := '^' || regexp_replace(clean_base, '([.+*?^$()\[\]{}|\\])', '\\\1', 'g') || '-\d{2,}$';

  -- Tìm suffix lớn nhất hiện có
  SELECT COALESCE(MAX((regexp_match(code, '-(\d{2,})$'))[1]::INT), 0)
    INTO max_suffix
    FROM bookings
   WHERE code ~ base_pattern;

  -- Case 1: base trần chưa dùng VÀ không có biến thể -NN → trả về base
  IF max_suffix = 0 AND NOT EXISTS (SELECT 1 FROM bookings WHERE code = clean_base) THEN
    RETURN clean_base;
  END IF;

  -- Case 2: tìm suffix tiếp theo (nếu base trần đã dùng nhưng chưa có -NN, max_suffix=0 → next=1; tuy nhiên TH này hiếm và -01 cũng OK)
  next_suffix := max_suffix + 1;
  candidate := clean_base || '-' || lpad(next_suffix::TEXT, 2, '0');

  WHILE EXISTS (SELECT 1 FROM bookings WHERE code = candidate) LOOP
    next_suffix := next_suffix + 1;
    candidate := clean_base || '-' || lpad(next_suffix::TEXT, 2, '0');
  END LOOP;

  RETURN candidate;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_unique_booking_code(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_unique_booking_code(TEXT) TO authenticated;

COMMENT ON FUNCTION public.generate_unique_booking_code(TEXT) IS
'Trả về mã booking unique. Nếu base đã tồn tại, thêm hậu tố -02, -03,... Chống race bằng pg_advisory_xact_lock.';