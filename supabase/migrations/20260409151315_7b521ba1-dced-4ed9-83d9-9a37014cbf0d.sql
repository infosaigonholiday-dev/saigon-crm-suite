
-- Thêm cột mới cho bảng leads
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS contact_person TEXT,
  ADD COLUMN IF NOT EXISTS contact_position TEXT,
  ADD COLUMN IF NOT EXISTS company_size INTEGER,
  ADD COLUMN IF NOT EXISTS tax_code TEXT,
  ADD COLUMN IF NOT EXISTS planned_travel_date DATE,
  ADD COLUMN IF NOT EXISTS reminder_date DATE,
  ADD COLUMN IF NOT EXISTS contact_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);

-- Mở rộng status constraint (11 trạng thái pipeline)
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_status_check CHECK (status IN (
  'NEW','NO_ANSWER','CONTACTED','INTERESTED','PROFILE_SENT',
  'QUOTE_SENT','NEGOTIATING','WON','LOST','NURTURE','DORMANT'
));

-- Mở rộng channel constraint (12 kênh)
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_channel_check;
ALTER TABLE leads ADD CONSTRAINT leads_channel_check CHECK (channel IN (
  'ZALO','FB','GOOGLE','REFERRAL','WALKIN','AGENCY',
  'TRANG_VANG','GOOGLE_MAPS','COLD_CALL','EVENT','WEBSITE','OTHER'
));

-- Mở rộng interest_type (thêm INBOUND)
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_interest_type_check;
ALTER TABLE leads ADD CONSTRAINT leads_interest_type_check CHECK (
  interest_type IN ('MICE','DOMESTIC','OUTBOUND','INBOUND')
);

-- Trigger: auto set reminder_date = planned_travel_date - 60 ngày
CREATE OR REPLACE FUNCTION public.auto_set_reminder()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.planned_travel_date IS NOT NULL 
     AND (OLD IS NULL OR OLD.planned_travel_date IS NULL OR OLD.planned_travel_date != NEW.planned_travel_date) THEN
    NEW.reminder_date := NEW.planned_travel_date - INTERVAL '60 days';
    IF NEW.follow_up_date IS NULL OR NEW.follow_up_date > NEW.reminder_date THEN
      NEW.follow_up_date := NEW.reminder_date;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_auto_reminder
BEFORE INSERT OR UPDATE ON leads
FOR EACH ROW EXECUTE FUNCTION auto_set_reminder();
