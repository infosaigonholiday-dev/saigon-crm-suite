# Plan: Mở route `/training` để đọc tài liệu trên app

## Bước 1 — Copy 12 file HTML sang `public/training/`

Copy từ `docs/training/` (không serve được qua web) sang `public/training/` (Vite serve tĩnh).

12 file: `index.html`, `00_TONG_QUAN.html`, `01_SALE.html`, `02_DIEU_HANH.html`, `03_KE_TOAN.html`, `04_HCNS.html`, `05_MARKETING.html`, `06_QUAN_LY_CEO_GDKD.html`, `07_FLOW_LIEN_PHONG.html`, `08_HUONG_DAN_TAI_KHOAN.html`, `09_CHE_TAI_KY_LUAT.html`, `10_FAQ_LOI_THUONG_GAP.html`.

## Bước 2 — Tạo page `src/pages/Training.tsx`

Layout 2 cột:
- **Trái**: danh sách 11 chương (link)
- **Phải**: `<iframe src="/training/{filename}.html">` full-height

Mỗi item có nút **"Tải về (.html)"** (link `download` attribute) để anh tự tải sau khi đọc.

Header có nút **"Mở tab mới"** để xem fullscreen + print.

## Bước 3 — Add route + sidebar link

- `src/App.tsx`: add `<Route path="/training" element={<Training />} />` trong `AppLayout` (yêu cầu login).
- `src/components/AppSidebar.tsx`: thêm menu item **"Tài liệu Training"** icon `BookOpen` trong nhóm Admin/Hệ thống. Chỉ hiện cho ADMIN, CEO, HR_MANAGER, các MANAGER (không hiện cho Sale/Intern vì bộ tài liệu hiện đang có nội dung nhạy cảm cần fix).

## Bước 4 — Verify

- Mở `https://app.saigonholiday.vn/training` → thấy mục lục bên trái.
- Click "01. Sale" → iframe load đúng.
- Mở tab mới → file HTML hiển thị standalone, Ctrl+P preview A4 OK.
- Sidebar: login bằng tài khoản Sale → KHÔNG thấy menu. Login Admin → thấy menu.

## Bước 5 — Báo lại link cho anh

Sau deploy, em paste link `https://app.saigonholiday.vn/training` để anh vào đọc. Anh note chỗ nào cần fix → em sẽ sửa nội dung file HTML trong `public/training/` ở bước sau.

## Lưu ý

- Việc fix nội dung "lộ quyền nhạy cảm" chưa làm ở plan này — chờ anh đọc xong note lại.
- Không tạo ZIP. Anh tải từng file lẻ qua nút "Tải về" khi cần.
