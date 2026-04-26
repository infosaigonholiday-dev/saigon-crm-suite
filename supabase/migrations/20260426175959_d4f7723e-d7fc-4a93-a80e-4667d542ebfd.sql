INSERT INTO public.notifications (user_id, type, title, message, entity_type, priority, is_read) VALUES
('21587d06-9c1e-47c2-aa78-f7daadea4ddb','payment_overdue','⏰ TEST: Thanh toán quá hạn','Test push payment_overdue','booking','high',false),
('21587d06-9c1e-47c2-aa78-f7daadea4ddb','contract_expiry','📄 TEST: HĐ sắp hết hạn','Test push contract_expiry','contract','high',false),
('21587d06-9c1e-47c2-aa78-f7daadea4ddb','tour_departure','✈️ TEST: Tour khởi hành','Test push tour_departure','booking','high',false),
('21587d06-9c1e-47c2-aa78-f7daadea4ddb','new_online_lead','🌐 TEST: Lead mới online','Test push new_online_lead','lead','normal',false),
('21587d06-9c1e-47c2-aa78-f7daadea4ddb','new_employee','👤 TEST: NV mới','Test push new_employee','employee','normal',false),
('21587d06-9c1e-47c2-aa78-f7daadea4ddb','budget_estimate_pending','📋 TEST: Dự toán chờ duyệt','Test push budget_estimate_pending','budget_estimate','high',false),
('21587d06-9c1e-47c2-aa78-f7daadea4ddb','budget_settlement_pending','📑 TEST: Quyết toán chờ duyệt','Test push budget_settlement_pending','budget_settlement','high',false);