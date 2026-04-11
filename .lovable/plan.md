

## Kế hoạch: Sửa quyền Trưởng phòng Điều hành

### Vấn đề phát hiện

1. **Frontend thiếu module quan trọng cho DIEUHAN**: Gói tour, Lịch trình, Lưu trú đều là nghiệp vụ cốt lõi của Điều hành nhưng không có trong `DEFAULT_PERMISSIONS`.
2. **positionRoleMapping sai**: OPS + TRUONG_PHONG gợi ý "MANAGER" thay vì giữ "DIEUHAN".
3. **Scope leave sai**: Trưởng phòng Điều hành cần duyệt phép nhân viên phòng mình nhưng scope đang là "personal".
4. **Thiếu settings.view**: Không thể vào Cài đặt để quản lý phòng ban.

### Sửa đổi

#### 1. `src/hooks/usePermissions.ts` — Bổ sung quyền DIEUHAN
Thêm vào danh sách permissions của DIEUHAN:
- `tour_packages.view`, `tour_packages.create`, `tour_packages.edit`
- `itineraries.view`, `itineraries.create`, `itineraries.edit`
- `accommodations.view`, `accommodations.create`, `accommodations.edit`
- `leave.approve`
- `settings.view`

#### 2. `src/contexts/PermissionsContext.tsx` — Sửa SCOPE_RULES cho DIEUHAN
Đổi scope `leave` từ `"personal"` sang `"department"` để Trưởng phòng thấy và duyệt phép nhân viên phòng mình.

#### 3. `src/lib/positionRoleMapping.ts` — Sửa mapping OPS
Đổi OPS + `TRUONG_PHONG` từ `"MANAGER"` sang `"DIEUHAN"` (giữ nguyên vì Trưởng phòng Điều hành vẫn dùng quyền DIEUHAN, không phải MANAGER chung).
Tương tự cho OP_OUTBOUND.

### File chỉnh sửa
- `src/hooks/usePermissions.ts`
- `src/contexts/PermissionsContext.tsx`
- `src/lib/positionRoleMapping.ts`

### Chi tiết kỹ thuật
- Chỉ sửa frontend permission matrix. Database RLS đã đúng (accommodations, booking_itineraries đều có DIEUHAN trong policy).
- Không cần migration.
- Sau khi sửa, sidebar sẽ tự động hiện thêm: Gói tour, Lịch trình, Lưu trú cho role DIEUHAN.

