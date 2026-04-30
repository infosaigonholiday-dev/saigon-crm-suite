## Mục tiêu
Pass TC12 (RLS chặn entity của người khác) + TC13 (entity bị huỷ) bằng cách wire `EntityNotAccessible` vào 5 trang detail.

## Bonus check (đã chạy ✅)
```
SELECT id, type, priority, action_required FROM notifications WHERE action_url IS NULL;
→ 2 rows: NEW_ONLINE_LEAD + NEW_EMPLOYEE, cả 2 đều action_required=false, priority=medium ✓
```
Đúng ràng buộc `chk_action_url_required` — không có noti high/critical hoặc action_required nào thiếu URL.

## Phạm vi

### 1. `src/components/shared/EntityNotAccessible.tsx`
Mở rộng API: thêm prop `mode?: "forbidden" | "cancelled" | "not_found"` (alias mới theo spec). Giữ `reason` cũ cho backward compat. `cancelled` map sang label "đã bị huỷ" với icon riêng.

### 2. Pattern áp dụng cho 5 file detail
Vấn đề: query hiện đang `.single()` + `throw error` trong queryFn → component mất khả năng phân biệt PGRST116 vs lỗi khác. Spec đề xuất check `error?.code === 'PGRST116'`, nhưng vì RLS chặn cũng trả về PGRST116 (không có row), ta dùng pattern an toàn hơn:

- Đổi `.single()` → `.maybeSingle()` (tuân theo Lovable rule).
- queryFn trả về `data` (có thể `null`).
- Trong component:
  ```tsx
  if (isLoading) return <Loader/>;
  if (!data) return <EntityNotAccessible kind="..." backTo="..." mode="forbidden" />;
  if (data.status === 'cancelled' /* hoặc CANCELLED / RESIGNED / deleted_at */) 
    return <EntityNotAccessible kind="..." backTo="..." mode="cancelled" />;
  ```

Lý do dùng `mode="forbidden"` cho `data===null`: an toàn nhất, không lộ tồn tại của entity (info-leak prevention) — vẫn đóng được TC12.

### 3. Map kind / backTo / cancelled-condition

| File | kind | backTo | cancelled check |
|---|---|---|---|
| `CustomerDetail.tsx` | "Khách hàng" | `/khach-hang` | (không có status/deleted_at → bỏ qua TC13) |
| `BookingDetail.tsx` | "Booking" | `/dat-tour` | `data.status === 'CANCELLED'` |
| `TourFileDetail.tsx` | "Hồ sơ đoàn" | `/ho-so-doan` | `data.status === 'cancelled'` |
| `EmployeeDetail.tsx` | "Nhân viên" | `/nhan-su` | `data.status === 'RESIGNED' \|\| !!data.deleted_at` |
| `CampaignDetail.tsx` | "Chiến dịch" | `/chien-dich` | `data.status === 'cancelled'` |

CustomerDetail không có cột huỷ → chỉ wire `mode="forbidden"` (đóng TC12). TC13 cho Customer skip — note rõ trong code comment.

### 4. Verify sau khi wire
- **TC12**: pick 1 customer của user X, login user Y (Sale), URL `/khach-hang/<X-id>` → `data===null` (RLS chặn) → banner "Bạn không có quyền xem Khách hàng này" + 2 nút.
- **TC13**: 
  ```sql
  UPDATE bookings SET status='CANCELLED' WHERE id='<test-id>';
  ```
  → URL `/dat-tour/<id>` → banner "Booking này đã bị huỷ".

## Files thay đổi (6)
- `src/components/shared/EntityNotAccessible.tsx`
- `src/pages/CustomerDetail.tsx`
- `src/pages/BookingDetail.tsx`
- `src/pages/TourFileDetail.tsx`
- `src/pages/EmployeeDetail.tsx`
- `src/pages/CampaignDetail.tsx`

## Không thay đổi
- DB schema, RLS, notification action_url logic, navigation từ NotificationBell.
