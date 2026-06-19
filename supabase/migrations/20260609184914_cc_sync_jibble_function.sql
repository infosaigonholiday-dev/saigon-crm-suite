-- Migration: cc_sync_jibble_function
-- Tạo function rebuild_cc_ngay_for_range() để tổng hợp cc_ngay từ cc_su_kien.
-- Được gọi bởi edge function cc-sync-jibble sau khi upsert events.
--
-- Logic:
--   1. Với mỗi (employee_id, belongs_to_date) trong range:
--      - Tìm 'In' sớm nhất + 'Out' muộn nhất
--      - Tính tong_phut_lam = (Out - In) / 60  (nếu có cả 2)
--      - So với ca_chuan trong cc_cau_hinh (gio_vao, gio_ra, buffer) → phut_di_muon, phut_ve_som
--      - Đếm số phiên = số cặp In/Out khớp
--   2. Nếu thiếu In/Out → trang_thai = 'DU_CONG' (đủ công 1 phần) hoặc 'VANG' (không có gì)
--   3. Upsert vào cc_ngay theo UNIQUE (employee_id, ngay)
--
-- Lưu ý: KHÔNG override các ngày đã chốt tháng (cc_thang_da_chot.da_chot = true)
--         trừ khi force=true.

CREATE OR REPLACE FUNCTION public.rebuild_cc_ngay_for_range(
  p_from date,
  p_to date,
  p_force boolean DEFAULT false
)
RETURNS TABLE(employee_id uuid, ngay date, trang_thai text, tong_phut_lam integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ca jsonb;
  v_gio_vao time;
  v_gio_ra time;
  v_buffer_di_muon int;
  v_buffer_ve_som int;
  v_nguong_vang int;
BEGIN
  -- Đọc ca chuẩn
  SELECT value INTO v_ca FROM cc_cau_hinh WHERE key = 'ca_chuan';
  IF v_ca IS NULL THEN
    v_gio_vao := '08:00';
    v_gio_ra := '17:30';
    v_buffer_di_muon := 5;
    v_buffer_ve_som := 5;
    v_nguong_vang := 240;
  ELSE
    v_gio_vao := (v_ca->>'gio_vao')::time;
    v_gio_ra := (v_ca->>'gio_ra')::time;
    v_buffer_di_muon := COALESCE((v_ca->>'buffer_di_muon_phut')::int, 5);
    v_buffer_ve_som := COALESCE((v_ca->>'buffer_ve_som_phut')::int, 5);
    v_nguong_vang := COALESCE((v_ca->>'nguong_vang_phut')::int, 240);
  END IF;

  RETURN QUERY
  WITH events AS (
    -- Gom events theo (employee_id, belongs_to_date)
    SELECT
      sk.employee_id,
      sk.belongs_to_date,
      MIN(sk.thoi_diem) FILTER (WHERE sk.loai = 'In' AND sk.active) AS first_in,
      MAX(sk.thoi_diem) FILTER (WHERE sk.loai = 'Out' AND sk.active) AS last_out,
      COUNT(*) FILTER (WHERE sk.loai = 'In' AND sk.active) AS so_in,
      COUNT(*) FILTER (WHERE sk.loai = 'Out' AND sk.active) AS so_out
    FROM cc_su_kien sk
    WHERE sk.belongs_to_date BETWEEN p_from AND p_to
      AND sk.active = true
    GROUP BY sk.employee_id, sk.belongs_to_date
  ),
  computed AS (
    SELECT
      e.employee_id,
      e.belongs_to_date,
      e.first_in,
      e.last_out,
      -- so_phien = min(so_in, so_out) — số cặp In/Out khớp
      LEAST(e.so_in, e.so_out) AS so_phien,
      -- tong_phut_lam: chỉ tính nếu có cả In và Out
      CASE
        WHEN e.first_in IS NOT NULL AND e.last_out IS NOT NULL
          AND e.last_out > e.first_in
        THEN EXTRACT(EPOCH FROM (e.last_out - e.first_in))::int / 60
        ELSE 0
      END AS tong_phut_lam,
      -- phut_di_muon: In - gio_vao (chỉ trong ngày làm việc, bỏ T7/CN)
      -- first_in là timestamptz UTC; gio_vao là time. Quy đổi gio_vao → timestamptz theo VN tz.
      CASE
        WHEN e.first_in IS NOT NULL AND EXTRACT(DOW FROM e.belongs_to_date) BETWEEN 1 AND 5
        THEN GREATEST(
          0,
          EXTRACT(EPOCH FROM (
            e.first_in - ((e.belongs_to_date::timestamp + v_gio_vao) AT TIME ZONE 'Asia/Ho_Chi_Minh')
          ))::int / 60
        )
        ELSE 0
      END AS phut_di_muon_raw,
      -- phut_ve_som: gio_ra - Out
      CASE
        WHEN e.last_out IS NOT NULL AND EXTRACT(DOW FROM e.belongs_to_date) BETWEEN 1 AND 5
        THEN GREATEST(
          0,
          EXTRACT(EPOCH FROM (
            ((e.belongs_to_date::timestamp + v_gio_ra) AT TIME ZONE 'Asia/Ho_Chi_Minh') - e.last_out
          ))::int / 60
        )
        ELSE 0
      END AS phut_ve_som_raw
    FROM events e
  ),
  with_status AS (
    SELECT
      c.*,
      -- Apply buffer
      GREATEST(0, c.phut_di_muon_raw - v_buffer_di_muon) AS phut_di_muon,
      GREATEST(0, c.phut_ve_som_raw - v_buffer_ve_som) AS phut_ve_som,
      CASE
        -- Cuối tuần / lễ → không tính
        WHEN EXTRACT(DOW FROM c.belongs_to_date) IN (0, 6) THEN 'CUOI_TUAN'
        -- Có làm + đi muộn/về sớm vượt buffer
        WHEN c.first_in IS NOT NULL AND GREATEST(0, c.phut_di_muon_raw - v_buffer_di_muon) > 0
          AND c.last_out IS NULL THEN 'DI_MUON'
        WHEN c.last_out IS NOT NULL AND GREATEST(0, c.phut_ve_som_raw - v_buffer_ve_som) > 0
          AND c.first_in IS NULL THEN 'VE_SOM'
        WHEN c.first_in IS NOT NULL AND c.last_out IS NOT NULL
          AND (GREATEST(0, c.phut_di_muon_raw - v_buffer_di_muon) > 0
               OR GREATEST(0, c.phut_ve_som_raw - v_buffer_ve_som) > 0)
          THEN 'DU_CONG'
        WHEN c.first_in IS NOT NULL AND c.last_out IS NOT NULL THEN 'DU_CONG'
        -- Có In nhưng quên Out
        WHEN c.first_in IS NOT NULL AND c.last_out IS NULL THEN 'DU_CONG'
        -- Không có gì
        ELSE 'VANG'
      END AS trang_thai_final
    FROM computed c
  )
  INSERT INTO cc_ngay AS ng (
    employee_id, ngay, gio_vao_som_nhat, gio_ra_muon_nhat,
    tong_phut_lam, so_phien, trang_thai,
    phut_di_muon, phut_ve_som, updated_at
  )
  SELECT
    ws.employee_id, ws.belongs_to_date, ws.first_in, ws.last_out,
    ws.tong_phut_lam, ws.so_phien, ws.trang_thai_final,
    ws.phut_di_muon, ws.phut_ve_som, now()
  FROM with_status ws
  ON CONFLICT (employee_id, ngay) DO UPDATE SET
    gio_vao_som_nhat = EXCLUDED.gio_vao_som_nhat,
    gio_ra_muon_nhat = EXCLUDED.gio_ra_muon_nhat,
    tong_phut_lam = EXCLUDED.tong_phut_lam,
    so_phien = EXCLUDED.so_phien,
    trang_thai = EXCLUDED.trang_thai,
    phut_di_muon = EXCLUDED.phut_di_muon,
    phut_ve_som = EXCLUDED.phut_ve_som,
    updated_at = now()
  WHERE
    -- Không override ngày đã chốt tháng (trừ khi force)
    p_force = true
    OR NOT EXISTS (
      SELECT 1 FROM cc_thang_da_chot
      WHERE ky_thang = date_trunc('month', ws.belongs_to_date)::date
        AND da_chot = true
    )
  RETURNING ng.employee_id, ng.ngay, ng.trang_thai, ng.tong_phut_lam;
END;
$$;

COMMENT ON FUNCTION public.rebuild_cc_ngay_for_range(date, date, boolean) IS
  'Tổng hợp cc_ngay từ cc_su_kien trong khoảng [p_from, p_to]. '
  'Đọc ca chuẩn từ cc_cau_hinh.key=ca_chuan. '
  'Không override ngày đã chốt tháng (cc_thang_da_chot.da_chot=true) trừ khi p_force=true.';

-- Grant quyền gọi cho service_role (edge function) + authenticated
GRANT EXECUTE ON FUNCTION public.rebuild_cc_ngay_for_range(date, date, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.rebuild_cc_ngay_for_range(date, date, boolean) TO authenticated;
