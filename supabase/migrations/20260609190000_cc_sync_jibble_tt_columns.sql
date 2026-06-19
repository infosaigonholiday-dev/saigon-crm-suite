-- Migration: cc_sync_jibble_tt_person_id
-- Thêm cột jibble_tt_person_id (time-tracking service personId, KHÁC với workspace personId)
-- để map entries từ time-tracking.prod.jibble.io sang employee nội bộ.

ALTER TABLE public.cc_nhan_vien_map
  ADD COLUMN IF NOT EXISTS jibble_tt_person_id text NULL,
  ADD COLUMN IF NOT EXISTS jibble_tt_status text NULL,
  ADD COLUMN IF NOT EXISTS jibble_tt_full_name text NULL;

COMMENT ON COLUMN public.cc_nhan_vien_map.jibble_tt_person_id IS
  'Person ID từ time-tracking.prod.jibble.io service (KHÁC với jibble_person_id của workspace). '
  'Map qua email vì 2 service dùng 2 ID khác nhau cho cùng 1 người.';

COMMENT ON COLUMN public.cc_nhan_vien_map.jibble_tt_status IS
  'Status từ time-tracking service (Active/NotInvited/Joined/Removed).';
