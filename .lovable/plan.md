# Plan: Hoàn thiện ACTION-ORIENTED CRM (5 mục)

## Tổng quan kiểm tra hiện trạng

| # | Yêu cầu | Trạng thái hiện tại | Cần làm |
|---|---------|---------------------|---------|
| 1 | Badge nhiệt độ 🔥/🟡/❄️ trên Lead Card | Có badge nhưng dựa vào `lead.temperature` (thủ công), KHÔNG dựa vào `last_contact_date` như spec | **Sửa**: tính toán động từ `last_contact_at` |
| 2 | Dialog ghi chú bắt buộc khi kéo Kanban | **Đã có** — `LeadStatusChangeDialog` mở khi drop, ghi chú min 10 ký tự đã enforce | Verify only |
| 3 | Badge follow-up count + last contact | Card đã hiện "lần cuối X ngày trước" và "hẹn tiếp theo" nhưng **chưa hiện số lần follow-up** (`contact_count`) | **Thêm** badge số lần follow-up |
| 4 | Widget "Việc cần làm hôm nay" trên dashboard Sale | Dashboard có "Nhắc hẹn hôm nay" nhưng **chưa sort theo nhiệt độ Nóng trước** và thiếu detail | **Nâng cấp** widget |
| 5 | Edge Function `daily-reminders` gửi 8h sáng list lead cần chăm sóc | **Đã có** logic FOLLOW_UP cho `follow_up_date = today`, nhưng chưa có **digest gộp 1 thông báo/Sale** | **Bổ sung** digest notification |

## Các thay đổi cụ thể

### 1. Logic Temperature động (`src/pages/Leads.tsx`)

Thêm helper:
```ts
function computeTemperatureFromContact(lastContactAt: string | null, manualTemp: string | null) {
  if (!lastContactAt) return manualTemp || "warm";
  const days = Math.floor((Date.now() - new Date(lastContactAt).getTime()) / 86400000);
  if (days < 3) return "hot";       // 🔥 < 3 ngày
  if (days <= 7) return "warm";     // 🟡 3-7 ngày
  return "cold";                    // ❄️ > 7 ngày
}
```
Áp dụng tại Kanban card (line 427) thay cho `lead.temperature ?? "warm"`. Giữ `lead.temperature` thủ công làm fallback nếu chưa có `last_contact_at`.

### 2. Dialog ghi chú bắt buộc — VERIFY ONLY

`LeadStatusChangeDialog.tsx`:
- Line 138: `noteValid = note.trim().length >= 10` ✅
- Line 142: `canSubmit` chặn submit nếu chưa đạt ✅
- `handleDrop` (Leads.tsx line 250) mở dialog khi drop ✅

→ Đã đúng spec. Chỉ cần xác nhận, không sửa.

### 3. Badge số lần follow-up trên card

Cột `contact_count` đã có trong query (line 146). Thêm badge nhỏ cạnh tên:
```tsx
{lead.contact_count > 0 && (
  <Badge variant="outline" className="text-[9px] h-4 px-1">
    🔁 {lead.contact_count}
  </Badge>
)}
```
Đặt cùng dòng với badge B2B/temperature (line 504).

### 4. Widget "Việc cần làm hôm nay" (`PersonalDashboard.tsx`)

Card hiện tại "Nhắc hẹn hôm nay" (line 233-263) → nâng cấp:
- Đổi tiêu đề thành **"Việc cần làm hôm nay"**
- Sort: `temperature='hot'` lên trước, sau đó theo `follow_up_date` ASC
- Hiển thị thêm: số điện thoại + nút "Gọi ngay" (link `tel:`) + badge nhiệt độ
- Bao gồm cả lead **quá hạn** (đã có `lte(today)`) → highlight đỏ
- Click row → mở `/tiem-nang?leadId=<id>` thay vì chỉ navigate `/tiem-nang`

Sort logic:
```ts
const tempOrder = { hot: 0, warm: 1, cold: 2 };
data.sort((a, b) => {
  const tA = tempOrder[a.temperature ?? "warm"];
  const tB = tempOrder[b.temperature ?? "warm"];
  if (tA !== tB) return tA - tB;
  return a.follow_up_date.localeCompare(b.follow_up_date);
});
```

### 5. Daily Reminders — Digest 8h sáng

Hiện tại function gửi 1 notification cho **mỗi lead** → spam khi sale có nhiều lead.

**Bổ sung** một loop mới sau loop FOLLOW_UP hiện tại (line 142-155):
- Group `leads` theo `assigned_to`
- Tạo 1 notification digest/sale với `type='DAILY_DIGEST'`:
  - Title: `📋 Việc hôm nay: X lead cần chăm sóc`
  - Message: `Bạn có X lead cần follow-up hôm nay. Mở app để xem chi tiết.`
  - `entity_type='dashboard'`, `entity_id=user_id`
  - Priority: `high` nếu có lead Nóng, `normal` ngược lại

Giữ nguyên các notification chi tiết FOLLOW_UP để user có thể click vào từng lead trong bell.

**Cron schedule**: kiểm tra `pg_cron` đã có job 8h sáng chưa (sẽ query trước khi sửa). Nếu chưa, thêm job:
```sql
SELECT cron.schedule('daily-reminders-8am', '0 1 * * *',  -- 1:00 UTC = 8:00 GMT+7
  $$ SELECT net.http_post(url:='https://aneazkhnqkkpqtcxunqd.supabase.co/functions/v1/daily-reminders', headers:='{"Content-Type":"application/json","apikey":"<anon>"}'::jsonb) $$);
```

## Files sẽ thay đổi

1. `src/pages/Leads.tsx` — temperature động + badge contact_count
2. `src/pages/PersonalDashboard.tsx` — widget "Việc cần làm hôm nay"
3. `supabase/functions/daily-reminders/index.ts` — thêm DAILY_DIGEST
4. (Có thể) Insert cron job nếu chưa có

## Test sau khi triển khai

1. Mở `/tiem-nang` Kanban → thấy badge 🔥/🟡/❄️ tự đổi theo `last_contact_at`
2. Kéo card sang cột khác → dialog bắt buộc nhập note ≥10 ký tự (đã có)
3. Card hiện badge `🔁 N` với N = contact_count
4. Mở dashboard cá nhân (role SALE) → widget "Việc cần làm hôm nay" sort Nóng trước, có nút Gọi
5. Trigger thủ công edge function `daily-reminders` → kiểm tra bảng `notifications` có record `type='DAILY_DIGEST'`
