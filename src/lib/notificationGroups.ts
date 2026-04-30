// Mapping & label tiếng Việt cho notification types và groups.

export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  FOLLOW_UP: "Nhắc follow-up",
  FOLLOW_UP_OVERDUE: "Follow-up quá hạn",
  LEAD_FORGOTTEN: "Lead bị quên",
  LEAD_NO_SCHEDULE: "Lead chưa có lịch",
  LEAD_ASSIGNED: "Lead được giao",
  LEAD_WON: "Lead thắng",
  NEW_ONLINE_LEAD: "Lead online mới",
  ESCALATION_LV1: "Eskalation cấp 1",
  BOOKING_DEPARTURE_NEAR: "Booking sắp khởi hành",
  TRAVEL_DATE_NEAR: "Sắp tới ngày đi",
  TOUR_DEPARTURE: "Tour khởi hành",
  PAYMENT_DUE: "Đến hạn thu tiền",
  PAYMENT_OVERDUE: "Quá hạn thu tiền",
  PAYMENT_RECEIVED: "Đã nhận tiền",
  TRANSACTION_APPROVAL: "Duyệt giao dịch",
  TRANSACTION_APPROVED: "Giao dịch đã duyệt",
  TRANSACTION_REJECTED: "Giao dịch bị từ chối",
  BUDGET_ESTIMATE_PENDING: "Dự toán chờ duyệt",
  BUDGET_SETTLEMENT_PENDING: "Quyết toán chờ duyệt",
  CASHFLOW_NEGATIVE: "Cảnh báo dòng tiền âm",
  LEAVE_REQUEST_NEW: "Đơn nghỉ phép mới",
  LEAVE_REQUEST_RESULT: "Kết quả đơn nghỉ phép",
  BIRTHDAY: "Sinh nhật",
  COMPANY_ANNIVERSARY: "Kỷ niệm công ty",
  NEW_EMPLOYEE: "Nhân sự mới",
  CONTRACT_APPROVAL_OVERDUE: "Hợp đồng quá hạn duyệt",
  CONTRACT_EXPIRY: "Hợp đồng sắp hết hạn",
  BROADCAST: "Thông báo chung",
  TEST_PUSH: "Test push",
  WELCOME: "Chào mừng",
  DAILY_DIGEST: "Tóm tắt hàng ngày",
  KPI_ACHIEVEMENT: "Đạt KPI",
  INTERNAL_NOTE: "Ghi chú nội bộ",
};

export const NOTIFICATION_GROUPS: Record<string, { label: string; types: string[] }> = {
  LEAD_CRM: {
    label: "Lead / CRM",
    types: ["FOLLOW_UP", "FOLLOW_UP_OVERDUE", "LEAD_FORGOTTEN", "LEAD_NO_SCHEDULE", "LEAD_ASSIGNED", "LEAD_WON", "NEW_ONLINE_LEAD", "ESCALATION_LV1"],
  },
  BOOKING_TOUR: {
    label: "Booking / Tour",
    types: ["BOOKING_DEPARTURE_NEAR", "TRAVEL_DATE_NEAR", "TOUR_DEPARTURE"],
  },
  FINANCE: {
    label: "Tài chính",
    types: ["PAYMENT_DUE", "PAYMENT_OVERDUE", "PAYMENT_RECEIVED", "TRANSACTION_APPROVAL", "TRANSACTION_APPROVED", "TRANSACTION_REJECTED", "BUDGET_ESTIMATE_PENDING", "BUDGET_SETTLEMENT_PENDING", "CASHFLOW_NEGATIVE"],
  },
  HR: {
    label: "Nhân sự",
    types: ["LEAVE_REQUEST_NEW", "LEAVE_REQUEST_RESULT", "BIRTHDAY", "COMPANY_ANNIVERSARY", "NEW_EMPLOYEE"],
  },
  CONTRACT: {
    label: "Hợp đồng",
    types: ["CONTRACT_APPROVAL_OVERDUE", "CONTRACT_EXPIRY"],
  },
  SYSTEM: {
    label: "Hệ thống / Broadcast",
    types: ["BROADCAST", "TEST_PUSH", "WELCOME", "DAILY_DIGEST", "KPI_ACHIEVEMENT", "INTERNAL_NOTE"],
  },
};

export function getTypeLabel(type: string | null | undefined): string {
  if (!type) return "—";
  return NOTIFICATION_TYPE_LABELS[type] || type;
}

export function getGroupOfType(type: string | null | undefined): string {
  if (!type) return "—";
  for (const [key, g] of Object.entries(NOTIFICATION_GROUPS)) {
    if (g.types.includes(type)) return g.label;
  }
  return "Khác";
}

export const DEPARTMENT_OPTIONS = [
  { value: "SALE", label: "Sale" },
  { value: "OPS", label: "Điều hành" },
  { value: "ACC", label: "Kế toán" },
  { value: "HR", label: "HR" },
  { value: "MKT", label: "Marketing" },
  { value: "MANAGEMENT", label: "Management" },
];
