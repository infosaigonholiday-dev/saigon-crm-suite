## 🎯 Vấn đề đã xác định

Sau khi kiểm tra log thật trong DB:

- ✅ OneSignal SDK browser đã hoạt động (bạn nhận được welcome notification khi subscribe).
- ✅ Trigger DB `notify_push_on_insert` đang được kích hoạt mỗi khi có `notifications` mới (10 push gần nhất đều có log).
- ❌ **Nhưng 100% request gửi đến OneSignal đều bị `403 Access denied`** với cùng một message:
  > `"Access denied. Please include an 'Authorization: ...' header with a valid API key"`

### Nguyên nhân gốc

Trigger đang dùng logic:
```sql
IF v_rest_key LIKE 'os_v2_%' THEN
  v_auth_header := 'Key ' || v_rest_key;   -- ❌ SAI cho app-level key
ELSE
  v_auth_header := 'Basic ' || v_rest_key;
END IF;
```

Sự thật về OneSignal v16:
| Loại key | Prefix | Header đúng |
|---|---|---|
| Legacy REST API Key | (không prefix) | `Basic <key>` |
| Organization-level v2 | `os_v2_org_*` | `Key <key>` |
| **App-level v2** | **`os_v2_app_*`** | **`Basic <key>`** ✅ |

Key bạn vừa tạo trên dashboard SGH-CRM là **app-level key** (`os_v2_app_l23tfx3w5rh2...`) — vẫn phải dùng `Basic`, không phải `Key`.

---

## 🔧 Việc cần làm

### 1. Sửa hàm `notify_push_on_insert()` trong DB

Đổi logic chọn header — luôn dùng `Basic` cho mọi key, trừ khi prefix là `os_v2_org_`:

```sql
IF v_rest_key LIKE 'os_v2_org_%' THEN
  v_auth_header := 'Key ' || v_rest_key;        -- chỉ org-level mới dùng Key
ELSE
  v_auth_header := 'Basic ' || v_rest_key;      -- mọi key khác dùng Basic
END IF;
```

### 2. Sửa edge function gửi push (nếu có)

Kiểm tra edge function `daily-reminders` và bất kỳ nơi nào khác gọi OneSignal API có dùng cùng logic header → sửa đồng nhất.

### 3. Test thực tế sau khi sửa

- Chạy lại `rpc_send_test_push()` từ giao diện Cài đặt → Thông báo.
- Kiểm tra `net._http_response` để xác nhận status `200` thay vì `403`.
- Xác nhận thấy notification thật bật ra trên thiết bị (khi tab không focus).

### 4. Cleanup

Xóa file migration cũ (đã có) hoặc giữ lại — không ảnh hưởng vì lần này chỉ sửa logic hàm, không đổi key.

---

## ❓ Tại sao trước đây đoán sai?

OneSignal docs mới (2024+) mô tả `Key <token>` là format chuẩn cho v2 keys, nhưng thực tế chỉ áp dụng cho **organization-level keys**. App-level keys vẫn theo format `Basic` cũ. Đây là điểm gây nhầm lẫn rất phổ biến trong cộng đồng — nhiều developer cũng gặp y hệt vấn đề này khi nâng cấp.

---

## ✅ Kết quả mong đợi sau khi sửa

- Toast "Gửi thử push" → status `200/202` thay vì `403`.
- Tin nhắn @mention trong ghi chú → push thật bật ra trên thiết bị.
- Đơn nghỉ phép, lead reminder, duyệt chi phí... → push tự động hoạt động.
- Welcome notification (đã chạy) tiếp tục hoạt động — không thay đổi.

Sau khi bạn duyệt plan, mình sẽ thực thi migration sửa hàm DB và yêu cầu bạn bấm "Gửi thử push" để xác nhận.