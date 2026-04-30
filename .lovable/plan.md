# Tách "Đã gửi ≠ Đã đọc ≠ Đã xử lý" cho notifications

## Mục tiêu
- `is_read` / `read_at`: chỉ đại diện việc user đã **xem** thông báo trong app.
- `action_status` + `action_completed_at` / `action_completed_by`: chỉ đại diện việc công việc nghiệp vụ đã **xử lý xong**.
- Click notification ⇒ chỉ set đọc, KHÔNG set completed. Completed chỉ set khi user thật sự thao tác nghiệp vụ.

## 1. Database migration

### 1.1 Bổ sung cột vào `notifications`
- `action_required boolean NOT NULL DEFAULT false`
- `action_status text` — enum mềm: `pending | in_progress | completed | dismissed | overdue` (CHECK constraint cho phép NULL khi `action_required = false`).
- `action_due_at timestamptz NULL`
- `related_entity_type text NULL` (đã có `entity_type` cũ — giữ tương thích, copy sang nếu thiếu).
- `related_entity_id uuid NULL` (tương tự).
- (`action_completed_at`, `action_completed_by` đã tồn tại từ migration trước — chỉ dùng lại.)
- Index: `(user_id, action_status) WHERE action_required = true AND action_status IN ('pending','in_progress','overdue')`.

### 1.2 Trigger `notifications_init_action_fields` (BEFORE INSERT)
Tự bật `action_required = true` và set deadline cho các loại sau, dựa vào `priority`:
- `FOLLOW_UP_OVERDUE`, `LEAD_NEW_ASSIGNED` → due_at = now() + 24h.
- `PAYMENT_DUE`, `PAYMENT_OVERDUE`, `AR_OVERDUE` → due_at = now() + 48h.
- `TRANSACTION_APPROVAL`, `BUDGET_SETTLEMENT_PENDING`, `LEAVE_REQUEST_NEW`, `CONTRACT_APPROVAL` → due_at = now() + 72h.
- `ACTION_COMPLETED`, `*_RESULT`, `*_APPROVED`, `*_REJECTED`, `MENTION`, `BROADCAST`, `TEST_PUSH` → action_required = false (mặc định).
- Khi `action_required = true` và `action_status` chưa set ⇒ `action_status := 'pending'`.
- Copy `entity_type/entity_id` sang `related_entity_type/related_entity_id` nếu rỗng.

### 1.3 Trigger `notifications_sync_action_status` (BEFORE UPDATE)
- Khi `action_status` chuyển sang `completed` mà `action_completed_at` NULL ⇒ stamp `now()` + `auth.uid()`, đồng thời `is_read = true`, `read_at = COALESCE(read_at, now())`.
- Khi `action_status` chuyển sang `dismissed` ⇒ stamp tương tự nhưng KHÔNG bắt buộc `is_read`.
- Không tự đẩy `action_status = completed` chỉ vì `is_read` đổi (phải tách bạch).

### 1.4 RPC mới
- `rpc_notification_set_action_status(p_id uuid, p_status text, p_note text default null)`:
  - SECURITY DEFINER, kiểm tra `user_id = auth.uid()` HOẶC `has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','HR_MANAGER'])`.
  - Cho phép transition: pending↔in_progress, *→completed, *→dismissed.
- `rpc_notification_overview()`:
  - SECURITY DEFINER, ADMIN/SUPER_ADMIN/HR_MANAGER only.
  - Trả về 4 KPI: tổng đã gửi 7 ngày, chưa đọc, action pending/in_progress, action overdue.
- `run_action_escalation()`:
  - Quét `action_required = true AND action_status IN ('pending','in_progress')` mà:
    - `priority IN ('high','critical')` AND `created_at < now() - 24h` AND `is_read = false`, hoặc
    - `action_due_at IS NOT NULL AND action_due_at < now()` ⇒ set `action_status = 'overdue'` và bắn `ESCALATION_LV1` cho Manager cùng phòng + ADMIN.
  - Chống nhân bản: chỉ tạo escalation 1 lần/notification (cờ `escalation_level >= 1`).

### 1.5 Cron
- Thêm pg_cron job 30 phút/lần gọi `run_action_escalation()`.
- Backfill: với row đang `is_read = true` mà chưa có `action_completed_at` — không tự stamp; chỉ set `action_required = false` cho những type không nằm trong danh sách 1.2.

## 2. Frontend / logic

### 2.1 Helper mới `src/lib/notificationActions.ts`
- `markActionInProgress(id)`, `markActionCompleted(id)`, `dismissAction(id)` — tất cả dùng RPC `rpc_notification_set_action_status`.
- Giữ `markNotificationRead.ts` riêng cho hành động "đọc".

### 2.2 `NotificationBell.tsx` & `AlertsCenter.tsx`
- Click row: chỉ gọi `markNotificationRead(id)` rồi điều hướng tới entity. **Không** gọi complete.
- Hiển thị badge:
  - "Cần xử lý" nếu `action_required && action_status IN ('pending','in_progress')`.
  - "Quá hạn" nếu `action_status = 'overdue'`.
- Bộ lọc mới ở `AlertsCenter`: Tất cả | Chưa đọc | Cần xử lý | Quá hạn.

### 2.3 Module nghiệp vụ — chỗ set `completed` thật
Chỉ set khi nghiệp vụ thật xảy ra (không thêm UI mới, chỉ gắn hook):
- `CareHistoryFormDialog` lưu mới với `lead_id` ⇒ complete tất cả notification `type IN ('FOLLOW_UP_OVERDUE','LEAD_NEW_ASSIGNED')` thuộc lead đó của user hiện tại.
- `PaymentFormDialog` lưu mới ⇒ complete `PAYMENT_DUE`/`PAYMENT_OVERDUE`/`AR_OVERDUE` của booking.
- `ApprovalTab` (finance) khi approve/reject ⇒ complete `TRANSACTION_APPROVAL`/`BUDGET_SETTLEMENT_PENDING` của record.
- `LeaveManagement` approve/reject ⇒ complete `LEAVE_REQUEST_NEW`.
- `ContractDetailDialog` approve ⇒ complete `CONTRACT_APPROVAL`.
- Các điểm này gọi 1 helper chung `completeActionsForEntity(entityType, entityId, types?)`.

### 2.4 `SettingsNotificationStatsTab.tsx`
- Đổi sang dùng `rpc_notification_overview` cho 4 card KPI: Đã gửi (7d) / Chưa đọc / Cần xử lý / Quá hạn.
- Giữ 2 bảng cũ (overdue + top user).

### 2.5 `SettingsNotificationHistoryTab.tsx`
- Thêm cột "Trạng thái xử lý" hiển thị badge `action_status` (chỉ với row có `action_required = true`).
- Filter mới "Trạng thái xử lý".

## 3. Bằng chứng nghiệm thu sẽ chạy

```sql
-- 1. Cột mới tồn tại
SELECT column_name FROM information_schema.columns 
WHERE table_name='notifications' 
  AND column_name IN ('action_required','action_status','action_due_at','related_entity_type','related_entity_id');

-- 2. INSERT FOLLOW_UP_OVERDUE → action_required=true, action_status='pending', action_due_at≈now+24h
-- 3. UPDATE action_status='completed' → action_completed_at, action_completed_by, is_read auto-set
-- 4. Click bell trên FE → is_read=true, action_status KHÔNG đổi
-- 5. CareHistory mới → action_status='completed' cho FOLLOW_UP của lead đó
-- 6. run_action_escalation() chạy → row quá hạn chuyển 'overdue' + sinh ESCALATION_LV1
```

## 4. Files dự kiến chạm
- Migration mới (cột + 2 trigger + 3 RPC + cron + backfill).
- `src/lib/notificationActions.ts` (mới).
- `src/components/NotificationBell.tsx`.
- `src/pages/AlertsCenter.tsx`.
- `src/components/settings/SettingsNotificationStatsTab.tsx`.
- `src/components/settings/SettingsNotificationHistoryTab.tsx`.
- `src/components/leads/CareHistoryFormDialog.tsx`.
- `src/components/payments/PaymentFormDialog.tsx`.
- `src/components/finance/ApprovalTab.tsx`.
- `src/pages/LeaveManagement.tsx`.
- `src/components/contracts/ContractDetailDialog.tsx`.
