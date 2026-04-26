# 🎯 Bằng chứng: code đúng, KEY SAI

Tôi đã test trực tiếp curl từ sandbox tới OneSignal với chính giá trị key trong DB của bạn (`os_v2_app_l23tfx3w5rh2tb2bcfjhbi44...fjzdpa`), thử cả 3 format header `Key` / `key` / `Basic`. **Kết quả: cả 3 đều 403** "Access denied. Please include an 'Authorization: ...' header with a valid API key."

→ OneSignal không nhận key này là hợp lệ. **Vấn đề KHÔNG nằm ở code, header, hay database.** Vấn đề nằm ở **giá trị key trong system_config**.

## Các nguyên nhân có thể

1. **Key đã bị rotate** trên dashboard OneSignal nhưng chưa update vào Supabase
2. **Paste nhầm**: `os_v2_app_...` ở App-level cũng có thể là **User Auth Key cũ** chứ không phải **App API Key** — chỉ App API Key mới gọi được `/notifications`
3. **IP allowlist** đang bật và chặn IP của Supabase Postgres server
4. **App đã bị xóa/đổi** trên OneSignal

## ✅ Việc bạn cần làm (KHÔNG cần Lovable code)

### Bước 1: Tạo lại App API Key thật
1. Đăng nhập https://dashboard.onesignal.com
2. Chọn app **Saigon Holiday CRM** (App ID: `5eb732df-76ec-4fa9-8741-115270a39c66`)
3. Vào **Settings → Keys & IDs**
4. Trong section **App API Keys**, bấm **Add Key**
   - Name: `CRM Backend Push`
   - **KHÔNG bật IP allowlist** (Supabase IP có thể đổi)
5. Copy ngay key mới (chỉ hiện 1 lần) — sẽ có dạng `os_v2_app_xxxxxxxxxxxxx...`

### Bước 2: Update vào Supabase
Mở SQL Editor và chạy:
```sql
UPDATE public.system_config
SET value = 'KEY_MỚI_VỪA_COPY_Ở_BƯỚC_1'
WHERE key = 'ONESIGNAL_REST_API_KEY';
```

### Bước 3: Verify
Vào **Cài đặt → Thông báo → "Gửi thử push"**
- ✅ `status_code: 200` → push đã hoạt động → kiểm tra thiết bị
- ✅ `status_code: 400 "All included players are not subscribed"` → key OK, chỉ cần subscribe trước
- ❌ `status_code: 403` lần nữa → key vẫn sai (paste nhầm hoặc bật IP allowlist)

## 🔧 Việc Lovable sẽ làm (sau khi user xác nhận)

Sau khi bạn cập nhật key xong và test ra **400 hoặc 200**, mình sẽ:
1. Sửa cảnh báo "OneSignal chưa trả lời sau 5s" trong `rpc_send_test_push()` — bug polling không tìm thấy `net._http_response` mặc dù response đã có (cần đổi delay từ 0.25s × 20 → 0.5s × 30 và refresh transaction)
2. Verify trigger `notify_push_on_insert()` chạy đúng cho các loại notification thật (LEAVE_REQUEST_NEW, mention, v.v.)
3. Update memory `mem://features/notifications/web-push` ghi rõ format header `Key <token>` chính xác

Không cần thay đổi gì trong code app — kiến trúc hiện tại đúng rồi.

<lov-actions>
<lov-link url="https://dashboard.onesignal.com">Mở OneSignal Dashboard</lov-link>
<lov-link url="https://supabase.com/dashboard/project/aneazkhnqkkpqtcxunqd/sql/new">Mở Supabase SQL Editor</lov-link>
</lov-actions>
