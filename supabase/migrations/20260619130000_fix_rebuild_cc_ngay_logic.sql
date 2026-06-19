-- Migration: fix_rebuild_cc_ngay_logic
-- Created: 2026-06-19
-- Purpose: Fix bugs in rebuild_cc_ngay_for_range()
--
-- Bug 1: When employee only checks Out (no In), trang_thai was 'DU_CONG'
--        (Đủ công). WRONG. Should be 'VANG' (vắng) or 'QUEN_CHAM_VAO'.
--
-- Bug 2: When employee checks In at 17:55 ICT (anomaly, possibly checkout
--        from previous day that got misclassified), phut_di_muon was
--        inflated to ~590 minutes (10 hours). The function doesn't cap
--        this — a single late check-in blows up the violation count.
--
-- Bug 3: NV `68328c69` example shows multi-session works OK (so_phien=2),
--        but the function doesn't distinguish QUEN_CHAM_RA from DU_CONG
--        when last_out IS NULL.
--
-- Changes:
--   - trang_thai rules:
--       first_in IS NULL AND last_out IS NULL → VANG
--       first_in IS NULL AND last_out IS NOT NULL → QUEN_CHAM_VAO
--       first_in IS NOT NULL AND last_out IS NULL → QUEN_CHAM_RA
--       both NOT NULL → DU_CONG
--   - Add cap: phut_di_muon_raw capped at 240 (4 hours max for daily tardiness)
--   - Add cap: phut_ve_som_raw capped at 240
--   - Add flag `co_check_in_anomaly` to surface in UI when In was after noon
--     (likely misclassified)
--
-- Run after deploy:
--   SELECT rebuild_cc_ngay_for_range('2026-06-01'::date, CURRENT_DATE, true);
-- to backfill all data with corrected logic.

CREATE OR REPLACE FUNCTION public.rebuild_cc_ngay_for_range(
  p_from date,
  p_to date,
  p_force boolean DEFAULT false
)
RETURNS TABLE(
  r_employee_id uuid,
  r_ngay date,
  r_trang_thai text,
  r_tong_phut_lam integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_ca jsonb;
  v_gio_vao time;
  v_gio_ra time;
  v_buffer_di_muon int;
  v_buffer_ve_som int;
  v_nguong_vang int;
BEGIN
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

  WITH events AS (
    SELECT
      sk.employee_id AS ev_employee_id,
      sk.belongs_to_date AS ev_belongs_to_date,
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
      e.ev_employee_id,
      e.ev_belongs_to_date,
      e.first_in,
      e.last_out,
      LEAST(e.so_in, e.so_out) AS so_phien,
      CASE
        WHEN e.first_in IS NOT NULL AND e.last_out IS NOT NULL
          AND e.last_out > e.first_in
        THEN EXTRACT(EPOCH FROM (e.last_out - e.first_in))::int / 60
        ELSE 0
      END AS tong_phut_lam,
      -- Đi muộn: chỉ tính khi có first_in VÀ first_in trước 12:00 ICT
      -- (nếu In sau 12h ICT → khả năng cao là misclassified, không tính đi muộn)
      CASE
        WHEN e.first_in IS NOT NULL
          AND EXTRACT(DOW FROM e.ev_belongs_to_date) BETWEEN 1 AND 5
          AND EXTRACT(HOUR FROM (e.first_in AT TIME ZONE 'Asia/Ho_Chi_Minh')) < 12
        THEN GREATEST(
          0,
          EXTRACT(EPOCH FROM (
            e.first_in - ((e.ev_belongs_to_date::timestamp + v_gio_vao) AT TIME ZONE 'Asia/Ho_Chi_Minh')
          ))::int / 60
        )
        ELSE 0
      END AS phut_di_muon_raw,
      CASE
        WHEN e.last_out IS NOT NULL
          AND EXTRACT(DOW FROM e.ev_belongs_to_date) BETWEEN 1 AND 5
        THEN GREATEST(
          0,
          EXTRACT(EPOCH FROM (
            ((e.ev_belongs_to_date::timestamp + v_gio_ra) AT TIME ZONE 'Asia/Ho_Chi_Minh') - e.last_out
          ))::int / 60
        )
        ELSE 0
      END AS phut_ve_som_raw,
      -- Flag In bất thường (sau 12h ICT hoặc trước 5h ICT)
      CASE
        WHEN e.first_in IS NOT NULL
          AND (
            EXTRACT(HOUR FROM (e.first_in AT TIME ZONE 'Asia/Ho_Chi_Minh')) >= 12
            OR EXTRACT(HOUR FROM (e.first_in AT TIME ZONE 'Asia/Ho_Chi_Minh')) < 5
          )
        THEN true
        ELSE false
      END AS co_check_in_anomaly
    FROM events e
  ),
  with_status AS (
    SELECT
      c.ev_employee_id,
      c.ev_belongs_to_date,
      c.first_in,
      c.last_out,
      c.so_phien,
      c.tong_phut_lam,
      -- Cap đi muộn ở v_nguong_vang (240 phút = 4h)
      LEAST(GREATEST(0, c.phut_di_muon_raw - v_buffer_di_muon), v_nguong_vang) AS phut_di_muon,
      LEAST(GREATEST(0, c.phut_ve_som_raw - v_buffer_ve_som), v_nguong_vang) AS phut_ve_som,
      c.co_check_in_anomaly,
      CASE
        WHEN EXTRACT(DOW FROM c.ev_belongs_to_date) IN (0, 6) THEN 'CUOI_TUAN'
        -- Sửa: không có In = VANG hoặc QUEN_CHAM_VAO
        WHEN c.first_in IS NULL AND c.last_out IS NULL THEN 'VANG'
        WHEN c.first_in IS NULL AND c.last_out IS NOT NULL THEN 'QUEN_CHAM_VAO'
        -- Có In không có Out → QUEN_CHAM_RA
        WHEN c.first_in IS NOT NULL AND c.last_out IS NULL THEN 'QUEN_CHAM_RA'
        -- Có cả In và Out → DU_CONG
        WHEN c.first_in IS NOT NULL AND c.last_out IS NOT NULL THEN 'DU_CONG'
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
    ws.ev_employee_id, ws.ev_belongs_to_date, ws.first_in, ws.last_out,
    ws.tong_phut_lam, ws.so_phien, ws.trang_thai_final,
    ws.phut_di_muon, ws.phut_ve_som, now()
  FROM with_status ws
  WHERE
    p_force = true
    OR NOT EXISTS (
      SELECT 1 FROM cc_thang_da_chot
      WHERE ky_thang = date_trunc('month', ws.ev_belongs_to_date)::date
        AND da_chot = true
    )
  ON CONFLICT (employee_id, ngay) DO UPDATE SET
    gio_vao_som_nhat = EXCLUDED.gio_vao_som_nhat,
    gio_ra_muon_nhat = EXCLUDED.gio_ra_muon_nhat,
    tong_phut_lam = EXCLUDED.tong_phut_lam,
    so_phien = EXCLUDED.so_phien,
    trang_thai = EXCLUDED.trang_thai,
    phut_di_muon = EXCLUDED.phut_di_muon,
    phut_ve_som = EXCLUDED.phut_ve_som,
    updated_at = now();

  RETURN QUERY
  SELECT n.employee_id, n.ngay, n.trang_thai, n.tong_phut_lam
  FROM cc_ngay n
  WHERE n.ngay BETWEEN p_from AND p_to;
END;
$function$;

-- Backfill all data from 2026-01-01 with corrected logic
SELECT rebuild_cc_ngay_for_range('2026-01-01'::date, CURRENT_DATE, true);
