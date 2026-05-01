# DỨT ĐIỂM PHÂN QUYỀN — Refactor toàn diện

## Mục tiêu
Chuyển nguồn sự thật của permissions từ **hardcode trong `usePermissions.ts`** sang **bảng `role_permissions` trong DB**, thêm UI ma trận cho admin, file spec làm chuẩn, test tự động và audit on-demand. Sau khi xong, Tupun chỉ cần:
- Vào **Settings → Audit phân quyền** click 1 nút biết hệ thống có lệch spec không.
- Hoặc vào **Settings → Ma trận phân quyền** tick checkbox để đổi quyền cho cả role.
- Mọi thay đổi propagate cho user online trong < 5 giây (Realtime).

## Kiến trúc mới

```text
┌─────────────────────────────────────────────────┐
│ PERMISSIONS_SPEC.md  (luật cứng — git-tracked)  │
│  Bảng 22 roles × ~70 permission_keys            │
└──────────────┬──────────────────────────────────┘
               │ seed / reset / test compare
               ▼
┌─────────────────────────────────────────────────┐
│ DB: role_permissions  (nguồn sự thật runtime)   │
│  (role_name, permission_key, granted)           │
└──────┬───────────────────────────┬──────────────┘
       │ Realtime subscribe        │ admin UPSERT qua UI
       ▼                           ▼
┌──────────────────┐      ┌──────────────────────┐
│ PermissionsCtx   │      │ RolePermissionsMatrix│
│ (load DB+overr.) │      │  (UI ma trận admin)  │
└──────────────────┘      └──────────────────────┘
       │
       ▼ + employee_permissions (override per-user, giữ nguyên)
   resolved permissions cho user
```

## 5 Layers triển khai

### Layer 1 — DB schema (migration)
- Tạo bảng `role_permissions(id uuid PK, role_name text, permission_key text, granted bool default true, updated_by uuid, updated_at timestamptz, UNIQUE(role_name, permission_key))`.
- RLS:
  - SELECT: mọi user đã đăng nhập (`is_active=true`).
  - INSERT/UPDATE/DELETE: chỉ ADMIN/SUPER_ADMIN qua `has_role()`.
- Bật **Realtime** publication cho bảng này.
- **Seed bằng SQL ngay trong migration**: insert toàn bộ entries từ `DEFAULT_PERMISSIONS` hiện tại (22 roles × các keys) → đảm bảo 0 user mất quyền.
- Trigger `audit_role_permissions` ghi vào `audit_logs` mỗi khi đổi.

### Layer 2 — Client refactor
- **`src/hooks/usePermissions.ts`**:
  - **XOÁ HẲN** object `DEFAULT_PERMISSIONS` và hàm `getDefaultPermissions()`.
  - Giữ `ALL_PERMISSION_KEYS`, `PERMISSION_GROUPS`, `PermissionKey`, `ScopeLevel`.
  - Export hook `usePermissions()` (proxy về context, không đổi API).
- **`src/contexts/PermissionsContext.tsx`**:
  - Load 2 query song song:
    1. `role_permissions` WHERE `role_name = userRole AND granted = true` → base set.
    2. `employee_permissions` WHERE `employee_id = me` → override.
  - Merge: base ∪ overrides.granted − overrides.revoked.
  - Subscribe Realtime trên `role_permissions` (filter theo role) → invalidate + reload.
  - Subscribe Realtime trên `employee_permissions` (filter theo employee_id) → reload.
- **`src/components/settings/PermissionEditDialog.tsx`**: thay `getDefaultPermissions(role)` bằng query `role_permissions` cho role đó (1 query, cache theo role).
- **`src/components/settings/SettingsPermissionsTab.tsx`**: tương tự, load defaults từ DB thay vì hardcode.

### Layer 3 — UI ma trận role
File mới **`src/components/settings/RolePermissionsMatrix.tsx`**:
- Bảng: cột = 22 roles, hàng = permission_keys (group theo module có collapsible).
- Mỗi ô = Checkbox; click = UPSERT `role_permissions` (granted toggle).
- Self-lock guard: chặn admin uncheck `settings.view`/`settings.edit` của chính role mình (kèm cảnh báo nếu role đó là duy nhất giữ quyền).
- Nút **"Reset role này về spec"**: parse `PERMISSIONS_SPEC.md` → DELETE+INSERT lại role đó.
- Nút **"Reset toàn bộ về spec"** (chỉ ADMIN): reset 22 roles.
- Nút **"Export CSV"**: xuất ma trận hiện tại (Tupun review offline).
- Nút **"So với spec"**: hiển thị diff inline (highlight ô nào lệch spec).
- Tab mới trong `Settings.tsx`: **"Ma trận phân quyền"** (ADMIN/SUPER_ADMIN only).

### Layer 4 — Spec & test
- **`PERMISSIONS_SPEC.md`** ở root project:
  - Bảng markdown 22 roles × các permission_keys, dùng ✅/❌.
  - Section ghi chú nguyên tắc (TP_DIEUHANH KHÔNG có hr_employees/payroll/recruitment, v.v.).
  - Versioned trong git → mọi thay đổi spec phải qua PR.
- **`src/permissions-spec.test.ts`** (vitest):
  - Parse `PERMISSIONS_SPEC.md` → ma trận object.
  - Query DB `role_permissions` qua anon client.
  - `expect(db).toEqual(spec)` → fail nếu lệch (báo rõ role nào, key nào).
- **ESLint rule** trong `eslint.config.js`: chặn export/use `DEFAULT_PERMISSIONS` (no-restricted-syntax pattern).

### Layer 5 — Audit & alert
- Edge function **`supabase/functions/check-permissions-health/index.ts`**:
  - Fetch `PERMISSIONS_SPEC.md` từ repo (hoặc embed nội dung lúc deploy) → so với DB.
  - Nếu diff > 0 → gọi `send-notification` cho ADMIN + (optional) email.
  - Trả JSON `{ ok, diffs: [{role, key, expected, actual}] }`.
- Schedule **pg_cron** mỗi giờ chạy edge function này.
- **UI tab "Audit phân quyền"** trong Settings:
  - Nút **"Run Audit Now"** → invoke edge function → render bảng diff (role, key, spec, db, action gợi ý).
  - Nút **"Apply spec to DB"** (ADMIN) — fix toàn bộ diffs trong 1 transaction.

## Migration safety check
Sau khi seed, chạy SQL kiểm tra trong migration (RAISE EXCEPTION nếu fail):
```sql
-- Đảm bảo mỗi role trong DEFAULT_PERMISSIONS cũ đều có entries trong DB mới
DO $$
DECLARE missing int;
BEGIN
  SELECT count(*) INTO missing FROM (VALUES ('ADMIN'),('GDKD'),...,('INTERN_KETOAN')) v(r)
   WHERE NOT EXISTS (SELECT 1 FROM role_permissions WHERE role_name = v.r);
  IF missing > 0 THEN RAISE EXCEPTION 'Seed thiếu % roles', missing; END IF;
END $$;
```

## Files thay đổi
| File | Hành động |
|---|---|
| `supabase/migrations/<ts>_role_permissions.sql` | NEW — table + RLS + seed + audit trigger |
| `src/hooks/usePermissions.ts` | EDIT — xoá DEFAULT_PERMISSIONS (~340 dòng), giữ types/keys |
| `src/contexts/PermissionsContext.tsx` | EDIT — load từ DB + Realtime |
| `src/components/settings/PermissionEditDialog.tsx` | EDIT — defaults từ DB |
| `src/components/settings/SettingsPermissionsTab.tsx` | EDIT — defaults từ DB |
| `src/components/settings/RolePermissionsMatrix.tsx` | NEW — UI ma trận |
| `src/components/settings/SettingsAuditPermissionsTab.tsx` | NEW — UI audit |
| `src/pages/Settings.tsx` | EDIT — thêm 2 tab mới |
| `PERMISSIONS_SPEC.md` | NEW — spec chuẩn |
| `src/permissions-spec.test.ts` | NEW — test compare |
| `supabase/functions/check-permissions-health/index.ts` | NEW |
| `supabase/config.toml` | EDIT — verify_jwt=false cho edge function |
| `eslint.config.js` | EDIT — chặn DEFAULT_PERMISSIONS |

## Bằng chứng verify (sẽ paste sau khi build)
1. `SELECT role_name, count(*) FROM role_permissions GROUP BY role_name` → 22 rows.
2. `rg "DEFAULT_PERMISSIONS" src/` → empty.
3. `bunx vitest run permissions-spec` → PASS.
4. So sánh menu sidebar 5 user (TP_DIEUHANH, SALE_DOMESTIC, KETOAN, GDKD, HCNS) trước/sau migration → identical (chụp DB query mô phỏng `getVisibleModules`).
5. Audit endpoint trả `diffs.length === 0`.
6. Test Realtime: đổi 1 quyền → reload PermissionsContext.

## Câu hỏi trước khi LÀM
1. **Spec chuẩn** — Bạn muốn:
   - (A) Dùng nguyên `DEFAULT_PERMISSIONS` hiện tại làm spec (zero-loss, nhanh nhất, nhưng giữ cả các quyền đang sai như `DIEUHAN.candidates.view`), hay
   - (B) Mình propose bản spec đã clean (vd gỡ `candidates.view` khỏi GDKD/MANAGER/DIEUHAN, gỡ `notifications.broadcast` khỏi GDKD/MANAGER) cho bạn duyệt rồi mới seed?
2. **Edge function alert** — gửi qua email (cần Lovable Email domain) hay chỉ in-app notification + bell icon?
3. **Deadline 03/05/2026** — chốt làm hết 5 layers trong 1 lượt, hay ưu tiên Layer 1+2+3 trước, Layer 4+5 đợt sau?

Nói **"A/B + email/bell + 1-lượt/2-đợt"** (vd: "B + bell + 1-lượt") mình triển khai.