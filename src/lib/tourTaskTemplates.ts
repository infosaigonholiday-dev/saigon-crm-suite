// Default task templates by booking_type
import type { TourBookingType } from "./tourFileWorkflow";

export interface TaskTemplate {
  title: string;
  description?: string;
  department: string;
  priority: "low" | "medium" | "high" | "critical";
  evidence_required: boolean;
  evidence_type?: string;
  due_offset_days: number; // relative to departure_date (negative = before)
}

const COMMON_PRE_TOUR: TaskTemplate[] = [
  { title: "Thu thập yêu cầu chi tiết từ khách", department: "SALES", priority: "high", evidence_required: false, due_offset_days: -45 },
  { title: "Dựng chương trình tour & báo giá", department: "SALES", priority: "high", evidence_required: true, evidence_type: "document", due_offset_days: -40 },
  { title: "Gửi proposal và theo dõi phản hồi", department: "SALES", priority: "high", evidence_required: false, due_offset_days: -35 },
  { title: "Soạn thảo & ký hợp đồng", department: "SALES", priority: "critical", evidence_required: true, evidence_type: "document", due_offset_days: -25 },
  { title: "Theo dõi cọc khách hàng", department: "SALES", priority: "critical", evidence_required: true, evidence_type: "payment_proof", due_offset_days: -20 },
  { title: "Đặt phương tiện vận chuyển", department: "OPERATION", priority: "critical", evidence_required: true, evidence_type: "supplier_confirmation", due_offset_days: -15 },
  { title: "Đặt khách sạn & xác nhận", department: "OPERATION", priority: "critical", evidence_required: true, evidence_type: "supplier_confirmation", due_offset_days: -15 },
  { title: "Chốt thực đơn nhà hàng", department: "OPERATION", priority: "high", evidence_required: true, evidence_type: "supplier_confirmation", due_offset_days: -10 },
  { title: "Lập danh sách khách + rooming list", department: "OPERATION", priority: "high", evidence_required: true, evidence_type: "guest_list", due_offset_days: -7 },
  { title: "Phân công HDV / leader", department: "OPERATION", priority: "high", evidence_required: false, due_offset_days: -7 },
  { title: "Pre-tour check toàn bộ dịch vụ", department: "OPERATION", priority: "critical", evidence_required: true, evidence_type: "operation_checklist", due_offset_days: -2 },
  { title: "Thu phần còn lại trước tour", department: "ACCOUNTING", priority: "critical", evidence_required: true, evidence_type: "payment_proof", due_offset_days: -3 },
];

const COMMON_POST_TOUR: TaskTemplate[] = [
  { title: "Nhận feedback khách sau tour", department: "SALES", priority: "medium", evidence_required: false, due_offset_days: 3 },
  { title: "Tổng hợp chứng từ thanh toán NCC", department: "OPERATION", priority: "high", evidence_required: true, evidence_type: "receipt", due_offset_days: 7 },
  { title: "Lập quyết toán tour", department: "ACCOUNTING", priority: "critical", evidence_required: true, evidence_type: "settlement", due_offset_days: 10 },
  { title: "Trình quyết toán cho Kế toán/CEO", department: "ACCOUNTING", priority: "critical", evidence_required: false, due_offset_days: 14 },
];

const MICE_EXTRA: TaskTemplate[] = [
  { title: "Khảo sát điểm tổ chức MICE", department: "OPERATION", priority: "high", evidence_required: true, evidence_type: "document", due_offset_days: -30 },
  { title: "Chuẩn bị banner / decor / âm thanh", department: "OPERATION", priority: "high", evidence_required: true, evidence_type: "supplier_confirmation", due_offset_days: -10 },
  { title: "Brief team-building / kịch bản gala", department: "OPERATION", priority: "high", evidence_required: true, evidence_type: "document", due_offset_days: -7 },
];

const SCHOOL_EXTRA: TaskTemplate[] = [
  { title: "Xác nhận danh sách giáo viên đi cùng", department: "OPERATION", priority: "high", evidence_required: true, evidence_type: "guest_list", due_offset_days: -10 },
  { title: "Chuẩn bị bảo hiểm tai nạn học sinh", department: "ACCOUNTING", priority: "critical", evidence_required: true, evidence_type: "document", due_offset_days: -5 },
];

export function getTaskTemplate(bookingType: TourBookingType): TaskTemplate[] {
  const base = [...COMMON_PRE_TOUR, ...COMMON_POST_TOUR];
  if (bookingType === "mice") return [...COMMON_PRE_TOUR, ...MICE_EXTRA, ...COMMON_POST_TOUR];
  if (bookingType === "school_group") return [...COMMON_PRE_TOUR, ...SCHOOL_EXTRA, ...COMMON_POST_TOUR];
  return base;
}
