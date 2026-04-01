

# VẤN ĐỀ GỐC: Nhân viên KD vẫn thấy toàn bộ dữ liệu

## Nguyên nhân chính: `profiles.role` KHÔNG ĐÚNG

Kiểm tra database cho thấy:

| Nhân viên | Phòng ban | profiles.role | Đúng ra phải là |
|-----------|-----------|---------------|-----------------|
| nguyen tuan phuong | Phòng KD MICE | **HCNS** | SALE_MICE |
| le thi thao linh | Phòng KD MICE | *(chưa có tài khoản)* | — |
| Lê Thị Thủy Tiên | Phòng HCNS | HCNS | OK |

**Nhân viên "nguyen tuan phuong" có `profiles.role = 'HCNS'`** → hệ thống coi là nhân sự → thấy toàn bộ nhân viên, lương, nghỉ phép. Code frontend hoạt động đúng — vấn đề là DATA sai.

## Giải pháp: 2 việc cần làm

### 1. Sửa role cho đúng ngay trong DB
Migration update `profiles.role` cho user `09537abe-a5b4-48d1-b042-017c7c62f6a5` từ `HCNS` → `SALE_MICE`.

### 2. Thêm cảnh báo UI khi role không khớp phòng ban
Trong `EmployeeRoleTab.tsx`, thêm logic kiểm tra: nếu `department.name` chứa "Kinh Doanh" nhưng `profiles.role` là HCNS/KETOAN (hoặc ngược lại), hiện banner cảnh báo vàng:
> "⚠️ Quyền hệ thống (HCNS) không khớp với phòng ban (Phòng KD MICE). Vui lòng kiểm tra lại."

Điều này giúp Admin phát hiện lỗi gán role sai trong tương lai.

### 3. Thêm hiển thị role hiện tại trong danh sách nhân viên
Trong `Employees.tsx`, thêm cột "Quyền hệ thống" (join profiles.role) để Admin/HR nhìn nhanh role của từng người mà không cần vào chi tiết.

---

## Tổng file thay đổi: 3
1. **DB migration** — `UPDATE profiles SET role = 'SALE_MICE' WHERE id = '09537abe-...'`
2. **`src/components/employees/EmployeeRoleTab.tsx`** — thêm banner cảnh báo role không khớp phòng ban
3. **`src/pages/Employees.tsx`** — thêm cột hiển thị role hệ thống trong bảng danh sách

