# Refactor Phân Quyền Dứt Điểm — Lượt 2 (sau migration)

## Tình trạng
- Migration `20260501120000_role_permissions_table.sql` đã được tạo (Layer 1: DB + RLS + Realtime + seed zero-loss).
- Chờ apply migration → sau đó chạy toàn bộ 4 layer còn lại trong cùng lượt.

## Layer 2 — Refactor client đọc DB (không còn hardcode)

**File sửa:**
1. `src/contexts/PermissionsContext.tsx` (mới hoặc nâng cấp nếu đã có)
   - Query `role_permissions` 1 lần khi login (RLS tự lọc về role của user).
   - Subscribe Realtime channel `role_permissions` → khi ADMIN tick đổi, client cập nhật < 5s không cần logout.
   - Expose `hasPermission(key: string): boolean`.
2. `src/hooks/usePermissions.ts`
   - **Xóa** `DEFAULT_PERMISSIONS` (~340 dòng).
   - `hasPermission()` đọc từ `PermissionsContext`, KHÔNG đọc object hardcode.
   - Giữ `SCOPE_RULES` (scope khác permission, vẫn hardcode trong code).
3. `src/components/Sidebar.tsx` + các nơi dùng `hasPermission`
   - Không sửa logic, chỉ confirm đọc qua hook (đã đúng).

## Layer 3 — UI ma trận cho ADMIN

**File mới:**
4. `src/pages/admin/RolePermissionsMatrix.tsx`
   - Bảng: hàng = 22 roles, cột = các `permission_key` (group theo module).
   - Checkbox tick → `upsert` vào `role_permissions` (RLS chặn non-admin).
   - Toast `sonner` xác nhận, optimistic update + rollback nếu lỗi.
   - Search/filter theo role hoặc module.
5. `src/App.tsx` route `/admin/permissions` + `PermissionGuard` chỉ ADMIN/SUPER_ADMIN.
6. `src/components/Sidebar.tsx` thêm menu "Phân quyền hệ thống" trong nhóm Admin.

## Layer 4 — Spec + Audit

**File mới:**
7. `docs/PERMISSIONS_SPEC.md`
   - Bảng nguồn-sự-thật: role × permission_key → granted (true/false).
   - Tupun edit file này khi muốn đổi spec, sau đó chạy "Sync Spec → DB" trong Audit tab.
8. `src/lib/permissions-spec.ts`
   - Export `PERMISSIONS_SPEC` object (parse từ docs hoặc hardcode mirror).
   - Export `diffSpecVsDb(dbRows)` → trả về `{missing, extra, mismatched}`.
9. `src/pages/admin/PermissionsAudit.tsx` (tab trong RolePermissionsMatrix)
   - Nút "Run Audit Now" → query `role_permissions`, diff vs SPEC, hiển thị bảng lệch.
   - Nút "Apply Spec to DB" (chỉ ADMIN) → upsert toàn bộ theo SPEC.
   - Nút "Export current DB to Spec format" → copy paste vào docs.

## Layer 5 — Test tự động + Daily Health Check

**File mới:**
10. `src/lib/__tests__/permissions.test.ts` (Vitest)
    - TC1: Mỗi role trong SPEC có ≥ 1 permission granted.
    - TC2: SALE không có `bookings.delete`, `finance.*`, `hr.*`.
    - TC3: ADMIN có toàn bộ permissions.
    - TC4: DIEUHAN không có `candidates.*` (sửa bug cũ).
    - TC5: Không có permission_key orphan (trong DB nhưng không trong SPEC).
11. `supabase/functions/permissions-health-check/index.ts`
    - Cron daily 7:00 → diff DB vs SPEC.
    - Nếu lệch → insert `notifications` cho ADMIN (bell icon), type `permission_drift`.
12. SQL cron job (insert tool, không migration):
    ```sql
    select cron.schedule('permissions-daily-audit', '0 0 * * *', $$
      select net.http_post(
        url:='https://aneazkhnqkkpqtcxunqd.supabase.co/functions/v1/permissions-health-check',
        headers:='{"Content-Type":"application/json","apikey":"<ANON>"}'::jsonb,
        body:='{}'::jsonb
      );
    $$);
    ```

## Test acceptance (chạy ở cuối)

1. Login ADMIN → vào `/admin/permissions` → ma trận hiện 22 roles, tick được.
2. Login SALE → query `role_permissions` chỉ trả rows của SALE (RLS verify).
3. Login SALE → menu trùng SPEC cho role SALE.
4. ADMIN tick gỡ `bookings.create` của SALE → SALE online (tab khác) thấy menu Bookings ẩn nút "Tạo" trong < 5s (Realtime).
5. ADMIN bấm "Run Audit Now" → diff = 0.
6. Sửa SPEC trong docs cho lệch 1 dòng → cron 7:00 hôm sau ADMIN nhận bell notification.

## Báo cáo cuối

- Files thay đổi: ~12
- Dòng xóa: ~340 (`DEFAULT_PERMISSIONS`)
- Dòng thêm: ~800 (matrix UI + audit + tests + edge function)
- Tests: 5 pass
- Hướng dẫn Tupun: kiểm tra phân quyền = vào Settings → Phân quyền → tab Audit, hoặc đợi bell alert nếu drift.

## Mặc định đã chốt
- (A) Seed zero-loss — không clean spec lúc migration.
- Bell notification (không email).
- 1 lượt — làm hết.
