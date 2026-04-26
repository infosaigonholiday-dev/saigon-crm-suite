# 🔍 Lỗi mới sau khi fix auth header

```
new row for relation "notifications" violates check constraint "notifications_type_check"
```

**Nguyên nhân**: Hàm `rpc_send_test_push()` insert notification với `type = 'TEST_PUSH'`, nhưng constraint `notifications_type_check` **chưa whitelist** giá trị này. → INSERT bị từ chối ngay → trigger push không kịp chạy.

→ Đây là lỗi mới phát sinh do mình tạo type chưa khai báo, **KHÔNG liên quan tới OneSignal**. Sau khi fix sẽ test được push thật.

# ✅ Việc cần làm (1 migration duy nhất)

1. **Mở rộng constraint** thêm `'TEST_PUSH'` vào whitelist (để dùng lâu dài cho test/debug):
   ```sql
   ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;
   ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
     CHECK (type = ANY (ARRAY[
       ...28 type cũ...,
       'TEST_PUSH'
     ]));
   ```

2. Không sửa code frontend, không sửa hàm khác.

# 🧪 Sau migration
- Bấm lại **Cài đặt → Thông báo → "Gửi thử push"**
- Kết quả mong đợi: toast hiện `status_code: 200` + thiết bị nhận push
- Nếu vẫn 403 → key OneSignal sai (cần tạo key mới)
- Nếu 400 "All included players are not subscribed" → cần bấm subscribe trước trên thiết bị này

# 📦 Output
- 1 migration mở rộng `notifications_type_check`
- 1 lần test verify status code thật từ OneSignal
