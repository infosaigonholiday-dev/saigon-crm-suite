import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

// All permission keys in the system
export const ALL_PERMISSION_KEYS = [
  "customers.view", "customers.create", "customers.edit", "customers.delete",
  "leads.view", "leads.create", "leads.edit", "leads.delete",
  "bookings.view", "bookings.create", "bookings.edit", "bookings.delete", "bookings.approve",
  "quotations.view", "quotations.create", "quotations.edit", "quotations.delete",
  "payments.view", "payments.create", "payments.edit", "payments.delete",
  "employees.view", "employees.create", "employees.edit", "employees.delete",
  "leave.view", "leave.create", "leave.approve",
  "payroll.view", "payroll.create", "payroll.edit",
  "finance.view", "finance.edit", "finance.submit",
  "settings.view", "settings.edit",
] as const;

export type PermissionKey = typeof ALL_PERMISSION_KEYS[number];

// Permission groups for UI display
export const PERMISSION_GROUPS: Record<string, { label: string; keys: PermissionKey[] }> = {
  customers: { label: "Khách hàng", keys: ["customers.view", "customers.create", "customers.edit", "customers.delete"] },
  leads: { label: "Tiềm năng", keys: ["leads.view", "leads.create", "leads.edit", "leads.delete"] },
  bookings: { label: "Đặt tour", keys: ["bookings.view", "bookings.create", "bookings.edit", "bookings.delete", "bookings.approve"] },
  quotations: { label: "Báo giá", keys: ["quotations.view", "quotations.create", "quotations.edit", "quotations.delete"] },
  payments: { label: "Thanh toán", keys: ["payments.view", "payments.create", "payments.edit", "payments.delete"] },
  employees: { label: "Nhân sự", keys: ["employees.view", "employees.create", "employees.edit", "employees.delete"] },
  leave: { label: "Nghỉ phép", keys: ["leave.view", "leave.create", "leave.approve"] },
  payroll: { label: "Bảng lương", keys: ["payroll.view", "payroll.create", "payroll.edit"] },
  finance: { label: "Tài chính", keys: ["finance.view", "finance.edit", "finance.submit"] },
  settings: { label: "Cài đặt", keys: ["settings.view", "settings.edit"] },
};

// Default permissions per role (client-side mirror of DB function)
const DEFAULT_PERMISSIONS: Record<string, PermissionKey[]> = {
  ADMIN: [...ALL_PERMISSION_KEYS],
  SUPER_ADMIN: [...ALL_PERMISSION_KEYS],
  DIRECTOR: [
    "customers.view", "customers.create", "customers.edit",
    "leads.view", "leads.create", "leads.edit",
    "bookings.view", "bookings.create", "bookings.edit", "bookings.approve",
    "quotations.view", "quotations.create", "quotations.edit",
    "payments.view", "payments.create", "payments.edit",
    "employees.view", "employees.create", "employees.edit",
    "leave.view", "leave.approve",
    "payroll.view", "payroll.edit",
    "finance.view", "finance.edit",
    "settings.view",
  ],
  HCNS: ["employees.view", "employees.create", "employees.edit", "leave.view", "leave.create", "payroll.view", "payroll.create", "settings.view"],
  HR_MANAGER: ["employees.view", "employees.create", "employees.edit", "leave.view", "leave.create", "leave.approve", "payroll.view", "payroll.create", "payroll.edit", "settings.view"],
  HR_HEAD: ["employees.view", "employees.create", "employees.edit", "leave.view", "leave.create", "leave.approve", "payroll.view", "payroll.create", "payroll.edit", "bookings.view", "quotations.view", "payments.view", "settings.view"],
  KETOAN: ["customers.view", "bookings.view", "payments.view", "payments.create", "payments.edit", "payroll.view", "payroll.edit", "finance.view", "finance.edit", "settings.view"],
  MANAGER: ["customers.view", "customers.create", "customers.edit", "leads.view", "leads.create", "leads.edit", "bookings.view", "bookings.create", "bookings.edit", "quotations.view", "quotations.create", "quotations.edit", "payments.view", "payments.create", "employees.view", "leave.view", "leave.approve"],
  DIEUHAN: ["customers.view", "customers.create", "customers.edit", "leads.view", "leads.create", "leads.edit", "bookings.view", "bookings.create", "bookings.edit", "bookings.approve", "quotations.view", "quotations.create", "quotations.edit", "payments.view", "payments.create", "payments.edit"],
  SALE_DOMESTIC: ["customers.view", "customers.create", "customers.edit", "leads.view", "leads.create", "leads.edit", "bookings.view", "bookings.create", "quotations.view", "quotations.create", "quotations.edit", "payments.view"],
  SALE_INBOUND: ["customers.view", "customers.create", "customers.edit", "leads.view", "leads.create", "leads.edit", "bookings.view", "bookings.create", "quotations.view", "quotations.create", "quotations.edit", "payments.view"],
  SALE_OUTBOUND: ["customers.view", "customers.create", "customers.edit", "leads.view", "leads.create", "leads.edit", "bookings.view", "bookings.create", "quotations.view", "quotations.create", "quotations.edit", "payments.view"],
  SALE_MICE: ["customers.view", "customers.create", "customers.edit", "leads.view", "leads.create", "leads.edit", "bookings.view", "bookings.create", "quotations.view", "quotations.create", "quotations.edit", "payments.view"],
  TOUR: ["customers.view", "bookings.view"],
  MKT: ["customers.view", "leads.view", "leads.create", "leads.edit"],
  INTERN: [],
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
    (key: PermissionKey) => permissions.has(key),
    [permissions]
  );

  const hasAnyPermission = useCallback(
    (keys: PermissionKey[]) => keys.some((k) => permissions.has(k)),
    [permissions]
  );

  return { permissions, hasPermission, hasAnyPermission, loading };
}
