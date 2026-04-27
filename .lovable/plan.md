
## BÁO CÁO PHẦN 1 — KIỂM TRA HIỆN TRẠNG

### 1. Schema bảng `leads` — các cột follow-up đã có
| Cột | Kiểu | Ghi chú |
|---|---|---|
| `status` | text (default `NEW`) | Có |
| `temperature` | text (default `warm`) | ✅ Đã có (hot/warm/cold) |
| `follow_up_date` | **date** | ✅ Đã có (date, KHÔNG phải timestamptz) |
| `next_followup_at` | timestamptz | Có nhưng UI hiện không dùng |
| `last_contact_at` | timestamptz | ✅ Đã có (= last_interaction_at) |
| `contact_count` | integer (default 0) | ✅ Đã có (= interaction_count) |
| `assigned_to` | uuid (default auth.uid()) | Có |
| `call_notes` | text | Có |
| `reminder_date` | date | Có (auto-set bằng trigger) |

**Kết luận**: KHÔNG cần ALTER TABLE — đã đủ trường. `follow_up_date`, `temperature`, `last_contact_at`, `contact_count` đều đã tồn tại. **Không thêm `next_action_type` / `next_action_note` / `follow_up_deadline` / `last_interaction_at` / `interaction_count`** để tránh duplicate. `next_action_type` sẽ lưu trong `lead_care_history.next_action` (đã có), text mô tả hiện tại lưu vào `call_notes` của lead khi cần snapshot mới nhất.

### 2. Bảng `lead_care_history`
Cột: `id, lead_id, contacted_by, contacted_at, contact_method, result, note, next_action, next_contact_date, created_at` — **đã đủ** cho timeline + ghi nhận tương tác.
- Số bản ghi hiện tại: **2**
- Trigger `update_lead_from_care` đã tự cập nhật `last_contact_at`, `contact_count`, `follow_up_date` của lead khi insert care history → **dùng lại trigger này** thay vì update tay 2 lần.

### 3. Kanban hiện tại — **5 cột**
1. **Mới** (NEW, NO_ANSWER, CONTACTED)
2. **Quan tâm** (INTERESTED, PROFILE_SENT)
3. **Đang báo giá** (QUOTE_SENT, NEGOTIATING)
4. **Thành công** (WON)
5. **Không thành công** (LOST, DORMANT, NURTURE)

### 4. Data leads hiện tại (4 lead)
| full_name | status | temperature | follow_up_date | contact_count |
|---|---|---|---|---|
| Công ty BW | NEW | cold | 23/04/2026 | 0 |
| lê thị hoa | CONTACTED | cold | 14/02/2026 (quá hạn) | 0 |
| Minh Khuê | NEW | warm | 18/06/2026 | 0 |
| Yuqing Li | NEW | warm | 17/04/2026 (quá hạn) | 2 |

→ Có 2 lead quá hạn để test widget ngay.

### 5. Code hiện tại
- `Leads.tsx` đã có `LostReasonDialog` (chỉ hiện cho LOST/NURTURE/DORMANT). Các status khác đổi instant không hỏi gì.
- Card đã hiển thị temperature icon + badge "Quá hạn"/"Hôm nay" → cần nâng cấp thành badge màu rõ ràng + dòng "Hẹn: dd/MM - <action>" + "Lần cuối: X ngày trước".
- `daily-reminders` đã có nhánh "follow_up_date = today" và "follow_up_date < today (overdue)" cho lead. **Chưa có** nhánh "không tương tác > 7 ngày" và "không có lịch hẹn".

---

## PHẦN 2-7 — KẾ HOẠCH THỰC HIỆN

### Phần 2: DB
**KHÔNG migrate cột mới.** Chỉ thêm 1 view nhẹ tùy chọn — bỏ qua. Dùng nguyên schema hiện tại.

### Phần 3: Dialog "Cập nhật trạng thái Lead" (bắt buộc ghi chú)

Tạo mới `src/components/leads/LeadStatusChangeDialog.tsx`:
- Props: `open, onOpenChange, lead, targetStatus, targetStatusLabel, onConfirm`
- Form (react-hook-form + zod):
  - **Trạng thái mới** (read-only badge) 
  - **Nội dung tương tác** *(textarea, min 10 ký tự)*
  - **Hành động tiếp theo** *(Select: Gọi lại / Gửi email / Hẹn gặp / Gửi báo giá / Thăm khách / Follow-up / Khác)* — lưu vào `lead_care_history.next_action`
  - **Phương thức tương tác** *(Select: Gọi / Email / Gặp mặt / Tin nhắn)* — lưu `contact_method`
  - **Ngày hẹn tiếp theo** *(date, default = today + 3 ngày)*
  - **Mức độ quan tâm** *(3 nút Toggle: 🔥 Nóng / 🌤️ Ấm / ❄️ Lạnh)* — pre-select theo lead.temperature hiện tại
- Submit → 1 mutation gồm 2 step:
  1. `INSERT lead_care_history` (lead_id, contacted_by=auth.uid(), contact_method, note, next_action, next_contact_date) — trigger `update_lead_from_care` tự update `last_contact_at`, `contact_count`, `follow_up_date`.
  2. `UPDATE leads SET status = mới, temperature = mới` (chỉ 2 field này, vì trigger đã lo phần còn lại).
- Toast: "Đã cập nhật Lead + ghi lịch sử chăm sóc".
- Cancel → `onOpenChange(false)`, KHÔNG đổi status.

Sửa `Leads.tsx`:
- Thay `LostReasonDialog` cho status LOST/NURTURE/DORMANT bằng `LeadStatusChangeDialog` (giữ thêm field "Lý do thất bại" khi targetStatus=LOST).
- **Mọi status change** (cả kéo-thả và dropdown menu) đều mở `LeadStatusChangeDialog` — KHÔNG còn đường tắt. Riêng WON sau khi confirm vẫn pop hỏi "Chuyển thành KH luôn?".
- Nếu user kéo-thả về cùng group hiện tại (cùng default status) → không mở dialog.

### Phần 4: Hiển thị Temperature + Deadline trên Kanban

Sửa card trong `Leads.tsx`:
- Badge temperature **góc trên phải** (đè lên DropdownMenu) — dùng các màu:
  - 🔥 Nóng → `bg-red-500 text-white`
  - 🌤️ Ấm → `bg-orange-500 text-white`
  - ❄️ Lạnh → `bg-blue-500 text-white`
- Dòng **"📅 Hẹn: dd/MM — <next_action>"** lấy từ care history mới nhất:
  - Quá hạn → text đỏ + ⚠️
  - Hôm nay → text cam + 🔔
  - Tương lai → text xám
- Dòng **"⏱ Lần cuối: X ngày trước"** từ `last_contact_at`:
  - `null` → "Chưa tương tác" (vàng)
  - `> 7 ngày` → "⚠️ X ngày không liên hệ" (đỏ)

Để lấy `next_action` mới nhất per lead: bổ sung query `lead_care_history` (1 batch) → group theo lead_id → lấy bản ghi mới nhất.

### Phần 5: Widget "Giám sát Lead" trên Dashboard

Tạo mới `src/components/dashboard/LeadMonitoringWidget.tsx`:
- Chỉ render khi `userRole ∈ {ADMIN, SUPER_ADMIN, GDKD, MANAGER}` AND scope ∈ {all, department}.
- Lấy data theo scope (giống `Leads.tsx`).
- 5 metric cards (grid-cols-2 md:grid-cols-5):
  - **A. Quá hạn** — `follow_up_date < today AND status NOT IN (WON, LOST, DORMANT, NURTURE)` → badge đỏ, click → `/tiem-nang?filter=overdue`
  - **B. Hôm nay** — `follow_up_date = today` → badge cam → `?filter=today`
  - **C. Không có lịch hẹn** — `follow_up_date IS NULL AND status NOT IN (WON, LOST, ...)` → vàng → `?filter=no_schedule`
  - **D. >7 ngày không tương tác** — `(last_contact_at IS NULL OR last_contact_at < today-7) AND status NOT IN (WON, LOST, ...)` → đỏ → `?filter=stale`
  - **E. Tỷ lệ chuyển đổi tháng** — `bookings created this month FROM lead-converted-customer / leads created this month * 100`
- Bảng "Top 5 leads quá hạn lâu nhất": tên, NV phụ trách, ngày quá hạn, last_contact.

Mount widget vào `BusinessDashboard` trong `Dashboard.tsx` (sau `SalePerformanceTable`).

Sửa `Leads.tsx`: đọc `?filter=` từ `useSearchParams`, áp dụng client-side filter trước khi render Kanban/Table.

### Phần 6: Timeline trong LeadDetailDialog

Kiểm tra `LeadDetailDialog.tsx` (đã có `CareHistoryTab` theo mem) — confirm timeline đã render từ `lead_care_history`. Nếu thiếu temperature snapshot → bỏ qua (DB không lưu temperature per care entry; thay vào đó hiển thị temperature **hiện tại** của lead trên header tab).

Cụ thể: kiểm tra component `CareHistoryTab.tsx`:
- Đảm bảo có icon theo `next_action` / `contact_method`: 📞 call, 📧 email, 🤝 meeting, 📄 send_quote, 🏢 visit
- Sort DESC theo `contacted_at`
- Hiển thị: timestamp, tên người ghi (join `profiles`), `note`, `next_action`, `next_contact_date`

Nếu component đã đủ → không sửa. Nếu thiếu icon mapping → bổ sung.

### Phần 7: Mở rộng `daily-reminders`

Bổ sung 2 block vào `supabase/functions/daily-reminders/index.ts` (sau block follow-up hiện tại):

**A. Lead không tương tác > 7 ngày**
```ts
const sevenDaysAgo = new Date(today); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
const { data: staleLeads } = await supabase
  .from("leads")
  .select("id, full_name, assigned_to, last_contact_at, created_at")
  .not("status", "in", "(WON,LOST,DORMANT,NURTURE)")
  .not("assigned_to", "is", null)
  .or(`last_contact_at.lt.${sevenDaysAgo.toISOString()},last_contact_at.is.null`);
// Dedupe: query notifications WHERE type='lead_no_interaction' AND entity_id IN (...) AND created_at >= today-3
// → push những lead còn lại
```

**B. Lead không có lịch hẹn (tạo > 2 ngày)**
```ts
const twoDaysAgo = new Date(today); twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
const { data: noScheduleLeads } = await supabase
  .from("leads")
  .select("id, full_name, assigned_to, created_at, department_id")
  .is("follow_up_date", null)
  .not("status", "in", "(WON,LOST,DORMANT,NURTURE,NEW)")
  .lt("created_at", twoDaysAgo.toISOString());
// Notify assigned_to + GDKD cùng phòng (query profiles WHERE role='GDKD' AND department_id=...)
// Dedupe 3 ngày như trên
```

Push qua trigger `notify_push_on_insert` đã có (insert vào `notifications` là tự push).

---

## TECHNICAL DETAILS

**Files mới (2):**
- `src/components/leads/LeadStatusChangeDialog.tsx` — dialog ép ghi chú
- `src/components/dashboard/LeadMonitoringWidget.tsx` — 5 metric cards + top-5 table

**Files sửa (4):**
- `src/pages/Leads.tsx` — thay flow status change, render temperature badge + deadline + last contact, đọc URL `?filter=`
- `src/pages/Dashboard.tsx` — mount `<LeadMonitoringWidget />` trong `BusinessDashboard`
- `src/components/leads/CareHistoryTab.tsx` — bổ sung icon mapping (nếu thiếu)
- `supabase/functions/daily-reminders/index.ts` — thêm 2 block A & B với dedupe 3 ngày

**KHÔNG migrate DB.** Tận dụng tối đa schema sẵn có (`temperature`, `follow_up_date`, `last_contact_at`, `contact_count`, `lead_care_history.next_action`).

**Phân quyền widget:** check `userRole ∈ {ADMIN, SUPER_ADMIN, GDKD, MANAGER}` ở client; data tự bị RLS lọc theo scope ở DB.

**Báo cáo sau khi xong:** sẽ paste schema không đổi, code diff tóm tắt, screenshot widget + dialog.
