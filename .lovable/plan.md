

## Khẩn cấp bảo mật — 2 file cần sửa

### Thay đổi 1: `.gitignore` — Thêm `.env` entries

Thêm 3 dòng vào cuối file: `.env`, `.env.local`, `.env.production`

### Thay đổi 2: `src/integrations/supabase/client.ts` — Dùng env vars

Thay thế hardcoded URL và key bằng `import.meta.env.VITE_SUPABASE_URL` và `import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY`, kèm runtime check throw error nếu thiếu.

### Lưu ý quan trọng

- File `.env` đã tồn tại với đúng biến `VITE_SUPABASE_URL` và `VITE_SUPABASE_PUBLISHABLE_KEY` → app sẽ hoạt động bình thường
- Supabase anon key là **publishable key** (không phải secret), nên việc nó từng nằm trong code không phải lỗ hổng nghiêm trọng, nhưng dùng env vars vẫn là best practice
- Không thay đổi file nào khác

