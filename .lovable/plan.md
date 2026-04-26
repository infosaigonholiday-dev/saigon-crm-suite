# Kế hoạch: Update OneSignal App API Key + Verify Push

## 🎯 Mục tiêu
Thay key cũ (Legacy, đang trả 403) bằng key mới `os_v2_app_l23tfx...xbedtcevehvkifjzdpa` user vừa tạo, sau đó test ngay để xác nhận push notification hoạt động trên ĐT/Laptop.

## 🛠️ Các bước thực hiện

### Bước 1 — Migration update key (`supabase--migration`)
```sql
UPDATE public.system_config
SET 
  value = 'os_v2_app_l23tfx3w5rh2tb2bcfjhbi44mzn5mb32ecvenf5es4spz3ig7lj6bst55bc3qvxcv2sjzkrc6lach5znxxx4xbedtcevehvkifjzdpa',
  updated_at = now()
WHERE key = 'ONESIGNAL_REST_API_KEY';
```

Trigger `notify_push_on_insert()` đã được setup ở migration trước để **auto-detect prefix `os_v2_`** → dùng header `Authorization: Key <token>` (đúng chuẩn OneSignal v16). Không cần sửa code thêm.

### Bước 2 — Verify ngay sau khi update
Chạy `supabase--read_query` để:
1. Đọc lại `system_config` xác nhận key đã update.
2. Insert 1 push test qua RPC `rpc_send_test_push()` (gọi từ logged-in admin) → check `v_push_health` xem `status_code = 200/202` chưa.

Nếu có lỗi:
- **403 lại** → key vẫn sai scope (chưa tick Full Access). Hướng dẫn user vào lại OneSignal sửa permissions.
- **400 invalid player_id** → user chưa subscribe trên thiết bị nào. Hướng dẫn vào Cài đặt → Thông báo bật toggle.
- **200 OK** → ✅ xong, thông báo cho user vào nút "Gửi thử push" để xác nhận thấy notification trên màn hình thật.

### Bước 3 — Hướng dẫn user test cuối cùng
1. Mở app trong **tab thật** (https://app.saigonholiday.vn — không phải iframe editor).
2. Vào **Cài đặt → Thông báo**:
   - Bật toggle "Thông báo" → cấp quyền cho trình duyệt.
   - Bấm **"Gửi thử push"** → nhận toast `✅ OneSignal nhận push OK` + thông báo thật xuất hiện trên màn hình (như Zalo).
3. Test trên ĐT: cài web app vào màn hình chính (Add to Home Screen) trên Chrome Android hoặc Safari iOS → mở app → bật thông báo → test tương tự.

### Bước 4 — Cleanup (sau khi user xác nhận thành công)
- Vào OneSignal Dashboard → **Disable Legacy API Key** cho gọn (key cũ không cần dùng nữa).
- Update memory `mem://features/notifications/web-push` ghi rõ ngày fix + format key mới.

## ⚠️ Rủi ro cần lưu ý
- Key này là **secret nhạy cảm** — sau khi paste vào migration thì migration file sẽ nằm trong repo. Đây là pattern hiện tại của project (cả key cũ cũng đã ở trong DB). Nếu sau này muốn an toàn hơn, có thể chuyển sang Supabase Secrets + Edge Function gọi push thay vì DB trigger — nhưng việc đó nằm ngoài phạm vi fix lần này.
- Nếu bạn lo bảo mật, sau khi key được lưu vào DB thành công, có thể quay lại OneSignal **Rotate** key (tạo mới + xoá cái này) rồi gửi tôi key mới hơn để update lại.

## ✅ Kết quả mong đợi
- Push notification gửi thành công với status 200/202 từ OneSignal.
- Tất cả thiết bị đã subscribe (laptop + ĐT) sẽ nhận thông báo realtime khi có @mention, lead cần follow-up, duyệt nghỉ phép, v.v.
- Có nút "Gửi thử push" trong Settings để admin tự kiểm tra mỗi khi nghi ngờ lỗi push.