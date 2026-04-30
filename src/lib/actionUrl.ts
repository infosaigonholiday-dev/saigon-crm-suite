/**
 * action_url single source of truth (CLIENT)
 * Phải khớp 1-1 với DB function public.generate_action_url() (Migration 2)
 *
 * Triết lý: URL chỉ là điều hướng — KHÔNG phải bằng chứng "đã xử lý".
 * Trạng thái 'completed' chỉ set khi entity nghiệp vụ thật thay đổi.
 */

export type EntityType =
  | "lead"
  | "customer"
  | "booking"
  | "tour_file"
  | "office_expense"
  | "tour_settlement"
  | "supplier_invoice"
  | "recurring_expense"
  | "leave_request"
  | "contract"
  | "campaign"
  | "employee";

export const ENTITY_LABEL: Record<EntityType, string> = {
  lead: "Lead (Khách tiềm năng)",
  customer: "Khách hàng",
  booking: "Booking",
  tour_file: "Hồ sơ đoàn",
  office_expense: "Chi phí HCNS",
  tour_settlement: "Quyết toán tour",
  supplier_invoice: "Hóa đơn NCC",
  recurring_expense: "Chi phí định kỳ",
  leave_request: "Đơn nghỉ phép",
  contract: "Hợp đồng",
  campaign: "Chiến dịch",
  employee: "Nhân viên",
};

export const ENTITY_URL_MAP: Record<EntityType, (id: string) => string> = {
  lead: (id) => `/tiem-nang?id=${id}`,
  customer: (id) => `/khach-hang/${id}`,
  booking: (id) => `/dat-tour/${id}`,
  tour_file: (id) => `/ho-so-doan/${id}`,
  office_expense: (id) => `/tai-chinh?tab=hcns&id=${id}`,
  tour_settlement: (id) => `/tai-chinh?tab=quyet-toan&id=${id}`,
  supplier_invoice: (id) => `/tai-chinh?tab=payables&id=${id}`,
  recurring_expense: (id) => `/tai-chinh?tab=recurring&id=${id}`,
  leave_request: (id) => `/nghi-phep?id=${id}`,
  contract: (id) => `/hop-dong?id=${id}`,
  campaign: (id) => `/chien-dich/${id}`,
  employee: (id) => `/nhan-su/${id}`,
};

export function generateActionUrlClient(
  entityType?: string | null,
  entityId?: string | null
): string | null {
  if (!entityType || !entityId) return null;
  const builder = ENTITY_URL_MAP[entityType as EntityType];
  return builder ? builder(entityId) : null;
}

const INVALID_URLS = new Set(["/", "#", "/notifications", ""]);

/** Validate URL hợp lệ theo rule DB CHECK (chk_action_url_required) */
export function isValidActionUrl(url?: string | null): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (trimmed.length <= 1) return false;
  if (INVALID_URLS.has(trimmed)) return false;
  return true;
}

/** Validate trước khi submit form notification */
export function validateNotificationUrl(opts: {
  action_url?: string | null;
  action_required?: boolean;
  priority?: string;
}): { ok: true } | { ok: false; error: string } {
  const needsUrl =
    opts.action_required === true ||
    opts.priority === "high" ||
    opts.priority === "critical";
  if (!needsUrl) return { ok: true };
  if (!isValidActionUrl(opts.action_url)) {
    return {
      ok: false,
      error:
        "Thông báo có 'Cần xử lý' hoặc ưu tiên Cao/Khẩn PHẢI có URL điều hướng trỏ đến entity. " +
        "Vui lòng chọn loại entity + entity, hoặc giảm ưu tiên về Thấp/Bình thường.",
    };
  }
  return { ok: true };
}

export type Priority = "low" | "medium" | "high" | "critical";
export const PRIORITY_LABEL: Record<Priority, string> = {
  low: "Thấp",
  medium: "Bình thường",
  high: "Cao",
  critical: "Khẩn",
};
