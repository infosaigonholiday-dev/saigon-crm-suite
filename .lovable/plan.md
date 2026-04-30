# Sprint 1 — Tour File / Hồ sơ vận hành đoàn

Mục tiêu: tách MICE/đoàn ra khỏi booking khách lẻ. Mỗi đoàn = 1 **Tour File** chứa task có owner/deadline/evidence/kiểm duyệt và tài liệu có version. Booking khách lẻ giữ nguyên.

---

## 1. Database Migration (1 file SQL)

### 1.1. Mở rộng `bookings`
- Thêm cột `booking_type text default 'retail' check in ('retail','group_tour','mice','school_group','company_trip')`.
- Backfill = `'retail'` cho toàn bộ booking hiện tại → không phá UI cũ.
- Index `(booking_type)`.

### 1.2. Bảng `tour_files`
Đầy đủ cột theo spec. Bổ sung:
- `tour_file_code` auto-gen `TF-YYYY-####` qua sequence + trigger `BEFORE INSERT`.
- Trigger sync `updated_at` (`touch_updated_at`).
- Trigger ghi `tour_file_status_history` mỗi khi `current_stage` đổi.
- Trigger sync ngược: khi `booking_id` được set, ghi `bookings.booking_type` nếu đang là `retail` và tour_file là MICE/group.
- Index: `booking_id`, `lead_id`, `customer_id`, `current_stage`, `departure_date`, `sale_owner_id`, `operation_owner_id`.

### 1.3. Bảng `tour_tasks`
Đầy đủ cột theo spec. Trigger `tour_tasks_workflow_guard` (`BEFORE UPDATE`) enforce:
- Chỉ owner được set `todo → in_progress → done_pending_check`.
- Chỉ user khác owner (manager/CEO/checked_by chỉ định) được set `approved_done`/`rejected_rework` — chống tự duyệt.
- ADMIN/SUPER_ADMIN/CEO bypass.
- Nếu `evidence_required = true` và chuyển sang `done_pending_check` mà `evidence_url` null → RAISE EXCEPTION.
- Auto-stamp `completed_at/by`, `checked_at/by`, `rejected_at/by` theo transition.
- Index: `(tour_file_id, status)`, `(owner_id, status)`, `due_at` partial WHERE status NOT IN ('approved_done','cancelled').

Trigger `tour_tasks_overdue_marker` chạy trong cron (xem 1.6) chuyển task quá hạn thành `overdue`.

### 1.4. Bảng `tour_documents`
Đầy đủ cột theo spec. Trigger `BEFORE INSERT`:
- Set version_no = max(version_no)+1 cho cùng `(tour_file_id, document_type)`.
- Set `is_current_version = true`, đồng thời UPDATE các bản cũ cùng key thành `false`.

Trigger `BEFORE DELETE`: chặn xóa nếu document đã được link tới `contract_signed`/`settlement` (kiểm `linked_entity_type`).

### 1.5. Bảng `tour_file_status_history`
Đầy đủ cột theo spec. Insert qua trigger ở 1.2.

### 1.6. Storage bucket `tour-files` (private)
- Policies: chỉ user có quyền xem `tour_file_id` mới được signed URL (kiểm qua RLS helper).

### 1.7. Notifications integration
Mở rộng types trong `notifications` (KHÔNG check constraint, theo project rule):
- `TOUR_TASK_ASSIGNED`, `TOUR_TASK_OVERDUE`, `TOUR_TASK_OVERDUE_ESCALATION`, `TOUR_TASK_PENDING_CHECK`, `TOUR_TASK_REJECTED`.

Trigger `notify_tour_task_change`:
- AFTER INSERT → notify `owner_id` (`TOUR_TASK_ASSIGNED`, action_required = true, action_due_at = `due_at`).
- AFTER UPDATE status `→ done_pending_check` → notify `checked_by` (nếu set) hoặc `manager_owner_id` của tour_file.
- AFTER UPDATE status `→ rejected_rework` → notify `owner_id`.
- Set `related_entity_type='tour_task'`, `related_entity_id=NEW.id`.
- Tận dụng pipeline notification standardization đã có (Sprint trước).

Cron job `pg_cron` mỗi 30 phút: `mark_tour_tasks_overdue()`:
- Set `status='overdue'` cho task quá hạn → trigger sinh `TOUR_TASK_OVERDUE` cho owner.
- Nếu overdue >24h và chưa escalate → notify `manager_owner_id` (`TOUR_TASK_OVERDUE_ESCALATION`), set flag `escalated_at` (thêm cột).

### 1.8. RLS Policies (tất cả 4 bảng)
Helper function `can_access_tour_file(_tour_file_id uuid)`:
```
- ADMIN/SUPER_ADMIN: true
- sale_owner_id = auth.uid()
- operation_owner_id = auth.uid()
- accountant_owner_id = auth.uid()
- manager_owner_id = auth.uid()
- KETOAN role: true (xem tài chính/chứng từ tất cả tour)
- DIEUHAN role: true (điều hành xem tất cả)
- MANAGER/GDKD: cùng department_id với sale_owner
```

Policies:
- `tour_files`: SELECT/UPDATE qua helper. INSERT cho Sale/Manager/DIEUHAN/Admin.
- `tour_tasks`: SELECT qua helper. UPDATE: owner sửa task của mình; checker/manager/admin duyệt. DELETE: chỉ admin/manager.
- `tour_documents`: SELECT qua helper. INSERT bởi user có quyền tour_file. DELETE: chỉ admin (trigger còn chặn).
- `tour_file_status_history`: SELECT qua helper, INSERT qua trigger only.

Tách `admin_full_access` policy riêng (theo memory rule).

---

## 2. Frontend

### 2.1. Cấu trúc file mới
```
src/
  pages/
    TourFiles.tsx                 # list page /ho-so-doan
    TourFileDetail.tsx            # /ho-so-doan/:id
  components/tour-files/
    TourFileFormDialog.tsx        # tạo mới (link booking/lead/customer)
    TourFileOverviewTab.tsx
    TourFileTasksTab.tsx
    TourFileDocumentsTab.tsx
    TourFileHistoryTab.tsx
    TaskFormDialog.tsx
    TaskDetailDialog.tsx          # workflow buttons + evidence upload
    TaskActionButtons.tsx         # Bắt đầu / Báo xong / Duyệt / Trả lại
    DocumentUploadDialog.tsx
    StageBadge.tsx
    TourFileStageStepper.tsx
  hooks/
    useTourFile.ts
    useTourTasks.ts
    useTourDocuments.ts
  lib/
    tourFileWorkflow.ts           # transitions allowed, helpers
    tourTaskTemplates.ts          # checklist mặc định theo booking_type
```

### 2.2. Booking list (`src/pages/Bookings.tsx`)
- Thêm filter dropdown `booking_type`: Tất cả / Khách lẻ / Đoàn / MICE / School / Company.
- Cột mới: badge "Tour File" nếu `booking_type != 'retail'`, click → `/ho-so-doan/:tour_file_id` (LEFT JOIN tour_files).
- Nếu có tour_file: hiển thị `current_stage`, `next_action_due_at`, count task `overdue` (subquery hoặc view).
- Form tạo booking: chọn `booking_type`. Nếu khác `retail` → sau khi tạo, auto-create tour_file rỗng + redirect sang Tour File detail.

### 2.3. Tour Files list page `/ho-so-doan`
- Bảng: code, tour_name, route, departure_date, group_size, sale_owner, current_stage badge, # task overdue, # task pending check, risk_level.
- Filter: stage, booking_type, sale_owner, operation_owner, departure_date range, "Có task quá hạn".
- Nút "Tạo Tour File" (cho Sale/DIEUHAN/Manager/Admin).
- Pagination 20/page (chuẩn dự án).

### 2.4. Tour File Detail (4 tabs V1)
**Tab Tổng quan**: thông tin tour, owners, stage stepper (16 stages), KPI (task done/total, doc count, ngày còn lại tới departure), nút đổi stage (chỉ Sale/Manager/Admin) → ghi history.

**Tab Task**:
- Bảng filter: department, owner, status, due_at + quick filters: "Việc của tôi", "Quá hạn", "Chờ kiểm", "Cần bằng chứng".
- Click row → TaskDetailDialog với:
  - Action buttons theo role + status (xem 2.6).
  - Upload evidence (vào `tour-files/{tour_file_id}/evidence/{task_id}/...`).
  - Comment/log section (dùng audit_logs).
- Nút "Tạo task" + "Áp template" (template theo booking_type — pre-fill set task chuẩn cho MICE: nhận yêu cầu, dựng chương trình, gửi proposal, ký HĐ, nhận cọc, đặt xe, đặt KS, gửi guest list, kiểm tra tiền tour, post-tour settlement…).

**Tab Tài liệu**:
- Group by `document_type`, hiển thị bản hiện hành + dropdown xem version cũ.
- Upload dialog: chọn type, file, link entity (nullable).
- Cảnh báo đỏ: thiếu `guest_list` / `contract_signed` / `budget` / `settlement` khi tour gần đi.

**Tab Lịch sử**: timeline `tour_file_status_history` + audit_logs liên quan.

### 2.5. Sidebar
Thêm mục **"Hồ sơ đoàn / MICE"** dưới "Đặt tour", icon `Briefcase`, moduleKey `tour_files`. Visible cho Sale (đoàn), DIEUHAN, KETOAN, Manager, GDKD, Admin.

Mở rộng `getDefaultPermissionsForRole`: thêm `tour_files.view/create/edit/approve` cho các role tương ứng.

### 2.6. Workflow rules (`tourFileWorkflow.ts`)
Bảng transition:

```text
todo            → in_progress (owner)
in_progress     → done_pending_check (owner; check evidence_required)
in_progress     → waiting_customer/supplier/internal (owner)
waiting_*       → in_progress (owner)
done_pending_check → approved_done   (NOT owner; checked_by/manager/admin)
done_pending_check → rejected_rework (NOT owner)
rejected_rework → in_progress (owner)
any (not approved_done/cancelled) → cancelled (manager/admin)
```

UI ẩn nút không hợp lệ. Mọi transition gọi RPC `rpc_tour_task_transition(task_id, new_status, evidence_url?, reject_reason?)` — server enforce lần nữa.

### 2.7. Notification integration
- Click notification `TOUR_TASK_*` → mở Tour File Detail tab Task với task_id highlight + dialog mở.
- KHÔNG auto mark `approved_done` khi đọc (theo nguyên tắc Sent ≠ Read ≠ Processed đã build).
- Khi user bấm "Duyệt xong" → gọi `markActionCompleted` cho notification liên quan.

### 2.8. Dashboard widgets
Trong `Dashboard.tsx` (Manager/CEO/DIEUHAN view) + `AlertsCenter.tsx`:
- Card "Task tour quá hạn theo phòng ban" (group by department).
- Card "Tour sắp khởi hành <7 ngày còn task chưa xong".
- Card "Task chờ kiểm" (cho manager/checked_by).
- Card "Tour File thiếu tài liệu quan trọng".

Dữ liệu qua RPC `rpc_tour_dashboard_stats()` SECURITY DEFINER, scope theo role.

---

## 3. Definition of Done — Test plan

Sau khi build, chạy thực tế (không chỉ code):

1. Tạo Booking khách lẻ → vẫn flow cũ, không có Tour File. ✓
2. Tạo Booking với `booking_type=mice` → auto tạo tour_file, redirect detail. ✓
3. Áp template task → 10+ task được tạo gắn `tour_file_id`. ✓
4. Sale (owner) chuyển `todo→in_progress→done_pending_check` không upload evidence khi `evidence_required=true` → bị từ chối với message rõ ràng. ✓
5. Sale tự click "Duyệt xong" task của mình → bị chặn. ✓
6. Manager click "Duyệt xong" → status `approved_done`, notification cũ được mark completed. ✓
7. Upload doc cùng `document_type` lần 2 → version 1 set `is_current_version=false`, version 2 hiện tại. ✓
8. Login Sale khác → không thấy tour_file không thuộc mình (RLS). ✓
9. Login KETOAN → thấy mọi tour_file phần tài chính. ✓
10. Cron mark overdue → notification đến owner, sau 24h escalate manager, không duplicate (idempotent qua `escalated_at`). ✓
11. Dashboard hiển thị đúng số liệu. ✓
12. Supabase linter: 0 ERROR mới. ✓

---

## 4. Phạm vi NGOÀI Sprint 1 (ghi nhận, không build lần này)
- Tab Tài chính (link `transactions`, `budget_estimates`, `budget_settlements` vào tour_file).
- Tab Khách (rooming list editor, import Excel guest list).
- Tab HDV / Phương tiện chi tiết.
- Mobile-optimized task view cho HDV on-tour.
- AI suggest checklist task.

Sẽ làm Sprint 2 sau khi nền tour_file ổn.

---

## 5. Files dự kiến tạo/sửa

**Migration**: 1 file (`*_tour_file_system.sql`) ~600 dòng.

**Tạo mới (~16 file)**: TourFiles.tsx, TourFileDetail.tsx, 11 component trong `tour-files/`, 3 hook, 2 lib helper.

**Sửa**: `Bookings.tsx`, `BookingFormDialog.tsx`, `AppSidebar.tsx`, `usePermissions.ts` (PERMISSION_MATRIX), `get_default_permissions_for_role` SQL function, `AlertsCenter.tsx`, `Dashboard.tsx`, `notificationActions.ts` (thêm tour_task entity).

**Memory updates**: tạo `mem://features/tour-files/system` mô tả kiến trúc; thêm vào index.

Sau khi anh duyệt plan này, em build thẳng theo từng bước migration → backend RPC → UI list → UI detail → notification → dashboard → test, paste kết quả thật.
