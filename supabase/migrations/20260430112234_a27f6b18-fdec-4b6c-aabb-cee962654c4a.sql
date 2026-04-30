-- Backup
CREATE TABLE IF NOT EXISTS public.notifications_backup_20260430 AS
SELECT * FROM public.notifications;

-- Migrate giá trị priority cũ
UPDATE public.notifications SET priority = 'medium'   WHERE priority = 'normal';
UPDATE public.notifications SET priority = 'critical' WHERE priority = 'urgent';

-- Default mới
ALTER TABLE public.notifications ALTER COLUMN priority SET DEFAULT 'medium';

-- CHECK constraint priority enum
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS chk_priority_enum;
ALTER TABLE public.notifications
  ADD CONSTRAINT chk_priority_enum
  CHECK (priority IN ('low','medium','high','critical'));