// Tour File / Tour Task — workflow constants & helpers

export const TOUR_STAGES = [
  "inquiry",
  "requirement_collected",
  "program_drafting",
  "proposal_sent",
  "negotiation",
  "confirmed_pending_contract",
  "contract_drafting",
  "contract_signed",
  "deposit_pending",
  "operating",
  "pre_tour_check",
  "on_tour",
  "post_tour_settlement",
  "settlement_submitted",
  "settlement_closed",
  "archived",
  "cancelled",
] as const;
export type TourStage = (typeof TOUR_STAGES)[number];

export const TOUR_STAGE_LABEL: Record<TourStage, string> = {
  inquiry: "Tiếp nhận yêu cầu",
  requirement_collected: "Đã thu thập yêu cầu",
  program_drafting: "Dựng chương trình",
  proposal_sent: "Đã gửi đề xuất",
  negotiation: "Thương lượng",
  confirmed_pending_contract: "Chốt — chờ HĐ",
  contract_drafting: "Soạn HĐ",
  contract_signed: "Đã ký HĐ",
  deposit_pending: "Chờ đặt cọc",
  operating: "Đang vận hành",
  pre_tour_check: "Kiểm tra trước tour",
  on_tour: "Đang đi tour",
  post_tour_settlement: "Sau tour — quyết toán",
  settlement_submitted: "Đã trình quyết toán",
  settlement_closed: "Đã đóng quyết toán",
  archived: "Lưu trữ",
  cancelled: "Đã huỷ",
};

export const BOOKING_TYPE_LABEL: Record<string, string> = {
  retail: "Khách lẻ",
  group_tour: "Tour đoàn",
  mice: "MICE",
  school_group: "Đoàn trường",
  company_trip: "Đoàn doanh nghiệp",
};

export const TOUR_BOOKING_TYPES = ["group_tour", "mice", "school_group", "company_trip"] as const;
export type TourBookingType = (typeof TOUR_BOOKING_TYPES)[number];

// Task status
export const TASK_STATUSES = [
  "todo",
  "in_progress",
  "waiting_customer",
  "waiting_supplier",
  "waiting_internal",
  "done_pending_check",
  "approved_done",
  "rejected_rework",
  "overdue",
  "cancelled",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "Chờ làm",
  in_progress: "Đang làm",
  waiting_customer: "Chờ khách",
  waiting_supplier: "Chờ NCC",
  waiting_internal: "Chờ nội bộ",
  done_pending_check: "Báo xong — chờ kiểm",
  approved_done: "Đã duyệt xong",
  rejected_rework: "Trả về làm lại",
  overdue: "Quá hạn",
  cancelled: "Đã huỷ",
};

export const TASK_STATUS_BADGE: Record<TaskStatus, string> = {
  todo: "bg-muted text-muted-foreground",
  in_progress: "bg-primary/15 text-primary border-primary/30",
  waiting_customer: "bg-amber-100 text-amber-800 border-amber-300",
  waiting_supplier: "bg-amber-100 text-amber-800 border-amber-300",
  waiting_internal: "bg-amber-100 text-amber-800 border-amber-300",
  done_pending_check: "bg-violet-100 text-violet-800 border-violet-300",
  approved_done: "bg-blue-600 text-white border-blue-700",
  rejected_rework: "bg-destructive/15 text-destructive border-destructive/30",
  overdue: "bg-destructive text-destructive-foreground",
  cancelled: "bg-muted text-muted-foreground line-through",
};

export const TASK_PRIORITY_LABEL = {
  low: "Thấp",
  medium: "Trung bình",
  high: "Cao",
  critical: "Khẩn cấp",
} as const;

// Allowed transitions from current status
export function getAllowedTransitions(
  status: TaskStatus,
  isOwner: boolean,
  canApprove: boolean,
  isAdmin: boolean,
): { value: TaskStatus; label: string; variant?: "default" | "destructive" | "secondary" }[] {
  const out: { value: TaskStatus; label: string; variant?: "default" | "destructive" | "secondary" }[] = [];
  if (status === "todo" && (isOwner || isAdmin)) {
    out.push({ value: "in_progress", label: "Bắt đầu làm" });
  }
  if (status === "in_progress" && (isOwner || isAdmin)) {
    out.push({ value: "done_pending_check", label: "Báo xong" });
    out.push({ value: "waiting_customer", label: "Chờ khách", variant: "secondary" });
    out.push({ value: "waiting_supplier", label: "Chờ NCC", variant: "secondary" });
    out.push({ value: "waiting_internal", label: "Chờ nội bộ", variant: "secondary" });
  }
  if (status.startsWith("waiting_") && (isOwner || isAdmin)) {
    out.push({ value: "in_progress", label: "Tiếp tục làm" });
    out.push({ value: "done_pending_check", label: "Báo xong" });
  }
  if (status === "done_pending_check" && (canApprove || isAdmin) && !isOwner) {
    out.push({ value: "approved_done", label: "Duyệt xong" });
    out.push({ value: "rejected_rework", label: "Trả lại làm lại", variant: "destructive" });
  }
  if (status === "rejected_rework" && (isOwner || isAdmin)) {
    out.push({ value: "in_progress", label: "Làm lại" });
  }
  if (status === "overdue" && (isOwner || isAdmin)) {
    out.push({ value: "in_progress", label: "Tiếp tục làm" });
    out.push({ value: "done_pending_check", label: "Báo xong" });
  }
  if (isAdmin && !["approved_done", "cancelled"].includes(status)) {
    out.push({ value: "cancelled", label: "Huỷ task", variant: "destructive" });
  }
  return out;
}

// Document types
export const DOCUMENT_TYPES = [
  "program",
  "service_proposal",
  "menu",
  "contract_draft",
  "contract_signed",
  "guest_list",
  "rooming_list",
  "vehicle_list",
  "budget",
  "settlement",
  "invoice",
  "receipt",
  "payment_proof",
  "supplier_confirmation",
  "operation_checklist",
  "other",
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_TYPE_LABEL: Record<DocumentType, string> = {
  program: "Chương trình tour",
  service_proposal: "Đề xuất dịch vụ",
  menu: "Thực đơn",
  contract_draft: "Bản nháp HĐ",
  contract_signed: "HĐ đã ký",
  guest_list: "Danh sách khách",
  rooming_list: "Sơ đồ phòng",
  vehicle_list: "Danh sách xe",
  budget: "Dự toán",
  settlement: "Quyết toán",
  invoice: "Hoá đơn",
  receipt: "Phiếu thu",
  payment_proof: "Chứng từ thanh toán",
  supplier_confirmation: "Xác nhận NCC",
  operation_checklist: "Checklist điều hành",
  other: "Khác",
};

export const CRITICAL_DOC_TYPES: DocumentType[] = [
  "guest_list",
  "contract_signed",
  "budget",
  "settlement",
];
