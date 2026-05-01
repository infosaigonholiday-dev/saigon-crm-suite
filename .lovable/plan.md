# Bộ tài liệu Training Vận hành — docs/training/

Tạo MỚI folder `docs/training/` (song song và độc lập với folder `Training/` hiện hữu, vốn chỉ dành cho training thao tác CRM cơ bản). Bộ mới này tập trung vào **quy trình vận hành + chế tài + flow liên phòng** theo triết lý 5 bước SGH.

## 1. Cấu trúc file

```
docs/training/
├── index.html                       Mục lục + sơ đồ tổng + 5 bước
├── 00_TONG_QUAN.html                Overview, sơ đồ phòng ban, Chu trình 5 bước
├── 01_SALE.html                     Phòng Kinh doanh
├── 02_DIEU_HANH.html                Phòng Điều hành
├── 03_KE_TOAN.html                  Phòng Kế toán
├── 04_HCNS.html                     Phòng HCNS
├── 05_MARKETING.html                Phòng Marketing
├── 06_QUAN_LY_CEO_GDKD.html         CEO + GĐKD
├── 07_FLOW_LIEN_PHONG.html          Sơ đồ luồng phối hợp 6 luồng chính
├── 08_HUONG_DAN_TAI_KHOAN.html      Đăng nhập, reset pass, đổi pass, push
├── 09_CHE_TAI_KY_LUAT.html          Khung chế tài 5 bậc
├── 10_FAQ_LOI_THUONG_GAP.html       Top 20 FAQ
└── _shared.css                      (KHÔNG tạo — inline CSS theo yêu cầu)
```

Mỗi file **HTML tự chứa** (inline `<style>` trong `<head>`) → mở offline được, in PDF được, < 200KB.

## 2. Template chuẩn cho mọi file

Mỗi file gồm:
- `<header>`: logo text "SGH CRM" gradient + tiêu đề + ngày cập nhật `01/05/2026`
- `<aside class="sidebar">`: navigation cố định bên trái với link tới 11 file còn lại + table-of-contents nội bộ (anchor `#section-id`)
- `<main>`: nội dung chính
- Khối callout: `.box-warn` (vàng), `.box-danger` (đỏ), `.box-success` (xanh), `.box-info` (xanh dương)
- `<footer>`: "Phiên bản 1.0 — 01/05/2026 — Cập nhật: HCNS phối hợp IT"
- `@media print`: ẩn sidebar + header sticky, đổi màu nền trắng, ép A4 width 210mm, page-break-inside avoid cho mỗi `<section>`
- `@media (max-width: 768px)`: sidebar trở thành menu trượt với nút hamburger

## 3. Triết lý 5 bước SGH (lặp trong mọi file phòng ban)

```text
[1 Phân công]→[2 Thực thi]→[3 Rà soát]→[4 Đối chiếu]→[5 Chuẩn hóa]
```

Mỗi file phòng ban có 1 section "Chu trình 5 bước áp dụng cho [phòng X]" với bảng cụ thể: Bước → Hoạt động cụ thể → Minh chứng cần nộp → Module CRM dùng → KPI đo.

## 4. Nội dung trọng tâm từng file

| File | Điểm khác biệt cốt lõi |
|------|------------------------|
| **00_TONG_QUAN** | Sơ đồ tổ chức, 22 roles tổng quan, 5 bước, nguyên tắc "minh chứng > lời hứa" |
| **01_SALE** | Lead Kanban 5 cột + badge nhiệt độ 🔥🟡❄️, deadline mặc định: phản hồi lead trong 4h, follow-up trong 24h, lead lạnh > 7 ngày auto-cảnh báo |
| **02_DIEU_HANH** | Hồ sơ Tour + tour_tasks workflow, deadline phân HDV trước khởi hành 5 ngày, upload chứng từ NCC bắt buộc |
| **03_KE_TOAN** | **Phân quyền nhạy cảm**: KETOAN xem Lợi nhuận, GDKD KHÔNG xem (highlight box-danger). Duyệt 2 lớp HCNS→KT, dự toán/quyết toán escalate 48h/72h |
| **04_HCNS** | Tuyển dụng Kanban 7 cột, onboarding modal, payroll 5-stage. Nhập chi phí HCNS → pending_approval → KT duyệt |
| **05_MARKETING** | Campaigns module, milestone auto-recalc, bàn giao lead về Sale (deadline 24h) |
| **06_QUAN_LY_CEO_GDKD** | CEO: full quyền + duyệt cuối Quyết toán/Lương/Phiếu chi. **GDKD: chỉ xem doanh thu nhánh, KHÔNG thấy lợi nhuận** (box-danger). Audit log read-only |
| **07_FLOW_LIEN_PHONG** | 6 sơ đồ flow ASCII với bảng "ai gửi / ai nhận / deadline / minh chứng / chỉ số" |
| **08_HUONG_DAN_TAI_KHOAN** | Reset password flow Resend mới (KHÔNG đề cập Supabase Auth Hook). Mật khẩu mặc định "sgh123456", link reset valid 1h + 1 lần dùng. Push notification setup |
| **09_CHE_TAI_KY_LUAT** | 5 mức vi phạm (1 cho mỗi bước chu trình) + bậc kỷ luật từ "Nhắc nhở" → "Đề xuất xét lại vai trò" (KHÔNG đề xuất sa thải/phạt tiền tự động) |
| **10_FAQ** | 20 câu hỏi với câu trả lời ngắn + link tới file chi tiết |

## 5. Sơ đồ flow liên phòng (file 07)

6 flow chính, mỗi flow có sơ đồ ASCII + bảng metadata:

```text
1) MKT → SALE        (lead chuyển giao, deadline 24h)
2) SALE → ĐIỀU HÀNH  (booking confirmed → tạo hồ sơ tour, deadline 4h)
3) ĐIỀU HÀNH → KT    (chi phí tour → duyệt, deadline 48h)
4) SALE → KT         (thu cọc/thanh toán, real-time)
5) HCNS → KT         (chi phí lương → duyệt, deadline tháng)
6) TẤT CẢ → CEO      (báo cáo + duyệt cuối)
```

## 6. Quy ước nội dung — CẤM

- KHÔNG hardcode credential thật, URL Supabase, OneSignal App ID
- KHÔNG show screenshot có data KH thật (dùng tên giả: "Anh Minh", "Chị Lan")
- KHÔNG đề xuất sa thải / phạt tiền tự động trong file Chế tài
- KHÔNG ghi tên nhân sự thật

## 7. Verify checklist (chạy sau khi tạo)

1. `ls docs/training/ | wc -l` → 12 file
2. Mở `index.html` trong trình duyệt → tất cả 11 link ăn đúng
3. `grep -l "Phân công.*Thực thi.*Rà soát.*Đối chiếu.*Chuẩn hóa" docs/training/0[1-6]*.html` → 6 file
4. `grep "GDKD.*KHÔNG.*lợi nhuận\|GDKD.*không.*lợi nhuận" docs/training/03_KE_TOAN.html docs/training/06_QUAN_LY_CEO_GDKD.html` → match
5. `grep -c "1 lần dùng\|1 giờ" docs/training/08_HUONG_DAN_TAI_KHOAN.html` → ≥ 2
6. Wordcount mỗi file > 800 từ, file size < 200KB

## 8. Phạm vi KHÔNG đụng

- KHÔNG sửa folder `Training/` cũ (giữ song song)
- KHÔNG sửa code app, không sửa DB, không thêm route
- KHÔNG đụng `AUTH_CONFIG.md`, `eslint.config.js`, edge functions

## Output

Sau khi build xong, tôi sẽ paste:
- `ls -la docs/training/` (12 file + size)
- 1 đoạn HTML mẫu của `index.html` để anh thấy giao diện mục lục
- Snippet phần "Chu trình 5 bước" giống nhau giữa các file phòng ban (verify item 3)
