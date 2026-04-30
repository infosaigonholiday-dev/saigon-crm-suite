-- Backfill theo type cho noti không có entity_id
UPDATE public.notifications SET action_url = '/tai-chinh?tab=cashflow'
  WHERE action_url IS NULL AND type IN ('CASHFLOW_NEGATIVE','CASHFLOW_NEGATIVE_ALERT');

UPDATE public.notifications SET action_url = '/canh-bao'
  WHERE action_url IS NULL AND type = 'BROADCAST';

UPDATE public.notifications SET action_url = '/tai-chinh?tab=quyet-toan'
  WHERE action_url IS NULL AND type = 'BUDGET_SETTLEMENT_PENDING';

UPDATE public.notifications SET action_url = '/tai-chinh?tab=du-toan'
  WHERE action_url IS NULL AND type = 'BUDGET_ESTIMATE_PENDING';

UPDATE public.notifications SET action_url = '/thanh-toan'
  WHERE action_url IS NULL AND type IN ('PAYMENT_OVERDUE','PAYMENT_RECEIVED');

UPDATE public.notifications SET action_url = '/hop-dong'
  WHERE action_url IS NULL AND type = 'CONTRACT_EXPIRY';

UPDATE public.notifications SET action_url = '/dat-tour'
  WHERE action_url IS NULL AND type = 'TOUR_DEPARTURE';

UPDATE public.notifications SET action_url = '/canh-bao'
  WHERE action_url IS NULL AND type = 'TEST_PUSH';

-- Catch-all để không sót: noti còn lại (thường là priority thấp, action_required=false) → /canh-bao
UPDATE public.notifications SET action_url = '/canh-bao'
  WHERE action_url IS NULL AND (action_required = true OR priority IN ('high','critical'));

-- Validate constraint
ALTER TABLE public.notifications VALIDATE CONSTRAINT chk_action_url_required;