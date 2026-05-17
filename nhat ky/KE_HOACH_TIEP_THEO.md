# 🎯 KẾ HOẠCH PHIÊN TIẾP THEO

> **Cập nhật:** 09/05/2026 — sau ~20 giờ phiên 08-09/05
> **Hướng dẫn:** Đọc đầu phiên → làm theo thứ tự

---

## ⚠️ ĐỌC TRƯỚC KHI BẮT ĐẦU

1. **Đọc `NHAT_KY_DU_AN_CRM.md`** trước
2. **Phiên trước đã đóng gói:** Pha 1 + LKH Tour + Bảo mật 11/11 + 5 bug fix + Vitest 31/31
3. **Còn 4 việc chính** + 1 việc anh tự + 3 việc kiểm thủ công

---

## 🎯 THỨ TỰ ƯU TIÊN

### BƯỚC 1 — Anh kiểm thủ công (15 phút — anh làm)

#### 1.1. Login ADMIN → kiểm 10 trang
| # | Trang | Đợi gì |
|---|---|---|
| 1 | /b2b-tours | Vào OK, thấy 359 tour |
| 2 | /cai-dat | OK |
| 3 | /nhan-su | OK |
| 4 | /dat-tour | OK |
| 5 | /khach-hang | OK |
| 6 | /tiem-nang | OK |
| 7 | /tai-chinh | OK |
| 8 | /bang-luong | OK |
| 9 | /chien-dich | OK |
| 10 | /branch-dashboard | OK |

#### 1.2. Login Sale → kiểm anti-leak LKH
- Vào /b2b-tours
- F12 → Network → reload
- Đợi:
  - Hoa hồng = `commission_adl - 200.000`
  - KHÔNG có request `b2b_tour_commission_config`

#### 1.3. Verify quota Lâm Tuyết Trân
- Vào trang Nghỉ phép
- Đợi: 9 ngày (proration vì vào tháng 4)

---

### BƯỚC 2 — 4 việc đang chờ (Lovable làm — 1 giờ)

#### 2.1. Kiểm tra ma trận thông báo 33 loại
- Liệt kê đầy đủ matrix
- Tìm loại thiếu / action_url lỗi / trigger sai
- Phân tích push fail
- KHÔNG TỰ FIX, chỉ báo cáo

#### 2.2. Backfill `bookings.department_id`
- Dry-run trước
- Chờ confirm
- Apply + trigger phòng ngừa `auto_set_booking_department`
- File hoàn tác

#### 2.3. Verify Prompt #1 Dự toán/Quyết toán
- 6 tiêu chí UI module Tài chính
- Báo cáo từng tiêu chí đạt/chưa

#### 2.4. Sửa OneSignal Push 70% → 100%
- Điều tra log edge `send-notification`
- Phân tích nguyên nhân fail
- Đề xuất fix

→ Em đã có sẵn prompt gộp 4 việc trong nhật ký phiên trước. Anh paste vào Lovable.

---

### BƯỚC 3 — Anh tự làm (15 phút)

#### Xoay 4 mã bí mật đã lộ qua chat
| Mã | Cách |
|---|---|
| Resend API Key (`re_cYy59t8X_...`) | resend.com → Revoke + tạo mới → cập nhật Lovable Secrets |
| Supabase Webhook (`whsec_CM7lvjk...`) | Supabase Dashboard → Auth → Email Hooks → Regenerate |
| 2 OneSignal REST API Keys (`os_v2_app_...`) | onesignal.com → Settings → Keys → Rotate |

---

### BƯỚC 4 — Chạy E2E Playwright (Optional)

10 case đã viết, cần chạy ở môi trường có Chromium:

```bash
E2E_ADMIN_EMAIL=... E2E_ADMIN_PASSWORD=... \
E2E_BASE_URL=https://app.saigonholiday.vn \
bun run test:e2e
```

Anh chạy trên máy local nếu có Playwright cài sẵn.

---

### BƯỚC 5 (Optional) — LKH Tour cải tiến

Lovable đề xuất 4 mục:
- Kiểm tra mã tour trùng khi tạo/sửa
- Hộp thoại xác nhận khi đóng form chưa lưu
- Save sang RPC SECURITY DEFINER
- Bộ lọc & sắp xếp /b2b-tours

Làm khi rảnh, không gấp.

---

## 📊 ƯỚC LƯỢNG TỔNG

| Bước | Tg | Ai làm |
|---|---|---|
| 1. Anh kiểm thủ công | 15p | Anh |
| 2. 4 việc đang chờ | 1 giờ | Lovable |
| 3. Anh xoay secrets | 15p | Anh |
| 4. E2E Playwright | 30p | Anh máy local |
| 5. LKH cải tiến (optional) | 2 giờ | Lovable |
| **TỔNG bắt buộc** | **~2 giờ** | |

---

## 🚦 NGUYÊN TẮC KHI VÀO PHIÊN MỚI

| Nguyên tắc | Áp dụng |
|---|---|
| Verify trước, fix sau | Bước 1 trước Bước 2 |
| Báo cáo có MINH CHỨNG | Mỗi prompt yêu cầu screenshot/SQL |
| Không tin "đạt" trống | Check output thật |
| Module có thể đã build sẵn | Đọc nhật ký + hỏi Lovable trước |
| Bảng cấu hình nhạy cảm — hỏi "Ai cần biết?" | Trước khi viết RLS |
| ADMIN bypass mọi check | FE + DB |
| Whitelist KHÔNG DỊCH | Khi việt hoá |

---

## 🎯 TÓM 1 DÒNG

> **Anh kiểm thủ công 3 việc → 4 việc Lovable → Anh xoay 4 mã bí mật → Phiên đóng gói.**

~2 giờ là dứt phiên.

---

## 📋 SAU PHIÊN NÀY

| Pha | Việc |
|---|---|
| Pha 2 | Mẫu "Mô tả yêu cầu trước, dựng sau" |
| Pha 3 | PERMISSIONS_SPEC.md |
| Pha 4 | DB-driven 4 chỗ cứng |
| Pha 5 | Hệ thống thiết kế giao diện |
| Module mới | Marketing, ATS, Smart Payroll, Dashboard CEO |

---

*File này là GPS phiên sau. Đọc đầu phiên, làm theo thứ tự.*
