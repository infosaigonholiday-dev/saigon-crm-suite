# 🎯 Bằng chứng: code đúng, KEY SAI

Tôi vừa test trực tiếp OneSignal API với chính giá trị key đang lưu trong `system_config` (`os_v2_app_l23tfx3w5rh2tb2bcfjhbi44mzn5mb32...`). Thử cả 3 format `Key`, `Basic`, `Bearer` → **CẢ 3 đều trả HTTP 403 trong 60ms** với message:

> "Access denied. Please include an 'Authorization: ...' header with a valid API key."

→ OneSignal không nhận key này là hợp lệ. Vấn đề KHÔNG phải ở:
- ❌ Edge Function (trigger DB gọi trực tiếp `pg_net`, không qua Edge Function)
- ❌ Timeout (response trả về sau 60ms — UI báo "5s timeout" do bug polling, không phải mạng chậm)
- ❌ Format header `Authorization`
- ❌ App ID (App ID `5eb732df-76ec-4fa9-8741-115270a39c66` đúng)

Vấn đề duy nhất: **giá trị key trong DB bị OneSignal từ chối** — có thể do:
1. Key đã bị **rotate/xoá** trên dashboard OneSignal nhưng không update DB
2. Key này là **User Auth Key** (account-level) chứ không phải **App API Key**, OneSignal `/notifications` chỉ chấp nhận App API Key
3. App `Saigon Holiday CRM` đã bị xoá hoặc đổi trên OneSignal

Lovable không có cách nào sửa được điều này từ code — phải lấy key mới từ dashboard.

---

## ✅ Việc bạn (admin) phải làm — KHÔNG cần Lovable code

### Bước 1: Tạo App API Key mới
1. Đăng nhập https://dashboard.onesignal.com
2. Chọn app **Saigon Holiday CRM** (App ID: `5eb732df-76ec-4fa9-8741-115270a39c66`)
3. Vào **Settings → Keys & IDs**
4. Trong section **App API Keys** (KHÔNG phải User Auth Key) → bấm **Add Key**
   - Name: `CRM Backend Push`
   - **KHÔNG bật IP allowlist** (Supabase IP có thể đổi)
5. Copy key ngay (chỉ hiện 1 lần) — dạng `os_v2_app_xxxxxxx...`

### Bước 2: Update key vào Supabase
Mở SQL Editor của Supabase và chạy:
```sql
UPDATE public.system_config
SET value = 'KEY_MỚI_VỪA_COPY'
WHERE key = 'ONESIGNAL_REST_API_KEY';
```

### Bước 3: Test
Vào **Cài đặt → Thông báo → "Gửi thử push"**
- ✅ `status_code: 200` → push hoạt động → kiểm tra device
- ✅ `status_code: 400 "All included players are not subscribed"` → key OK, chỉ cần bật toggle push trên thiết bị
- ❌ Vẫn `403` → key vẫn sai (paste nhầm User Auth Key thay vì App API Key)

---

## 🔧 Việc Lovable sẽ làm SAU KHI bạn đã update key xong

Sau khi bạn confirm test ra **400 hoặc 200** (tức key đã đúng), mình sẽ:

### 1. Sửa bug polling 5s trong `rpc_send_test_push()`
Hiện tại function poll `net._http_response` 20 lần × 0.25s = 5s, không đủ vì pg_net commit response async sau transaction. Fix:
- Tăng lên 60 lần × 0.5s = 30s
- Set `search_path = public, net` để truy cập đúng schema
- Thêm hint cụ thể cho status 403 (hướng dẫn rotate key) và 400 (hướng dẫn subscribe trước)

### 2. Verify trigger `notify_push_on_insert` chạy với key mới
Insert thử các loại notification thật (LEAVE_REQUEST_NEW, mention, BUDGET_ESTIMATE_NEW…) và check `push_send_log` để xác nhận `status_code = 200`.

### 3. Cập nhật memory
Ghi vào `mem://features/notifications/web-push`: format header chuẩn là `Authorization: Key <token>` cho cả `os_v2_app_*` và `os_v2_org_*`; legacy key (không prefix) mới dùng `Basic`.

---

## ❓ Câu hỏi quyết định

Bạn đã có key mới rồi và muốn mình paste vào (cho mình key qua chat) hay bạn tự update qua SQL Editor?

**Nếu bạn muốn mình update key**: sau khi plan này được approve, paste key mới ở message kế tiếp, mình sẽ chạy migration update + sửa luôn bug polling 5s trong cùng 1 lượt.

**Nếu bạn tự update**: approve plan, chạy `UPDATE system_config` ở SQL Editor, test lại, báo kết quả → mình mới sửa bug polling.

<lov-actions>
<lov-link url="https://dashboard.onesignal.com">Mở OneSignal Dashboard</lov-link>
<lov-link url="https://supabase.com/dashboard/project/aneazkhnqkkpqtcxunqd/sql/new">Mở Supabase SQL Editor</lov-link>
</lov-actions>
