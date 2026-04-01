

## Fix RLS policies cho bookings, customers, leads

### Thay đổi duy nhất: 1 migration SQL

Tạo migration mới chứa chính xác SQL bạn đã cung cấp:

**Bookings** (5 policies):
- `bookings_read`: Sale owner + ADMIN/SUPER_ADMIN/DIEUHAN/DIRECTOR/KETOAN/HR_HEAD + MANAGER cùng phòng ban
- `bookings_write`: INSERT — Sale owner + ADMIN/SUPER_ADMIN/DIEUHAN/DIRECTOR
- `bookings_update`: Sale owner + ADMIN/SUPER_ADMIN/DIEUHAN/DIRECTOR
- `bookings_delete`: Chỉ ADMIN/SUPER_ADMIN/DIRECTOR

**Customers** (2 policies):
- `customers_read`: assigned_sale + created_by + ADMIN/SUPER_ADMIN/DIEUHAN/DIRECTOR/KETOAN/HR_HEAD + MANAGER cùng phòng ban
- `customers_write`: assigned_sale + created_by + ADMIN/SUPER_ADMIN/DIEUHAN/DIRECTOR

**Leads** (2 policies):
- `leads_read`: assigned_to + created_by + ADMIN/SUPER_ADMIN/DIEUHAN/DIRECTOR/KETOAN + MANAGER cùng phòng ban
- `leads_write`: assigned_to + created_by + ADMIN/SUPER_ADMIN/DIEUHAN/DIRECTOR

### Chi tiết kỹ thuật

- Drop tất cả policy cũ trước khi tạo mới (tránh conflict)
- Sử dụng `get_my_department_id()` cho MANAGER team scope
- Không thay đổi code frontend — chỉ database migration

