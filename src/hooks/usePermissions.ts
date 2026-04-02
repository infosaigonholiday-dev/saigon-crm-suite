import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

// All permission keys in the system
export const ALL_PERMISSION_KEYS = [
  "dashboard.view",
  "customers.view", "customers.create", "customers.edit", "customers.delete", "customers.export",
  "leads.view", "leads.create", "leads.edit", "leads.delete",
  "bookings.view", "bookings.create", "bookings.edit", "bookings.delete", "bookings.approve",
  "quotations.view", "quotations.create", "quotations.edit", "quotations.delete",
  "tour_packages.view", "tour_packages.create", "tour_packages.edit", "tour_packages.delete",
  "itineraries.view", "itineraries.create", "itineraries.edit", "itineraries.delete",
  "accommodations.view", "accommodations.create", "accommodations.edit", "accommodations.delete",
  "suppliers.view", "suppliers.create", "suppliers.edit", "suppliers.delete",
  "contracts.view", "contracts.create", "contracts.edit", "contracts.delete",
  "payments.view", "payments.create", "payments.edit", "payments.delete",
  "staff.view", "staff.create", "staff.edit", "staff.delete",
  "leave.view", "leave.create", "leave.approve",
  "payroll.view", "payroll.create", "payroll.edit",
  "finance.view", "finance.create", "finance.edit", "finance.submit",
  "workflow.view", "workflow.create",
  "settings.view", "settings.edit",
] as const;

export type PermissionKey = typeof ALL_PERMISSION_KEYS[number];

// Permission groups for UI display
export const PERMISSION_GROUPS: Record<string, { label: string; keys: PermissionKey[] }> = {
  dashboard: { label: "Tổng quan", keys: ["dashboard.view"] },
  customers: { label: "Khách hàng", keys: ["customers.view", "customers.create", "customers.edit", "customers.delete", "customers.export"] },
  leads: { label: "Tiềm năng", keys: ["leads.view", "leads.create", "leads.edit", "leads.delete"] },
  bookings: { label: "Đặt tour", keys: ["bookings.view", "bookings.create", "bookings.edit", "bookings.delete", "bookings.approve"] },
  quotations: { label: "Báo giá", keys: ["quotations.view", "quotations.create", "quotations.edit", "quotations.delete"] },
  tour_packages: { label: "Gói tour", keys: ["tour_packages.view", "tour_packages.create", "tour_packages.edit", "tour_packages.delete"] },
  itineraries: { label: "Lịch trình", keys: ["itineraries.view", "itineraries.create", "itineraries.edit", "itineraries.delete"] },
  accommodations: { label: "Lưu trú", keys: ["accommodations.view", "accommodations.create", "accommodations.edit", "accommodations.delete"] },
  suppliers: { label: "Nhà cung cấp", keys: ["suppliers.view", "suppliers.create", "suppliers.edit", "suppliers.delete"] },
  contracts: { label: "Hợp đồng", keys: ["contracts.view", "contracts.create", "contracts.edit", "contracts.delete"] },
  payments: { label: "Thanh toán", keys: ["payments.view", "payments.create", "payments.edit", "payments.delete"] },
  staff: { label: "Nhân sự", keys: ["staff.view", "staff.create", "staff.edit", "staff.delete"] },
  leave: { label: "Nghỉ phép", keys: ["leave.view", "leave.create", "leave.approve"] },
  payroll: { label: "Bảng lương", keys: ["payroll.view", "payroll.create", "payroll.edit"] },
  finance: { label: "Tài chính", keys: ["finance.view", "finance.create", "finance.edit", "finance.submit"] },
  workflow: { label: "Quy trình", keys: ["workflow.view", "workflow.create"] },
  settings: { label: "Cài đặt", keys: ["settings.view", "settings.edit"] },
};

// Default permissions per role (client-side mirror of DB function)
const DEFAULT_PERMISSIONS: Record<string, PermissionKey[]> = {
  ADMIN: [...ALL_PERMISSION_KEYS] as unknown as PermissionKey[],
  GDKD: [
    "dashboard.view",
    "customers.view", "customers.create",
    "leads.view", "leads.create",
    "bookings.view", "bookings.create", "bookings.edit", "bookings.approve",
    "quotations.view", "quotations.create", "quotations.edit",
    "payments.view", "payments.create",
    "staff.view", "staff.create", "staff.edit",
    "leave.view", "leave.approve",
    "payroll.view",
    "finance.view", "finance.edit", "finance.submit",
    "workflow.view", "workflow.create",
    "settings.view",
  ],
  MANAGER: [
    "dashboard.view",
    "customers.view", "customers.create",
    "leads.view", "leads.create", "leads.edit",
    "bookings.view", "bookings.create", "bookings.edit",
    "quotations.view", "quotations.create", "quotations.edit",
    "payments.view", "payments.create",
    "staff.view",
    "leave.view", "leave.approve",
    "finance.submit",
    "workflow.view", "workflow.create",
    "settings.view",
  ],
  DIEUHAN: [
    "customers.view", "customers.create", "customers.edit",
    "leads.view", "leads.create", "leads.edit",
    "bookings.view", "bookings.create", "bookings.edit", "bookings.approve",
    "quotations.view", "quotations.create", "quotations.edit",
    "payments.view", "payments.create", "payments.edit",
    "finance.view", "finance.create", "finance.submit",
    "workflow.view", "workflow.create",
    "suppliers.view",
  ],
  HR_MANAGER: [
    "staff.view", "staff.create", "staff.edit",
    "leave.view", "leave.create", "leave.approve",
    "payroll.view", "payroll.create", "payroll.edit",
    "finance.create", "finance.submit",
    "settings.view",
    "workflow.view", "workflow.create",
  ],
  KETOAN: [
    "customers.view",
    "bookings.view",
    "payments.view", "payments.create", "payments.edit",
    "payroll.view", "payroll.create", "payroll.edit",
    "finance.view", "finance.create", "finance.edit", "finance.submit",
    "settings.view",
    "workflow.view", "workflow.create",
    "suppliers.view", "suppliers.create",
  ],
  MKT: [
    "leads.create", "leads.edit",
    "leave.view", "leave.create",
    "workflow.view",
  ],
  HCNS: [
    "staff.view", "staff.create", "staff.edit",
    "leave.view", "leave.create", "leave.approve",
    "payroll.view", "payroll.create", "payroll.edit",
    "finance.create", "finance.submit",
    "settings.view",
    "workflow.view", "workflow.create",
  ],
  SALE_DOMESTIC: [
    "customers.view", "customers.create", "customers.edit",
    "leads.view", "leads.create", "leads.edit",
    "bookings.view", "bookings.create",
    "quotations.view", "quotations.create", "quotations.edit",
    "payments.view",
    "leave.view", "leave.create",
    "workflow.view",
  ],
  SALE_INBOUND: [
    "customers.view", "customers.create", "customers.edit",
    "leads.view", "leads.create", "leads.edit",
    "bookings.view", "bookings.create",
    "quotations.view", "quotations.create", "quotations.edit",
    "payments.view",
    "leave.view", "leave.create",
    "workflow.view",
  ],
  SALE_OUTBOUND: [
    "customers.view", "customers.create", "customers.edit",
    "leads.view", "leads.create", "leads.edit",
    "bookings.view", "bookings.create",
    "quotations.view", "quotations.create", "quotations.edit",
    "payments.view",
    "leave.view", "leave.create",
    "workflow.view",
  ],
  SALE_MICE: [
    "customers.view", "customers.create", "customers.edit",
    "leads.view", "leads.create", "leads.edit",
    "bookings.view", "bookings.create",
    "quotations.view", "quotations.create", "quotations.edit",
    "payments.view",
    "leave.view", "leave.create",
    "workflow.view",
  ],
  TOUR: [
    "customers.view",
    "bookings.view",
    "leave.view", "leave.create",
    "workflow.view",
  ],
  INTERN_SALE_DOMESTIC: [
    "customers.view", "customers.create",
    "leads.view", "leads.create",
    "bookings.view", "bookings.create",
    "leave.view", "leave.create",
    "workflow.view",
  ],
  INTERN_SALE_OUTBOUND: [
    "customers.view", "customers.create",
    "leads.view", "leads.create",
    "bookings.view", "bookings.create",
    "leave.view", "leave.create",
    "workflow.view",
  ],
  INTERN_SALE_MICE: [
    "customers.view", "customers.create",
    "leads.view", "leads.create",
    "bookings.view", "bookings.create",
    "leave.view", "leave.create",
    "workflow.view",
  ],
  INTERN_SALE_INBOUND: [
    "customers.view", "customers.create",
    "leads.view", "leads.create",
    "bookings.view", "bookings.create",
    "leave.view", "leave.create",
    "workflow.view",
  ],
  INTERN_DIEUHAN: [
    "bookings.view",
    "leave.view", "leave.create",
    "workflow.view",
  ],
  INTERN_MKT: [
    "leads.create", "leads.edit",
    "leave.view", "leave.create",
    "workflow.view",
  ],
  INTERN_HCNS: [
    "staff.view",
    "leave.view", "leave.create",
    "workflow.view",
  ],
  INTERN_KETOAN: [
    "bookings.view",
    "payments.view",
    "leave.view", "leave.create",
    "workflow.view",
  ],
};

// Scope rules: determines data visibility scope per role/module
export type ScopeLevel = "all" | "department" | "personal";

const SCOPE_RULES: Record<string, Record<string, ScopeLevel>> = {
  ADMIN: { default: "all" },
  GDKD: {
    default: "department",
    customers: "department",
    leads: "department",
    staff: "department",
    leave: "department",
    payroll: "department",
    finance: "department",
    settings: "department",
  },
  MANAGER: {
    default: "department",
    customers: "department",
    leads: "department",
    staff: "department",
    leave: "department",
    finance: "department",
    settings: "department",
  },
  SALE_DOMESTIC: { default: "personal", customers: "personal", leads: "personal" },
  SALE_INBOUND: { default: "personal", customers: "personal", leads: "personal" },
  SALE_OUTBOUND: { default: "personal", customers: "personal", leads: "personal" },
  SALE_MICE: { default: "personal", customers: "personal", leads: "personal" },
  MKT: { default: "personal", leads: "personal" },
  INTERN_SALE_DOMESTIC: { default: "personal" },
  INTERN_SALE_OUTBOUND: { default: "personal" },
  INTERN_SALE_MICE: { default: "personal" },
  INTERN_SALE_INBOUND: { default: "personal" },
  INTERN_MKT: { default: "personal", leads: "personal" },
};

export function getDefaultPermissions(role: string): PermissionKey[] {
  return DEFAULT_PERMISSIONS[role] || [];
}

export function usePermissions() {
  const { user, userRole } = useAuth();
  const [permissions, setPermissions] = useState<Set<PermissionKey>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !userRole) {
      setPermissions(new Set());
      setLoading(false);
      return;
    }

    async function load() {
      // Start with role defaults
      const defaults = new Set<PermissionKey>(getDefaultPermissions(userRole!));

      // Fetch custom overrides from employee_permissions
      const { data: employee } = await supabase
        .from("employees")
        .select("id")
        .eq("profile_id", user!.id)
        .is("deleted_at", null)
        .maybeSingle();

      if (employee) {
        const { data: overrides } = await supabase
          .from("employee_permissions")
          .select("permission_key, granted")
          .eq("employee_id", employee.id);

        if (overrides) {
          for (const o of overrides) {
            const key = o.permission_key as PermissionKey;
            if (o.granted) {
              defaults.add(key);
            } else {
              defaults.delete(key);
            }
          }
        }
      }

      setPermissions(defaults);
      setLoading(false);
    }

    load();
  }, [user, userRole]);

  const hasPermission = useCallback(
    (module: string, action: string) => permissions.has(`${module}.${action}` as PermissionKey),
    [permissions]
  );

  const hasAnyPermission = useCallback(
    (pairs: [string, string][]) => pairs.some(([m, a]) => permissions.has(`${m}.${a}` as PermissionKey)),
    [permissions]
  );

  const getScope = useCallback(
    (module: string): ScopeLevel => {
      const roleScope = SCOPE_RULES[userRole || ""];
      if (!roleScope) return "personal";
      return roleScope[module] || roleScope.default || "personal";
    },
    [userRole]
  );

  const getVisibleModules = useCallback((): string[] => {
    const rolePerms = DEFAULT_PERMISSIONS[userRole || ""];
    if (!rolePerms) return [];
    const modules = new Set(rolePerms.map((k) => k.split(".")[0]));
    return Array.from(modules);
  }, [userRole]);

  return { permissions, hasPermission, hasAnyPermission, loading, getScope, getVisibleModules };
}
