

## Tạo file DOCX: Mô tả cấu trúc bảng Khách hàng & Leads

### Nội dung tài liệu
Gom toàn bộ phân tích đã cung cấp trước đó vào 1 file Word, bao gồm:

1. **Bảng Customers** — cấu trúc cột, constraints (type, tier, segment, tax_code), trigger tự gán department, scoping theo role, tính năng frontend (search, filter, export CSV, loyalty badge, phân trang)
2. **Bảng Leads** — cấu trúc cột, constraints (channel, interest_type, status), Kanban board, duplicate check, conversion flow
3. **Ma trận phân quyền** — ADMIN / GDKD / Sale / TTS xem/tạo/sửa gì
4. **Quan hệ giữa 2 bảng** — conversion lead → customer, trường mapping

### Cách thực hiện
- Dùng `docx` (npm) để generate file .docx chuyên nghiệp
- Xuất ra `/mnt/documents/CauTruc_KhachHang_Leads.docx`
- QA bằng convert sang image để kiểm tra layout

### Output
1 file DOCX ~5-8 trang, format bảng rõ ràng, tiếng Việt.

