# 🚨 SAIGON HOLIDAY CRM — NHẬT KÝ TRIỆT ĐỂ

> **Mục đích**: File này là nguồn chân lý DUY NHẤT để Lovable + tôi (opencode AI) đồng bộ code & triển khai.
> **Cập nhật cuối**: 2026-06-20
> **Người maintain**: opencode AI (qua MCP Supabase/GitHub) + Lovable (qua IDE)

---

## 📌 1. PHÂN VAI RÕ RÀNG

| Thành phần | Người sở hữu | Công cụ | Quy tắc |
|---|---|---|---|
| **Frontend React** | Lovable | Lovable IDE | Lovable tự code, tự build, tự deploy khi bấm "Publish" |
| **Database schema** | opencode AI | MCP Supabase | Tôi tạo migration SQL → apply qua `apply_migration` → KHÔNG push code lên GitHub |
| **Edge Functions** | opencode AI | MCP Supabase | Tôi code local → deploy qua `deploy_edge_function` → KHÔNG push code lên GitHub |
| **Cron jobs** | opencode AI | MCP Supabase (SQL) | Tôi tạo cron → unschedule/schedule qua SQL |
| **Secrets** | opencode AI | `supabase secrets set` | Tôi set trên Supabase runtime |
| **GitHub repo** | Lovable | Lovable IDE auto-commit | **TÔI KHÔNG PUSH LÊN GITHUB NỮA** — để Lovable tự quản |

---

## 📌 2. NGUYÊN TẮC VÀNG (ĐỌC TRƯỚC KHI LÀM)

### ❌ KHÔNG BAO GIỜ:
1. **Tôi KHÔNG force push lên Lovable repo** — sẽ ghi đè commit của Lovable → conflict
2. **Tôi KHÔNG push code từ local `saigon-crm-suite` lên GitHub Lovable** — chỉ làm việc với Supabase runtime
3. **Tôi KHÔNG xuất 4 secret** (Supabase service key, Resend, 2 OneSignal)

### ✅ LUÔN LÀM:
1. **Tôi sửa code → deploy qua MCP Supabase** (không qua Git)
2. **Tôi paste code cho Lovable vào chat** → Lovable tự merge vào IDE → Lovable tự commit lên GitHub
3. **Tôi cập nhật file nhật ký này** sau mỗi thay đổi lớn

---

## 📌 3. CẤU TRÚC DỰ ÁN

### 3.1 GitHub Repos
| Repo | URL | Mục đích | Ai push? |
|---|---|---|---|
| `saigon-holiday-nexus-09062636` | https://github.com/infosaigonholiday-dev/saigon-holiday-nexus-09062636 | **NGUỒN CHÍNH frontend** | **CHỈ Lovable** |
| `saigon-crm-suite` | https://github.com/infosaigonholiday-dev/saigon-crm-suite | Local dev environment (opencode) | Tôi (cho mục đích cá nhân) |

### 3.2 Supabase Project
- **Project ref**: `aneazkhnqkkpqtcxunqd`
- **URL**: `https://aneazkhnqkkpqtcxunqd.supabase.co`
- **App URL**: `https://app.saigonholiday.vn`

### 3.3 Files quan trọng
```
Frontend:
- src/pages/Attendance.tsx       ← Trang chấm công (Attendance page)
- src/pages/ChamCong.tsx         ← FILE CŨ (nên xóa)
- src/App.tsx                    ← Route /cham-cong → Attendance

Backend:
- supabase/functions/cc-sync-jibble/index.ts         ← Sync Jibble → DB
- supabase/functions/cc-check-in-alert/index.ts      ← Push alert HR
- supabase/functions/cc-push-jibble/index.ts         ← Push data Jibble → local
- supabase/functions/jibble-invite/index.ts          ← Mời NV vào Jibble

DB:
- cc_su_kien            ← Events In/Out thô
- cc_ngay               ← Tổng hợp 1 ngày/NV (do rebuild_cc_ngay_for_range tạo)
- cc_vi_pham_tu_dong    ← Vi phạm tự sinh (DI_MUON, VE_SOM, QUEN_CHAM_*, VANG)
- cc_sync_log           ← Lịch sử cron sync
- cc_cau_hinh           ← Config (ca_chuan: gio_vao, gio_ra, buffer_*)
- cc_nhan_vien_map      ← Map employee_id ↔ jibble_person_id
- cc_thang_da_chot      ← Tháng đã chốt công
- employees             ← DS nhân viên
- profiles              ← User accounts + role
```

---

## 📌 4. CRON JOBS HIỆN TẠI (ĐÃ SETUP)

| Cron name | Schedule UTC | Giờ ICT | Loại sync |
|---|---|---|---|
| `jibble-sync-815am` | `15 1 * * 1-6` | 8:15 sáng | L1_INCREMENTAL — sync data hôm qua + sáng nay |
| `cc-check-in-alert-815am` | `18 1 * * 1-6` | 8:18 sáng | Gọi `cc-check-in-alert` (push HR nếu NV chưa In) |
| `jibble-sync-morning-v2` | `30 1 * * 1-6` | 8:30 sáng | L1_INCREMENTAL — sync backup |
| `jibble-sync-evening-v2` | `45 10 * * 1-6` | 17:45 chiều | L1_INCREMENTAL — sync cuối ngày |

**Verify cron đang chạy**: Chạy SQL `SELECT jobname, schedule, active FROM cron.job WHERE jobname LIKE 'jibble%' OR jobname LIKE 'cc-check%';`

---

## 📌 5. SECRETS ĐÃ SET TRÊN SUPABASE

| Secret | Mục đích | Đã set? |
|---|---|---|
| `JIBBLE_API_KEY` | Jibble OAuth2 | ✅ Có |
| `JIBBLE_API_SECRET` | Jibble OAuth2 | ✅ Có |
| `ONESIGNAL_APP_ID` | Push notification | ✅ Có |
| `ONESIGNAL_REST_API_KEY` | Push notification | ✅ Có |
| `CRON_SECRET` | Xác thực cron requests (header X-Cron-Secret) | ✅ Có (value: `l66ut5alvyixap3lxv0p5tsvmb9mq66x`) |

**Lệnh set secret**:
```bash
supabase secrets set JIBBLE_API_KEY="..." --project-ref aneazkhnqkkpqtcxunqd
```

---

## 📌 6. EDGE FUNCTIONS HIỆN CÓ

| Slug | Version (Jun 2026) | Auth | Mục đích |
|---|---|---|---|
| `cc-sync-jibble` | v8 (sẽ tăng khi deploy) | Cron (X-Cron-Secret) + User (Bearer JWT) | Pull events từ Jibble API → upsert cc_su_kien → rebuild cc_ngay → generate vi phạm |
| `cc-check-in-alert` | v3 (sẽ tăng) | Cron + Admin user | Đếm NV chưa In sau 8:15 → push OneSignal cho HR + insert notifications |
| `cc-push-jibble` | 11 | Service role | Push data local → Jibble (chưa dùng) |
| `jibble-invite` | 17 | Admin | Mời NV tạo tài khoản Jibble qua email |
| `jibble-debug` / `jibble-probe-*` | - | Admin | Debug functions (legacy) |
| `daily-reminders` | 124 | Cron | Gửi daily reminders |
| `manage-employee-accounts` | 151 | Admin | Quản lý tài khoản |

---

## 📌 7. CẤU HÌNH CA LÀM VIỆC (cc_cau_hinh → ca_chuan)

```json
{
  "gio_vao": "08:00",
  "gio_ra": "17:30",
  "buffer_di_muon_phut": 15,   ← Đã đổi từ 5 → 15 (HR muốn cho NV đi muộn 15p)
  "buffer_ve_som_phut": 5,
  "nguong_vang_phut": 240,     ← Cap đi muộn ở 4 tiếng (tránh anomaly)
  "ap_dung_cuoi_tuan": false
}
```

---

## 📌 8. LOGIC NGHIỆP VỤ CHẤM CÔNG

### 8.1 Trạng thái ngày (`cc_ngay.trang_thai`)
| Trạng thái | Điều kiện | Màu badge |
|---|---|---|
| `DU_CONG` | Có cả In và Out | Xanh |
| `DI_MUON` | In sau `gio_vao + buffer_di_muon` (> 15p) | Vàng |
| `VE_SOM` | Out trước `gio_ra - buffer_ve_som` (> 5p) | Vàng |
| `VANG` | Không có event nào | Đỏ |
| `QUEN_CHAM_RA` | Có In nhưng không có Out | Đỏ |
| `QUEN_CHAM_VAO` | Không có In nhưng có Out | Đỏ |
| `NGHI_PHEP` | Có leave request approved | Xanh dương |
| `CUOI_TUAN` | Thứ 7 / Chủ nhật | Xám |
| `LE` | Ngày lễ | Xám |

### 8.2 Loại vi phạm (`cc_vi_pham_tu_dong.loai`)
| Loại | Điều kiện |
|---|---|
| `DI_MUON` | `phut_di_muon > 0` |
| `VE_SOM` | `phut_ve_som > 0` |
| `QUEN_CHAM_RA` | `trang_thai = QUEN_CHAM_RA` |
| `QUEN_CHAM_VAO` | `trang_thai = QUEN_CHAM_VAO` |
| `VANG` | (legacy, không dùng nữa) |

### 8.3 Luồng sync
```
Jibble API
    ↓
Edge Function cc-sync-jibble (cron mỗi 8:15 / 8:30 / 17:45 ICT)
    ↓
    ├─ Lấy OAuth2 token (JIBBLE_API_KEY/SECRET)
    ├─ GET People từ Jibble time-tracking API
    ├─ GET TimeEntries (48h gần nhất cho L1)
    ├─ Match personId với cc_nhan_vien_map.jibble_tt_person_id
    ├─ Upsert vào cc_su_kien (onConflict: jibble_entry_id)
    ├─ Gọi SQL RPC: rebuild_cc_ngay_for_range(from, to)
    │   → Aggregate events → tính gio_vao, gio_ra, tong_phut_lam, status, vi phạm
    ├─ Generate vi phạm mới → insert vào cc_vi_pham_tu_dong (skip nếu đã có CHO_XAC_NHAN/DA_DAY_NE_NEP)
    └─ Ghi log vào cc_sync_log
    ↓
    ↓ (3 phút sau)
    ↓
Edge Function cc-check-in-alert (cron 8:18 ICT)
    ├─ Lấy DS NV active
    ├─ Lấy DS NV đã có In hôm nay
    ├─ missing = NV active - NV đã In
    ├─ Nếu missing > 0: gọi send-notification cho HR (OneSignal)
    └─ Insert row vào bảng notifications (mỗi HR 1 row)
```

### 8.4 Bảng mã màu Frontend (`Attendance.tsx`)
- Xanh = `bg-success/15 text-success border-success/30`
- Vàng = `bg-warning/15 text-warning border-warning/30`
- Đỏ = `bg-destructive/15 text-destructive border-destructive/30`
- Xám = `bg-muted text-muted-foreground`

---

## 📌 9. LỆNH THƯỜNG DÙNG

### 9.1 Kiểm tra trạng thái nhanh
```sql
-- Sync log gần nhất
SELECT id, loai_sync, bat_dau, trang_thai, so_phien_moi, so_vi_pham_phat_sinh
FROM cc_sync_log ORDER BY bat_dau DESC LIMIT 5;

-- Cron jobs
SELECT jobname, schedule, active FROM cron.job
WHERE jobname LIKE 'jibble%' OR jobname LIKE 'cc-check%';

-- NV chưa chấm vào hôm nay
SELECT e.employee_code, e.full_name
FROM employees e
WHERE e.status IN ('ACTIVE', 'INTERN', 'PROBATION')
  AND e.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM cc_su_kien sk
    WHERE sk.employee_id = e.id
      AND sk.belongs_to_date = CURRENT_DATE
      AND sk.loai = 'In'
  );
```

### 9.2 Test Edge Function
```bash
# Test cc-sync-jibble (cron mode)
curl -X POST https://aneazkhnqkkpqtcxunqd.supabase.co/functions/v1/cc-sync-jibble \
  -H "Content-Type: application/json" \
  -H "X-Cron-Secret: l66ut5alvyixap3lxv0p5tsvmb9mq66x" \
  -d '{"type":"L1_INCREMENTAL","source":"manual-test"}'

# Test cc-check-in-alert
curl -X POST https://aneazkhnqkkpqtcxunqd.supabase.co/functions/v1/cc-check-in-alert \
  -H "Content-Type: application/json" \
  -H "X-Cron-Secret: l66ut5alvyixap3lxv0p5tsvmb9mq66x" \
  -d '{"source":"manual-test"}'
```

### 9.3 Backfill dữ liệu cũ (sau khi sửa logic)
```sql
SELECT rebuild_cc_ngay_for_range('2026-01-01'::date, CURRENT_DATE, true);
```

---

## 📌 10. QUY TRÌNH LÀM VIỆC (WORKFLOW)

### Khi tôi (opencode AI) cần sửa code:

1. **Sửa local** tại `C:\Users\Yoga\saigon-crm-suite\supabase\functions\<name>\index.ts`
2. **Deploy qua MCP**: `deploy_edge_function(name="...", entrypoint_path="index.ts", files=[...])`
3. **Apply migrations** qua MCP: `apply_migration(name="...", query="...")`
4. **Cập nhật file nhật ký này** (nếu có thay đổi lớn)
5. **Paste code mới** vào chat Lovable để Lovable biết có code mới trên GitHub

### Khi Lovable cần sửa frontend:

1. Bạn edit code trong Lovable IDE
2. Bấm **Commit** → Lovable tự push lên GitHub main
3. Cron jobs trên Supabase tự chạy → data tự update

### Khi cần sync code 2 chiều:

1. **Lovable → GitHub**: bấm Commit trong IDE
2. **GitHub → Lovable IDE**: vào IDE → tab GitHub → "Pull" / "Sync"
3. **opencode → Lovable IDE**: tôi paste code vào chat Lovable → Lovable IDE tự merge

### Khi tôi cần debug:

1. `get_logs(service="edge-function")` → xem log edge function
2. `execute_sql(query="...")` → xem data trong DB
3. `list_edge_functions()` → kiểm tra version

---

## 📌 11. KHOẢNH KHẮC LỖI THƯỜNG GẶP

### ❌ Cron báo 401 Unauthorized
→ Cron gửi sai X-Cron-Secret. Verify:
```sql
SELECT jobname, command FROM cron.job WHERE jobname LIKE 'jibble%';
```
Phải có `X-Cron-Secret` trong headers.

### ❌ Edge Function không có code mới nhất
→ Tôi deploy qua MCP, KHÔNG push lên GitHub. Cần copy code vào Lovable IDE để GitHub đồng bộ.

### ❌ Cron job gọi URL 404
→ Function chưa deploy. Check:
```bash
supabase functions list cc-sync-jibble
```
Nếu không có → `deploy_edge_function` lại.

### ❌ Bảng công hiển thị "Đủ công" cho NV chỉ chấm ra
→ Cần backfill bằng `SELECT rebuild_cc_ngay_for_range(...)`

---

## 📌 12. CHECKLIST KHI BẮT ĐẦU PHIÊN MỚI

Tôi (opencode AI) sẽ tự check:
- [ ] `supabase_list_edge_functions()` → xem version cc-sync-jibble, cc-check-in-alert
- [ ] `supabase_execute_sql("SELECT MAX(bat_dau) FROM cc_sync_log")` → cron có chạy không
- [ ] `supabase_execute_sql("SELECT jobname, active FROM cron.job WHERE jobname LIKE 'jibble%'")` → cron jobs
- [ ] `github_list_commits(owner, repo, perPage=3)` → latest commits trên GitHub
- [ ] Đọc lại file nhật ký này để biết trạng thái hiện tại

---

## 📌 13. THÔNG TIN NHẠY CẢM (KHÔNG XUẤT)

> ⚠️ Founder cấm xuất 4 secret sau ra khỏi hệ thống:
> - Supabase service_role_key
> - Resend API key
> - OneSignal REST API key
> - OneSignal App ID (internal)
>
> Trong file này chỉ liệt kê tên, KHÔNG để giá trị. Nếu cần dùng, hỏi founder.

---

## 📌 14. LIÊN HỆ

- **Founder**: Tupun (bạn) — info@saigonholiday.vn
- **AI assistant**: opencode (Claude Opus 4.8)
- **Supabase project**: `aneazkhnqkkpqtcxunqd`
- **GitHub org**: `infosaigonholiday-dev`
- **App production**: https://app.saigonholiday.vn
- **Lovable preview**: https://saigon-holiday-nexus.lovable.app

---

_Cập nhật lần cuối: 2026-06-20 bởi opencode AI_
