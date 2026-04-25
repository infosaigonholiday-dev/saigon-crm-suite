## Chẩn đoán thực tế (khác với mô tả ban đầu)

Sau khi đọc code và edge function logs, vấn đề **KHÔNG** phải thiếu trigger hay nút test — những thứ đó đã có. Vấn đề thực:

| Mục bạn yêu cầu | Tình trạng thực tế |
|---|---|
| (1) Trigger AFTER INSERT gọi pg_net | ✅ Đã tồn tại (`notify_push_on_insert`) — log xác nhận có chạy |
| (2) `EXCEPTION WHEN OTHERS THEN NULL` nuốt lỗi | ⚠️ Đúng một phần — `notify_push_on_insert` đã ghi audit_logs, nhưng inner block vẫn còn `NULL` |
| (3) Nút test thông báo trong Settings | ✅ Đã có (`handleTestPush` trong `PushNotificationToggle.tsx`) |
| (4) Hardcoded VAPID key dòng 6 | ❌ Không tồn tại — chỉ đọc `import.meta.env`, đã throw cảnh báo |

**Lỗi thật trong logs:**
```
[send-notification] push failed status=400 body={"reason":"VapidPkHashMismatch"}
```
→ Subscription đã lưu trong DB được ký bằng VAPID key cũ. Frontend hiện tại có VAPID key mới. Apple từ chối vì 2 key không khớp. Người dùng đã tắt/bật push một lần nhưng subscription vẫn cũ vì SW cache.

## Kế hoạch fix (4 thay đổi nhỏ, chính xác)

### 1. `src/hooks/usePushSubscription.ts` — Auto-detect & re-subscribe khi VAPID mismatch
Khi kiểm tra subscription hiện tại, so sánh `applicationServerKey` (lấy từ `subscription.options.applicationServerKey`) với `VITE_VAPID_PUBLIC_KEY`. Nếu khác:
- Tự động `unsubscribe()` cũ
- Xóa record cũ trong DB (`push_subscriptions.endpoint = old.endpoint`)
- Tạo subscription mới ngay lập tức (nếu permission='granted')
- Log rõ ràng: `[push] VAPID key changed, auto re-subscribing…`

Đây là fix cốt lõi: lần tới user mở app, subscription tự sync mà không cần thao tác.

### 2. `src/components/PushNotificationToggle.tsx` — Thêm nút "Đăng ký lại subscription"
Khi user thấy nút "Gửi thử push" báo `failed=1`, hiện kèm 1 nút "Đăng ký lại" để buộc unsubscribe + subscribe mới (gọi tay phòng trường hợp auto-detect chưa kịp).

### 3. `supabase/functions/send-notification/index.ts` — Log endpoint+statusCode chi tiết hơn
Khi gặp `VapidPkHashMismatch` (status 400 với body chứa "Vapid"), log thêm dòng cảnh báo:
`[send-notification] VAPID mismatch — client subscription stale, will be recreated on next visit`
→ Giúp dễ chẩn đoán trong tương lai.

### 4. Migration: cải thiện trigger `notify_push_on_insert`
- Vẫn ghi audit_logs khi pg_net fail (đã có)
- Bỏ inner `EXCEPTION WHEN OTHERS THEN NULL` của block insert audit_logs — nếu insert audit fail thì raise WARNING (không crash trigger gốc)
- Không tạo trigger mới (trigger đã tồn tại trên bảng `notifications`)

### Test sau khi fix
1. Mở app trên iPhone → console sẽ tự log "VAPID key changed, auto re-subscribing"
2. Subscription mới được tạo với VAPID key đúng
3. Tạo đơn nghỉ phép từ tài khoản khác → trigger `notify_leave_request_change` insert notification → trigger `notify_push_on_insert` gọi edge function → push xuất hiện trên iPhone

## Files sẽ chỉnh
- `src/hooks/usePushSubscription.ts` (logic auto re-subscribe)
- `src/components/PushNotificationToggle.tsx` (nút đăng ký lại)
- `supabase/functions/send-notification/index.ts` (log chi tiết)
- 1 migration nhỏ chỉnh `notify_push_on_insert`

**Không** đổi VAPID key, **không** xóa subscriptions table, **không** tạo trigger trùng.