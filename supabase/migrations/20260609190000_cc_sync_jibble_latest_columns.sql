-- Migration: cc_sync_jibble_latest_columns
-- Thêm 2 cột vào cc_nhan_vien_map để lưu snapshot từ Jibble PersonDetails:
--   - latest_jibble_time: timestamp chấm công gần nhất (từ PersonDetails.latestTimeEntryTime)
--   - jibble_status: status hiện tại trên Jibble (Active/NotInvited/Invited/...)
--
-- Lý do: Workspace API của SGH không trả time entries (404 TimeEntries, 403 DataSync).
-- Chỉ có PersonDetails trả được. Tạm thời dùng 1 timestamp duy nhất làm proxy.
-- Khi Jibble cấp scope, có thể giữ cột này để audit.

ALTER TABLE public.cc_nhan_vien_map
  ADD COLUMN IF NOT EXISTS latest_jibble_time timestamptz NULL,
  ADD COLUMN IF NOT EXISTS jibble_status text NULL;

COMMENT ON COLUMN public.cc_nhan_vien_map.latest_jibble_time IS
  'Snapshot từ PersonDetails.latestTimeEntryTime — lần chấm công gần nhất trên Jibble. '
  'Cập nhật bởi edge function cc-sync-jibble. Khi Jibble cấp scope time entries, giữ để audit.';

COMMENT ON COLUMN public.cc_nhan_vien_map.jibble_status IS
  'Status hiện tại trên Jibble (Active/NotInvited/Invited/...). Cập nhật mỗi sync. '
  'Khác với status nội bộ (PENDING/INVITED/JOINED/FAILED).';
