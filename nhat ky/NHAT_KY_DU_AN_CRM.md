# 📓 NHẬT KÝ DỰ ÁN — SAIGON HOLIDAY CRM
> **Cập nhật:** 13/05/2026 (Phiên S3 + QUY_TRINH_v2)
> **Kho mã nguồn:** `https://github.com/infosaigonholiday-dev/saigon-crm-suite`
> **Thư mục máy:** `f:\SGH 2025\SGH 2025\ALL - AI\APP SGH\saigon-crm-suite`
> **Trang sản phẩm:** `https://app.saigonholiday.vn`

---

## 🤖 HƯỚNG DẪN CHO TRỢ LÝ AI ĐỌC FILE NÀY

### Cách giao tiếp với Tupun (Founder)
- **100% tiếng Việt**. Không dùng tiếng Anh chuyên ngành (bắt buộc giải thích tiếng Việt nếu dùng).
- Format BẢNG khi có thể.
- KHÔNG hỏi tới hỏi lui. Gộp prompt 1 lần.
- KHÔNG BAO GIỜ đề xuất xoay 4 secret (Resend, Supabase, 2 OneSignal). Founder đã bỏ vĩnh viễn.

### Phân vai
- **AI** = Kiến trúc sư + QA + PM
- **Lovable** = Lập trình viên + DevOps
- **Tupun** = Founder + Tester

### 8 NGUYÊN TẮC CƠ BẢN (giữ nguyên)
1. Mỗi prompt phải có Danh sách kiểm tra.
2. Đầu phiên kiểm tra Prompt đang chờ.
3. Mỗi prompt phải có Hạn chót (2-4 ngày).
4. Prompt tài chính/phân quyền phải kiểm thử bảo mật.
5. Format BẢNG tinh giản (≤50 dòng).
6. Báo cáo phải có MINH CHỨNG (screenshot/SQL/code diff).
7. Bảo mật vật lý > bảo mật logic.
8. Bảng cấu hình nhạy cảm hỏi "Ai cần biết?".

### 🆕 8 NGUYÊN TẮC CHỐNG "FIX TỚI FIX LUI" (Mở rộng từ 5 → 8 — áp dụng từ 13/05/2026)
1. Mô tả yêu cầu trước, lập trình sau.
2. Một nguồn sự thật duy nhất.
3. CSDL chủ động khi có thể.
4. Kiểm thử theo luồng, không theo hàm.
5. Bản di trú phải có thể hoàn tác.
6. **NT1 — Reality Check:** TRƯỚC mỗi prompt chính, Lovable PHẢI chạy AUDIT ngắn xác nhận hiện trạng DB/code thật. Paste kết quả → AI xem → mới viết prompt chính. ❌ KHÔNG bao giờ viết prompt dựa nhật ký cũ.
7. **NT2 — Verify-First Done:** Mỗi prompt PHẢI có "Self-Verify SQL" (≥3 lệnh SQL/grep + KQ mong đợi). Lovable CHỈ được báo done sau khi paste output thực. ❌ KHÔNG output = chưa done.
8. **NT3 — Scope Lock:** Mỗi prompt có "Phạm vi cấm" + "Phạm vi đủ" (PHẢI scan/sửa đủ N file/bảng, báo số lượng).

---

## 🚦 TRẠNG THÁI HỆ THỐNG (Đến 13/05/2026)

| Hạng mục | Số liệu |
|---|---|
| Bảng CSDL | ~102 (+1 `tour_guides`, +1 `admin_force_delete_log`, +1 `resource_labels`, +1 `action_labels`) |
| RLS Policies | ~300 (cập nhật theo S2A+S3B) |
| Triggers / Functions | ~108 / ~123 (+`trg_auto_assign_permissions`, +3 RPC `admin_force_delete_*`, +`sync_role_permissions_to_employees`, +`count_employees_by_role`) |
| Hàm Edge | 9 |
| Loại thông báo | 39 |
| RPC SECURITY DEFINER | 13 (+5 mới) |
| User / Role active | 28 / **30** (22 cũ + 8 mới: SALE_LEADER, SALE_INTERN, MKT_LEADER, MKT_INTERN, OP_LEADER, OP_INTERN, HR_INTERN, ACC_INTERN) |
| Nhãn VN | 35 resource + 10 action |
| Build & Test | Bundle ~5.2MB, Vitest ~49/49 pass |
| **Public-ready** | **❌ Chưa** (chờ S3C + PATCH_HARDCODE + fix `user_id` bug) |

---

## 🛠️ THÔNG TIN KỸ THUẬT VÀ BẢO MẬT

### Phân quyền nhạy cảm (Không được sai)
- **SUPER_ADMIN / ADMIN**: Toàn quyền (bypass cứng bằng `userRole === "ADMIN"`).
- **CEO**: Full duyệt cuối.
- **KETOAN / CHIEF_ACCOUNTANT**: Duyệt chi, P&L, Dòng tiền, `commission_config`.
- **GDKD**: Phạm vi phòng + `commission_config` + chỉ TĂNG giá tour.
- **DEPUTY (Phó phòng)**: Cũ là MANAGER, đã rename ngày 12/05. Quyền: phạm vi phòng/nhánh.
- **MANAGER_*** (MKT/OP/SALE/HR_MANAGER): Trưởng phòng, quyền giới hạn phòng.
- **\*_LEADER**: Kế thừa role cha - `approve` action tài chính.
- **\*_INTERN**: Chỉ `view` + `create` (nháp).
- **Sale_***: Chỉ khách của mình. KHÔNG MKT, KHÔNG `commission_config`.
- **HR_MANAGER / HCNS**: Lương, PII. KHÔNG thấy hộ chiếu khách.

### Cấu trúc quan trọng (cập nhật)
- Files: `PermissionsContext.tsx`, `AuthContext.tsx`, `usePermissions.ts`, `AppSidebar.tsx`, `permissionAllowlists.ts`, `useLabels.ts` (mới), `SyncRoleDialog.tsx` (mới), `AdminBookingActions.tsx` (mới).
- Master Matrix: Quản lý phân quyền qua file `permissionMasterSpec.ts` và database `permission_review_signoffs`.
- Nhãn VN: `resource_labels` (35 dòng) + `action_labels` (10 dòng) trong DB. Hook `useLabels.ts` đọc 2 bảng.
- HDV: Đã tách khỏi role hệ thống. Bảng `tour_guides` (không login) chứa thông tin HDV cho điều hành chi công tác phí.
- Cấu trúc thư mục: Output prompt lưu ở `/mnt/user-data/outputs/` dưới dạng file `.md`. KHÔNG paste code/bảng dài vào chat.

### Schema lưu ý
- Bảng phân quyền NV: **`employee_permissions`** (KHÔNG phải `user_permissions`). Có 2 cột mới từ S3B: `is_override boolean`, `assigned_via text`.
- Bảng audit force delete: `admin_force_delete_log` (snapshot 9 bảng con dạng jsonb).
- 3 trường HR đã chốt: `employees.position` (enum 3 mức: THUC_TAP_SINH/TRUONG_PHONG/GIAM_DOC) + `profiles.role` (30 system role). `employees.level` cũ đã DROP.

---

## 📦 TÓM TẮT TIẾN ĐỘ DỰ ÁN ĐÃ HOÀN THÀNH

- **Phiên 08-09/05 (Nền tảng):** Di trú `role_permissions`, Tái cấu trúc Quyền (9/9), LKH Tour (5/5 giai đoạn), Xử lý 11 lỗ hổng bảo mật, Quota nghỉ phép.
- **Phiên 10/05 (Tài chính & Push):** UI Dự toán/Quyết toán, Matrix notification 33 loại, Backfill `bookings.department_id`, OneSignal Push tracking triệt để.
- **Phiên 10-12/05 (Marketing Phase 1):** Bảng `mkt_tasks`, UI Kanban (`/mkt-board`), Dashboard 4 KPI, Calendar, Export PDF/Excel, 5 Trigger MKT, Storage `mkt-attachments`.
- **Phiên 11/05 (Tối ưu hoá OPT 1-4):** Bundle Split (-97% MktDashboardPage), Font/Asset (Logo WebP), Native-feel (Skeleton, View Transition, Auto-close sidebar), STABLE RPCs, FK index, RLS rút gọn.
- **Phiên 11/05 (Audit Phân quyền & Fix Bugs):** Báo cáo STATUS-001, Audit phân quyền vòng 2, Cấu trúc Settings 4 tab lớn. Fix BUG-001 đến BUG-007.
- **Phiên 12/05 (UI Phân quyền & Dọn Schema):** Header 3 dòng Modal, Bulk/Single revoke UI, Fix RLS `employees` chặn INSERT, Áp 80 quyết định Master_v1 cho GDKD + HR_MANAGER. Dọn schema (drop `employees.level`, fix 5 case PII).
- **🆕 Phiên 13/05 (Chiến dịch SETTINGS_REFACTOR):**
  - ✅ **S1 — Foundation**: Tạo `resource_labels` 26 nhãn VN + audit 3 trường HR. Phát hiện DB chỉ có 2 trường (`employees.position` + `profiles.role`), KHÔNG có `position_level/title` như nhật ký cũ ghi.
  - ✅ **S2A — Role rekey**: Đổi `MANAGER`→`DEPUTY` (4 NV + 46 quyền), thêm 8 role con (`*_LEADER`/`*_INTERN`), xoá `GUIDE`, tạo bảng `tour_guides` (HDV không login).
  - ✅ **S2B — Map 7 case drift**: Mai Xuân Khanh→KETOAN, Trần Trọng Khanh→HR_MANAGER, Bùi Minh Thành→MKT, Lê Thị Thảo Linh→DIEUHANH, Gia Bảo→DEPUTY.
  - ✅ **PATCH UI Việt hoá**: 35 resource + 10 action labels, 6 section header VN, header role ngang ngắn + tooltip.
  - ✅ **S3B — Auto-assign + Sync option B**: Trigger `trg_auto_assign_permissions`, RPC `sync_role_permissions_to_employees`, RPC `count_employees_by_role`, UI `SyncRoleDialog.tsx`. 8 role con có quyền (LEADER 15-44, INTERN 13-33).
  - ✅ **PATCH_ADMIN_FORCE_DELETE v2**: 3 RPC `admin_force_delete_*`, bảng `admin_force_delete_log` (snapshot 9 bảng), UI `AdminBookingActions.tsx`. Đã xoá thật booking BK-BBK5N4DG-260509 đang block.
  - ✅ **QUY_TRINH_LAM_VIEC_v2.md**: Chuẩn hoá 3 nguyên tắc NT1+NT2+NT3 + template mới.

---

## ⚠️ VẤN ĐỀ CÒN TỒN ĐỌNG

1. 🔴 **Lỗi `column "user_id" does not exist`** trên trang Ma trận v2 — đang AUDIT (`AUDIT_USER_ID_COLUMN.md` đã gửi Lovable).
2. 🟡 **S3C UI Quyền cá biệt + Confirm dialog đổi role NV** — Lovable đang làm.
3. 🟡 **PATCH_HARDCODE_MANAGER_SCAN v2** — Lovable đang làm. Cần để mở đường deploy production.
4. 🟢 **Push Notifications**: OneSignal push hệ thống chưa ra thiết bị (edge timeout) — chưa ưu tiên.

---

## 🔥 VIỆC PHIÊN TỚI (ƯU TIÊN TUYỆT ĐỐI)

### 🔴 Khẩn
1. Anh paste output `AUDIT_USER_ID_COLUMN.md` về → AI viết `PATCH_FIX_USER_ID_COLUMN.md`.
2. Đợi Lovable hoàn thiện S3C + PATCH_HARDCODE.

### 🟡 Quan trọng
- Sau khi 3 patch trên xong → deploy production lần 1 cho module Settings.
- Soạn `PERMISSIONS_SPEC_v3.md` reflect 30 role cuối cùng.

### 🟢 Tuỳ chọn
- Fix pipeline OneSignal push.
- Code-split MktBoardPage.

---

## 📝 6 BÀI HỌC CỐT LÕI (Mở rộng từ 5 → 6)

1. **Kiến trúc dữ liệu:** UI rối thường do CSDL thiết kế thừa/chồng chéo. Phải rà soát và gộp trường, không fix lẻ tẻ.
2. **Code & CSDL:** Query Supabase JOIN phải rõ FK. Tạo index cho FK. Không drop cột chứa PII khi chưa backfill. RLS INSERT phải tách biệt khỏi logic đọc.
3. **UI/UX:** Thêm giải thích rõ cho mọi lỗi/khoá quyền (tooltip, banner). Tab Cài đặt phải linh hoạt theo vai trò.
4. **Phân quyền Master:** "Ký quyết định" và "Áp vào DB thật" là 2 lớp khác nhau. Tránh dùng 1 role key cho nhiều chức năng (tránh key overload).
5. **Prompting & Giao tiếp:** Đừng cho Lovable chạy thẳng sửa Database nếu chưa rà soát. Mọi output dài phải xuất ra file MD độc lập.
6. **🆕 AUDIT trước khi viết prompt (NT1):** AI từng đoán mò tên cột (`user_id` thay vì `employee_id`) → gây lỗi production. Bài học: TRƯỚC mọi prompt đụng bảng/cột, phải AUDIT cột thực bằng `information_schema.columns`. Đoán mò = vi phạm NT1.

---

## 📁 FILE PROMPT ĐÃ XUẤT TRONG CHIẾN DỊCH

| File | Trạng thái |
|---|---|
| `SETTINGS_REFACTOR_S1.md` | ✅ Pass 5/5 |
| `SETTINGS_REFACTOR_S2A.md` | ✅ Pass 5/5 |
| `SETTINGS_REFACTOR_S2B.md` | ✅ Pass (inline) |
| `PATCH_UI_VIETHOA_PHANQUYEN.md` | ✅ Pass 7/7 |
| `SETTINGS_REFACTOR_S3B.md` | ✅ Pass 6/6 (Lovable đã đổi tên bảng `user_permissions`→`employee_permissions`) |
| `PATCH_ADMIN_FORCE_DELETE_v2.md` | ✅ Pass 7/7 |
| `SETTINGS_REFACTOR_S3A_v2.md` | 🟡 chờ Lovable |
| `SETTINGS_REFACTOR_S3C_v2.md` | 🟡 chờ Lovable |
| `PATCH_HARDCODE_MANAGER_SCAN_v2.md` | 🟡 chờ Lovable |
| `AUDIT_USER_ID_COLUMN.md` | 🟡 chờ Lovable AUDIT |
| `QUY_TRINH_LAM_VIEC_v2.md` | ✅ Đã áp dụng từ 13/05 |