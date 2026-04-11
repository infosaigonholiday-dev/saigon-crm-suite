/**
 * Standardized position options and mapping logic
 * to auto-suggest system roles based on position + department.
 */

export const positionOptions = [
  { value: "GIAM_DOC", label: "Giám đốc" },
  { value: "PHO_GIAM_DOC", label: "Phó Giám đốc" },
  { value: "TRUONG_PHONG", label: "Trưởng phòng" },
  { value: "PHO_PHONG", label: "Phó phòng" },
  { value: "NHAN_VIEN", label: "Nhân viên" },
  { value: "THUC_TAP_SINH", label: "Thực tập sinh" },
  { value: "HUONG_DAN_VIEN", label: "Hướng dẫn viên" },
];

/** Department code → role mapping by position */
const deptRoleMap: Record<string, Record<string, string>> = {
  // Kinh doanh Nội địa
  DOMESTIC: {
    GIAM_DOC: "GDKD",
    PHO_GIAM_DOC: "GDKD",
    TRUONG_PHONG: "MANAGER",
    PHO_PHONG: "MANAGER",
    NHAN_VIEN: "SALE_DOMESTIC",
    THUC_TAP_SINH: "INTERN_SALE_DOMESTIC",
  },
  // Kinh doanh Outbound
  OUTBOUND: {
    GIAM_DOC: "GDKD",
    PHO_GIAM_DOC: "GDKD",
    TRUONG_PHONG: "MANAGER",
    PHO_PHONG: "MANAGER",
    NHAN_VIEN: "SALE_OUTBOUND",
    THUC_TAP_SINH: "INTERN_SALE_OUTBOUND",
  },
  // Kinh doanh MICE
  MICE: {
    GIAM_DOC: "GDKD",
    PHO_GIAM_DOC: "GDKD",
    TRUONG_PHONG: "MANAGER",
    PHO_PHONG: "MANAGER",
    NHAN_VIEN: "SALE_MICE",
    THUC_TAP_SINH: "INTERN_SALE_MICE",
  },
  // Kinh doanh Inbound (dự phòng)
  INBOUND: {
    GIAM_DOC: "GDKD",
    PHO_GIAM_DOC: "GDKD",
    TRUONG_PHONG: "MANAGER",
    PHO_PHONG: "MANAGER",
    NHAN_VIEN: "SALE_INBOUND",
    THUC_TAP_SINH: "INTERN_SALE_INBOUND",
  },
  // Nhân sự
  HCNS: {
    GIAM_DOC: "HR_MANAGER",
    PHO_GIAM_DOC: "HR_MANAGER",
    TRUONG_PHONG: "HR_MANAGER",
    PHO_PHONG: "HCNS",
    NHAN_VIEN: "HCNS",
    THUC_TAP_SINH: "INTERN_HCNS",
  },
  // Kế toán
  KETOAN: {
    GIAM_DOC: "KETOAN",
    PHO_GIAM_DOC: "KETOAN",
    TRUONG_PHONG: "KETOAN",
    PHO_PHONG: "KETOAN",
    NHAN_VIEN: "KETOAN",
    THUC_TAP_SINH: "INTERN_KETOAN",
  },
  // Điều hành Tour
  OPS: {
    GIAM_DOC: "DIEUHAN",
    PHO_GIAM_DOC: "DIEUHAN",
    TRUONG_PHONG: "DIEUHAN",
    PHO_PHONG: "DIEUHAN",
    NHAN_VIEN: "DIEUHAN",
    THUC_TAP_SINH: "INTERN_DIEUHAN",
    HUONG_DAN_VIEN: "TOUR",
  },
  // Điều hành Outbound
  OP_OUTBOUND: {
    GIAM_DOC: "DIEUHAN",
    PHO_GIAM_DOC: "DIEUHAN",
    TRUONG_PHONG: "DIEUHAN",
    PHO_PHONG: "DIEUHAN",
    NHAN_VIEN: "DIEUHAN",
    THUC_TAP_SINH: "INTERN_DIEUHAN",
    HUONG_DAN_VIEN: "TOUR",
  },
  // Marketing
  MKT: {
    GIAM_DOC: "MANAGER",
    PHO_GIAM_DOC: "MANAGER",
    TRUONG_PHONG: "MANAGER",
    PHO_PHONG: "MKT",
    NHAN_VIEN: "MKT",
    THUC_TAP_SINH: "INTERN_MKT",
  },
  // Ban Giám đốc
  BOD: {
    GIAM_DOC: "ADMIN",
    PHO_GIAM_DOC: "ADMIN",
    TRUONG_PHONG: "ADMIN",
    PHO_PHONG: "ADMIN",
    NHAN_VIEN: "ADMIN",
  },
};

/**
 * Suggest a system role based on position and department code.
 * Returns null if no mapping found.
 */
export function suggestRole(position: string, deptCode: string): string | null {
  const map = deptRoleMap[deptCode];
  if (!map) return null;
  return map[position] ?? null;
}

/**
 * Detect mismatch between position, department and current role.
 * Returns a warning message or null.
 */
export function detectPositionRoleMismatch(
  position: string | null,
  deptCode: string | null,
  currentRole: string,
  roleLabel: string
): string | null {
  if (!position || !deptCode) return null;
  const expected = suggestRole(position, deptCode);
  if (!expected) return null;
  if (expected === currentRole) return null;

  const posLabel = positionOptions.find(p => p.value === position)?.label ?? position;
  return `Vị trí "${posLabel}" thường tương ứng quyền khác, hiện đang gán "${roleLabel}". Vui lòng kiểm tra.`;
}
