/**
 * Single source of truth cho tên hiển thị (UI label) của các module.
 * Khi đổi tên module, CHỈ sửa tại đây — toàn bộ Sidebar, Settings → Quyền hạn,
 * và các nơi khác sẽ đồng bộ tự động.
 *
 * KHÔNG đổi key (b2b_tours, raw_contacts, ...) — đó là khóa nội bộ
 * dùng cho permissions, route mapping, DB. Chỉ đổi value (label).
 */
export const MODULE_LABELS: Record<string, string> = {
  dashboard: "Tổng quan",
  customers: "Khách hàng",
  leads: "Tiềm năng",
  raw_contacts: "Kho Data",
  quotations: "Báo giá",
  bookings: "Đặt tour",
  payments: "Thanh toán",
  contracts: "Hợp đồng",
  tour_packages: "Gói tour",
  itineraries: "Lịch trình",
  accommodations: "Lưu trú",
  suppliers: "Nhà cung cấp",
  b2b_tours: "LKH Tour 2026",
  staff: "Nhân sự",
  leave: "Nghỉ phép",
  payroll: "Bảng lương",
  finance: "Tài chính",
  workflow: "Quy trình",
  settings: "Cài đặt",
};

export const getModuleLabel = (key: string): string =>
  MODULE_LABELS[key] ?? key;
