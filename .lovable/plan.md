

## Thêm chuông thông báo vào header

### Tổng quan
Tạo component `NotificationBell` với popover hiển thị danh sách thông báo chưa đọc, tích hợp vào header AppLayout.

### Kế hoạch

**1. Tạo `src/components/NotificationBell.tsx`**

- useQuery poll notifications mỗi 60s: query `notifications` where `user_id = auth.uid()`, `is_read = false`, order by `created_at desc`, limit 20
- Realtime subscription qua `supabase.channel()` để refetch khi có INSERT mới
- UI: Button chứa Bell icon (20px) + badge đỏ tròn (absolute positioned) hiển thị count
- Click → Popover (shadcn) dropdown:
  - Mỗi item: icon theo type (Cake/Building2/Phone/CreditCard), title bold, message muted 12px, thời gian relative (date-fns `formatDistanceToNow` với locale vi)
  - Click item → mark as read + navigate `/khach-hang/{entity_id}`
  - Footer: "Đánh dấu tất cả đã đọc" button

**2. Cập nhật `src/components/AppLayout.tsx`**

- Import NotificationBell, đặt trước avatar trong header (line 19, bên trong div `ml-auto`)

### Dependencies
- `date-fns` đã có trong project (dùng ở nhiều nơi)
- Cần thêm locale `vi` từ `date-fns/locale/vi`

### Files thay đổi
- `src/components/NotificationBell.tsx` — mới
- `src/components/AppLayout.tsx` — thêm import + render NotificationBell

