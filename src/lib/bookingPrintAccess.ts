/**
 * Helper kiểm quyền in Phiếu Xác Nhận Booking.
 * Dùng chung cho:
 * - Nút in nhanh ở bảng Bookings
 * - PrintConfirmationButton (trong BookingDetail)
 * - BookingConfirmationPrint (trang in)
 *
 * Quy tắc:
 * - ADMIN, SUPER_ADMIN, KETOAN, DIEUHAN: luôn được in (mọi booking)
 * - Sale phụ trách (booking.sale_id === userId): được in
 * - MANAGER / GDKD cùng phòng (booking.department_id === myDeptId): được in
 * - Còn lại (Sale khác phòng / Sale không phụ trách): KHÔNG được in
 */
export const ALWAYS_PRINT_ROLES = ["ADMIN", "SUPER_ADMIN", "DIEUHAN", "KETOAN"] as const;
export const DEPT_PRINT_ROLES = ["MANAGER", "GDKD"] as const;

export interface BookingPrintAccessInput {
  userRole: string | null | undefined;
  userId: string | null | undefined;
  myDeptId: string | null | undefined;
  booking: {
    sale_id: string | null | undefined;
    department_id: string | null | undefined;
  } | null | undefined;
}

export function canPrintBookingConfirmation(input: BookingPrintAccessInput): boolean {
  const { userRole, userId, myDeptId, booking } = input;
  if (!booking || !userRole || !userId) return false;

  if ((ALWAYS_PRINT_ROLES as readonly string[]).includes(userRole)) return true;
  if (booking.sale_id && booking.sale_id === userId) return true;
  if (
    (DEPT_PRINT_ROLES as readonly string[]).includes(userRole) &&
    myDeptId &&
    booking.department_id === myDeptId
  ) {
    return true;
  }
  return false;
}
