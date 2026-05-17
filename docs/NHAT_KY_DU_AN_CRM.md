# 📓 NHẬT KÝ DỰ ÁN — SAIGON HOLIDAY CRM
> **Cập nhật:** 17/05/2026 (Merge snapshot 13/05 + phân tích GitHub 17/05)
> **Kho mã nguồn:** `https://github.com/infosaigonholiday-dev/saigon-crm-suite`
> **Thư mục máy:** `f:\SGH 2025\SGH 2025\ALL - AI\APP SGH\saigon-crm-suite`
> **Trang sản phẩm:** `https://app.saigonholiday.vn`

---

## 🤖 HƯỚNG DẪN CHO TRỢ LÝ AI ĐỌC FILE NÀY

### Cách giao tiếp với Tupun (Founder)
- **100% tiếng Việt**. Bắt buộc giải thích tiếng Việt nếu phải dùng thuật ngữ kỹ thuật.
- Format BẢNG khi có thể. KHÔNG hỏi tới hỏi lui. Gộp prompt 1 lần.
- KHÔNG BAO GIỜ đề xuất xoay 4 secret (Resend, Supabase, 2 OneSignal). Founder đã bỏ vĩnh viễn.
- Output dài → xuất file MD độc lập. KHÔNG paste code/bảng dài vào chat.

### Phân vai
- **AI** = Kiến trúc sư + QA + PM
- **Lovable** = Lập trình viên + DevOps
- **Tupun** = Founder + Tester

### 8 NGUYÊN TẮC CƠ BẢN
1. Mỗi prompt phải có Danh sách kiểm tra.
2. Đầu phiên kiểm tra Prompt đang chờ.
3. Mỗi prompt phải có Hạn chót (2-4 ngày).
4. Prompt tài chính/phân quyền phải kiểm thử bảo mật.
5. Format BẢNG tinh giản (≤50 dòng).
6. Báo cáo phải có MINH CHỨNG (screenshot/SQL/code diff).
7. Bảo mật vật lý > bảo mật logic.
8. Bảng cấu hình nhạy cảm hỏi "Ai cần biết?".

### 8 NGUYÊN TẮC CHỐNG "FIX TỚI FIX LUI" (Áp dụng từ 13/05/2026)
1. Mô tả yêu cầu trước, lập trình sau.
2. Một nguồn sự thật duy nhất.
3. CSDL chủ động khi có thể.
4. Kiểm thử theo luồng, không theo hàm.
5. Bản di trú phải có thể hoàn tác.
6. **NT1 — Reality Check:** TRƯỚC mỗi prompt, Lovable PHẢI chạy AUDIT xác nhận hiện trạng DB/code thật. ❌ KHÔNG viết prompt dựa nhật ký cũ.
7. **NT2 — Verify-First Done:** Mỗi prompt PHẢI có "Self-Verify SQL" (≥3 lệnh). Lovable CHỈ được báo done sau khi paste output thực.
8. **NT3 — Scope Lock:** Mỗi prompt có "Phạm vi cấm" + "Phạm vi đủ" (đếm số file/bảng phải sửa).

---

## ✋ DECISION ĐÃ CHỐT — KHÔNG HỎI LẠI

| Quyết định | Nội dung |
|---|---|
| Tên bảng phân quyền NV | `employee_permissions` (KHÔNG phải `user_permissions`) |
| 3 trường HR | Chỉ giữ `employees.position` (3 mức: THUC_TAP_SINH/TRUONG_PHONG/GIAM_DOC) + `profiles.role` (30 role). `employees.level` đã DROP |
| HDV | Tách khỏi role login → bảng `tour_guides` riêng (không login) |
| MANAGER | Đã rename thành `DEPUTY` (phó phòng) ngày 12/05 |
| Role active | **30** (22 cũ + 8 mới: SALE_LEADER, SALE_INTERN, MKT_LEADER, MKT_INTERN, OP_LEADER, OP_INTERN, HR_INTERN, ACC_INTERN) |
| Secret rotation | ❌ Vĩnh viễn không đề xuất |

---

## 🚦 TRẠNG THÁI HỆ THỐNG (Đến 17/05/2026)

| Hạng mục | Số liệu |
|---|---|
| Bảng CSDL | ~102 |
| RLS Policies | ~300 |
| Triggers / Functions | ~108 / ~123 |
| Hàm Edge | 9 |
| Loại thông báo | 39 |
| RPC SECURITY DEFINER | 13 |
| User / Role active | 28 / **30** |
| Nhãn VN | 35 resource + 10 action |
| Build & Test | Bundle ~5.2MB, Vitest ~49/49 pass |
| GitHub commits | 1.755 |
| **Public-ready** | **❌ Chưa** (chờ S3C + PATCH_HARDCODE + fix `user_id` bug) |

---

## 🛠️ THÔNG TIN KỸ THUẬT VÀ BẢO MẬT

### Phân quyền nhạy cảm
- **SUPER_ADMIN / ADMIN**: Toàn quyền (bypass cứng `userRole === "ADMIN"`).
- **CEO**: Full duyệt cuối.
- **KETOAN / CHIEF_ACCOUNTANT**: Duyệt chi, P&L, Dòng tiền, `commission_config`.
- **GDKD**: Phạm vi phòng + `commission_config` + chỉ TĂNG giá tour.
- **DEPUTY** (cũ: MANAGER): Phạm vi phòng/nhánh.
- **MANAGER_*** (MKT/OP/SALE/HR_MANAGER): Trưởng phòng, quyền giới hạn phòng.
- **\*_LEADER**: Kế thừa role cha - `approve` action tài chính.
- **\*_INTERN**: Chỉ `view` + `create` (nháp).
- **Sale_***: Chỉ khách của mình. KHÔNG MKT, KHÔNG `commission_config`.
- **HR_MANAGER / HCNS**: Lương, PII. KHÔNG thấy hộ chiếu khách.

### Cấu trúc quan trọng
- Files chính: `PermissionsContext.tsx`, `AuthContext.tsx`, `usePermissions.ts`, `AppSidebar.tsx`, `permissionAllowlists.ts`, `useLabels.ts`, `SyncRoleDialog.tsx`, `AdminBookingActions.tsx`.
- Nhãn VN: `resource_labels` (35 dòng) + `action_labels` (10 dòng) trong DB. Hook `useLabels.ts` đọc 2 bảng.
- Schema: Bảng `employee_permissions` có 2 cột `is_override boolean`, `assigned_via text`.
- Audit: `admin_force_delete_log` (snapshot 9 bảng con dạng jsonb).

---

## 📦 TÓM TẮT TIẾN ĐỘ DỰ ÁN

### Đã hoàn thành (08/05 → 13/05)
- **08-09/05:** Di trú `role_permissions`, Tái cấu trúc Quyền, LKH Tour, 11 lỗ hổng bảo mật, Quota nghỉ phép.
- **10/05:** UI Dự toán/Quyết toán, Matrix notification 33 loại, OneSignal Push tracking.
- **10-12/05:** Marketing Phase 1 (Kanban, Dashboard, Calendar, Export).
- **11/05:** Bundle Split OPT-1→4, Fix BUG-001→007.
- **12/05:** UI Phân quyền, Áp 80 quyết định Master_v1, Dọn schema.
- **13/05 (Chiến dịch SETTINGS_REFACTOR S1→S3B):**
  - ✅ S1 Foundation: 26 nhãn VN + audit HR.
  - ✅ S2A Role rekey: MANAGER→DEPUTY + 8 role con.
  - ✅ S2B Map 7 case drift.
  - ✅ PATCH UI Việt hoá: 35+10 labels.
  - ✅ S3B Auto-assign + Sync option B.
  - ✅ PATCH_ADMIN_FORCE_DELETE v2.
  - ✅ QUY_TRINH_LAM_VIEC_v2 (NT1+NT2+NT3).

### Đang chờ Lovable (🟡)
| Prompt | Mô tả |
|---|---|
| `S3A_v2` | UI Quyền cá biệt |
| `S3C_v2` | Confirm dialog đổi role |
| `PATCH_HARDCODE_MANAGER_SCAN v2` | Scan & fix hardcode role cũ |
| `AUDIT_USER_ID_COLUMN.md` | Audit cột `user_id` gây lỗi trang Ma trận v2 |

---

## 🔴 BUG ĐANG MỞ

| Bug | Mô tả | Trạng thái |
|---|---|---|
| BUG-USERID | Lỗi `column "user_id" does not exist` ở trang Ma trận v2 | Lovable đang AUDIT. AI chờ output rồi viết patch fix |

---

## ⚠️ LỖI GITHUB (Phát hiện 17/05)

| # | Lỗi | Mức |
|---|---|---|
| 1 | **File `.env` lộ trên GitHub** — chứa Supabase anon key + OneSignal App ID | 🔴 Nghiêm trọng |
| 2 | File `.env.production` cũng lộ | 🟡 Trung bình |
| 3 | README trống ("TODO: Document your project here") | ⚪ Thấp |
| 4 | 14/30 commit gần nhất chỉ ghi "Changes" | ⚪ Thấp |

---

## 🔥 VIỆC PHIÊN TỚI (ƯU TIÊN)

### 🔴 Khẩn
1. Hỏi Founder: *"Anh đã có output `AUDIT_USER_ID_COLUMN.md` từ Lovable chưa?"*
2. Nếu có → AI viết `PATCH_FIX_USER_ID_COLUMN.md`.
3. **Xoá `.env` khỏi git tracking** (file vẫn giữ local, chỉ xoá khỏi repo GitHub).

### 🟡 Quan trọng
- Đợi Lovable hoàn thiện S3A + S3C + PATCH_HARDCODE.
- Sau khi 3 patch xong → deploy production lần 1 module Settings.
- Soạn `PERMISSIONS_SPEC_v3.md` reflect 30 role cuối cùng.

### 🟢 Tuỳ chọn
- Fix pipeline OneSignal push.
- Code-split MktBoardPage.
- Viết README.md cho GitHub.

---

## ⚠️ KHÔNG ĐƯỢC LÀM

- ❌ Đoán tên cột — phải AUDIT `information_schema.columns` trước (bài học BUG-USERID).
- ❌ Viết prompt dựa nhật ký cũ — phải Reality Check bằng SQL/grep trước (NT1).
- ❌ Báo done mà không có Self-Verify SQL output thực (NT2).
- ❌ Prompt không khai báo "Phạm vi đủ" + đếm số file/bảng phải sửa (NT3).
- ❌ Paste code/bảng dài vào chat — xuất file MD độc lập.

---

## 📝 6 BÀI HỌC CỐT LÕI

1. **Kiến trúc dữ liệu:** UI rối do CSDL chồng chéo. Rà soát gộp trường, không fix lẻ tẻ.
2. **Code & CSDL:** Query Supabase JOIN phải rõ FK. Index cho FK. RLS INSERT tách biệt logic đọc.
3. **UI/UX:** Tooltip/banner cho mọi lỗi/khoá quyền. Tab Cài đặt linh hoạt theo vai trò.
4. **Phân quyền Master:** "Ký" và "Áp" là 2 lớp. Tránh key overload (1 key cho nhiều module).
5. **Prompting:** Đừng cho Lovable chạy thẳng sửa DB nếu chưa rà soát. Output dài → file MD.
6. **AUDIT trước prompt (NT1):** AI từng đoán mò tên cột → gây lỗi. Phải AUDIT cột thực bằng `information_schema.columns`.

---

## 📁 FILE PROMPT ĐÃ XUẤT

| File | Trạng thái |
|---|---|
| `SETTINGS_REFACTOR_S1.md` | ✅ Pass 5/5 |
| `SETTINGS_REFACTOR_S2A.md` | ✅ Pass 5/5 |
| `SETTINGS_REFACTOR_S2B.md` | ✅ Pass |
| `PATCH_UI_VIETHOA_PHANQUYEN.md` | ✅ Pass 7/7 |
| `SETTINGS_REFACTOR_S3B.md` | ✅ Pass 6/6 |
| `PATCH_ADMIN_FORCE_DELETE_v2.md` | ✅ Pass 7/7 |
| `QUY_TRINH_LAM_VIEC_v2.md` | ✅ Áp dụng từ 13/05 |
| `SETTINGS_REFACTOR_S3A_v2.md` | 🟡 chờ Lovable |
| `SETTINGS_REFACTOR_S3C_v2.md` | 🟡 chờ Lovable |
| `PATCH_HARDCODE_MANAGER_SCAN_v2.md` | 🟡 chờ Lovable |
| `AUDIT_USER_ID_COLUMN.md` | 🟡 chờ Lovable AUDIT |

---

## 🔑 CÂU MỞ ĐẦU PHIÊN SAU

> "Em đã đọc nhật ký 17/05. Hiện 3 patch đang chờ Lovable (S3A, S3C, PATCH_HARDCODE) + 1 AUDIT bug `user_id`. Anh đã có output mới nào để em verify hay viết patch tiếp chưa?"