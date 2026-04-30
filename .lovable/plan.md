# Verification Report — Nền tảng HR/Settings/Quotes

## 1. Ảnh chân dung nhân viên — DONE (data + feature)

**Storage:**
- Bucket `employee-avatars` tồn tại, `public = true`.
- RLS policies trên `storage.objects`:
  - `employee_avatars_public_read` (SELECT)
  - `employee_avatars_authenticated_insert / update / delete`

**DB:**
- Cột `employees.avatar_url text NULL` đã có.
- Hiện tại: 30 employees, 0 có avatar_url → tính năng sẵn sàng nhưng chưa ai upload.

**Code:**
- `EmployeeAvatarUpload.tsx`: upload → resize 128×128 WebP (~5KB) → lưu `employee-avatars/{id|tmp-...}/avatar-{ts}.{ext}` → `getPublicUrl` + cache-buster `?t=` → `onChange(url)`.
- `EmployeeFormDialog.tsx`: nhận URL vào `form.avatar_url`, lưu vào `employees.avatar_url` khi submit (line 237).
- Hiển thị: `EmployeeAvatar.tsx` dùng `<AvatarImage>` + fallback initials qua `<AvatarFallback>` (2 ký tự đầu/đầu+cuối).
- Sử dụng tại: `Employees.tsx` (table 32px), `EmployeeDetail.tsx` (header 64px), `LeaveManagement.tsx` (24px).

**Kết luận:** Pipeline upload → preview → DB → hiển thị + fallback **đầy đủ và đúng**. → **DONE**

---

## 2. Lịch làm việc (work_schedules) — DONE

**DB schema** (bảng `work_schedules`):
```
id uuid, employee_id uuid NOT NULL, day_of_week int NOT NULL,
is_working bool NOT NULL, start_time time, end_time time, note text,
created_at, updated_at
```
- FK `work_schedules_employee_id_fkey → employees(id)`.
- Unique constraint `(employee_id, day_of_week)` (đang được dùng ở `upsert onConflict`).

**RLS:**
- `work_schedules_read_authenticated` (SELECT — mọi authenticated user).
- `work_schedules_hr_manage` (ALL — gated trong app cho ADMIN/HR_MANAGER/HCNS).

**Code:**
- `EmployeeWorkScheduleTab.tsx`: load 7 dòng theo `employee_id`, fill default nếu trống, upsert đúng `onConflict: "employee_id,day_of_week"`.
- Reload: dữ liệu nạp lại đúng từ DB (React Query key `["work_schedules", employeeId]`).
- `LeaveManagement.tsx` dùng `["work_schedules_all"]` để tính ngày nghỉ thực tế khi xét đơn → đã được invalidate sau khi save.

**Tác động khác:** Không có trigger ẩn lên `work_schedules`; chấm công (attendance) hiện chưa có module riêng nên không bị phá.

→ **DONE** (lưu đúng bảng, reload đúng, không phá HR/leave logic).

---

## 3. Company Settings — 13 keys

DB hiện có đủ **13 key** đã có giá trị thật:
| Key | Đã render UI/Print | Trạng thái |
|---|---|---|
| COMPANY_NAME | Print booking-confirmation (footer + GPLHQT box) | DONE feature |
| COMPANY_SHORT_NAME | Print (header logo, footer) | DONE feature |
| COMPANY_TAGLINE | Print (header + footer) | DONE feature |
| COMPANY_TAX_CODE | Print (GPLHQT box: MST) | DONE feature |
| COMPANY_LICENSE | Print (GPLHQT) | DONE feature |
| COMPANY_ADDRESS | Print (header) | DONE feature |
| COMPANY_ADDRESS2 | Print (header) | DONE feature |
| COMPANY_PHONE | Print (header + footer) | DONE feature |
| COMPANY_WEBSITE | Print (header + footer) | DONE feature |
| COMPANY_LOGO_URL | Print (SGH_setLogo) | DONE feature |
| COMPANY_BANK_1 | Print (parsed → BANK1_NAME/HOLDER/NUMBER, 2 chỗ) | DONE feature |
| COMPANY_BANK_2 | Print (parsed → BANK2_NAME/HOLDER/NUMBER, 2 chỗ) | DONE feature |
| COMPANY_EMAIL | Truyền vào payload nhưng template **không có slot** `data-co="COMPANY_EMAIL"` | **DONE data, CHƯA DONE feature** |

**Chưa dùng ở các nơi sau (cần cân nhắc bổ sung sau):**
- Hợp đồng (`Contracts`) – chưa có template in.
- Phiếu thu/chi (`Finance`) – `financePrintTemplates.ts` không reference COMPANY keys.
- Email auth/transactional – đang hardcode tên trong templates `_shared/email-templates/*`.

**Hành động đề xuất (nhỏ, sẽ làm ngay khi user duyệt):**
- Thêm 1 dòng `📧 <span data-co="COMPANY_EMAIL"></span>` vào header của `public/print/booking-confirmation.html` để dùng nốt key COMPANY_EMAIL.
- (Tùy chọn) Thêm chèn `COMPANY_NAME / COMPANY_TAX_CODE / COMPANY_BANK_1` vào `financePrintTemplates.ts` cho phiếu thu/chi → để verify lần sau.

---

## 4. Audit `quotes` vs `quotations` — KHÔNG CÓ DUPLICATE

**Kết quả query `information_schema.tables`:**
- Chỉ tồn tại **1 bảng**: `quotations` (0 rows hiện tại).
- Không có bảng `quotes` trong schema `public`.

**Code reference:** Toàn bộ UI/API dùng `quotations` (page `Quotations.tsx`, `QuotationFormDialog.tsx`, permission `quotations.view/create/edit/delete`).

→ **KHÔNG cần rename/backup.** Cảnh báo "duplicate" trước đây có thể do nhầm lẫn naming (singular `quote` xuất hiện trong UI text/label tiếng Việt "Báo giá") — nhưng ở DB chỉ có duy nhất 1 bảng đúng chuẩn.

---

## Tổng kết

| Mục | Trạng thái |
|---|---|
| 1. Ảnh chân dung | DONE production |
| 2. work_schedules | DONE production |
| 3. COMPANY_* keys | 12/13 DONE feature; COMPANY_EMAIL: DONE data, chưa render |
| 4. quotes duplicate | Không tồn tại — bỏ qua |

## Việc sẽ làm khi user duyệt plan này
1. Thêm slot `data-co="COMPANY_EMAIL"` vào `public/print/booking-confirmation.html` (header + footer) để đóng nốt 13/13 keys.

Không cần migration DB. Không có rủi ro phá tính năng khác.
