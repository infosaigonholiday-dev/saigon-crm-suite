import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PermissionKey, getDefaultPermissions, ScopeLevel } from "@/hooks/usePermissions";

const SCOPE_RULES: Record<string, Record<string, ScopeLevel>> = {
  ADMIN: { default: "all" },
  SUPER_ADMIN: { default: "all" },
  GDKD: { default: "department", raw_contacts: "department" },
  MANAGER: { default: "department", raw_contacts: "department" },
  DIEUHAN: { default: "all", staff: "personal", leave: "department", payroll: "personal" },
  HR_MANAGER: { default: "all", staff: "all", leave: "all", payroll: "all", finance: "personal" },
  KETOAN: { default: "all", staff: "personal", leave: "personal", payroll: "all", finance: "all" },
  MKT: { default: "personal" },
  HCNS: { default: "all", staff: "all", leave: "all", payroll: "all", finance: "personal" },
  SALE_DOMESTIC: { default: "personal", raw_contacts: "personal" },
  SALE_INBOUND: { default: "personal", raw_contacts: "personal" },
  SALE_OUTBOUND: { default: "personal", raw_contacts: "personal" },
  SALE_MICE: { default: "personal", raw_contacts: "personal" },
  TOUR: { default: "personal" },
  INTERN_SALE_DOMESTIC: { default: "personal", raw_contacts: "personal" },
  INTERN_SALE_OUTBOUND: { default: "personal", raw_contacts: "personal" },
  INTERN_SALE_MICE: { default: "personal", raw_contacts: "personal" },
  INTERN_SALE_INBOUND: { default: "personal", raw_contacts: "personal" },
  INTERN_DIEUHAN: { default: "personal" },
  INTERN_MKT: { default: "personal" },
  INTERN_HCNS: { default: "personal" },
  INTERN_KETOAN: { default: "personal" },
};

interface PermissionsContextType {
  permissions: Set<PermissionKey>;
  hasPermission: (module: string, action: string) => boolean;
  hasAnyPermission: (pairs: [string, string][]) => boolean;
  getScope: (module: string) => ScopeLevel;
  getVisibleModules: () => string[];
  loading: boolean;
}

const PermissionsContext = createContext<PermissionsContextType>({
  permissions: new Set(),
  hasPermission: () => false,
  hasAnyPermission: () => false,
  getScope: () => "personal",
  getVisibleModules: () => [],
  loading: true,
});

export const usePermissionsContext = () => useContext(PermissionsContext);

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { user, userRole, isReady } = useAuth();
  const [permissions, setPermissions] = useState<Set<PermissionKey>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Don't load permissions until auth is fully ready
    if (!isReady) {
      setLoading(true);
      return;
    }

    if (!user || !userRole) {
      setPermissions(new Set());
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      const defaults = new Set<PermissionKey>(getDefaultPermissions(userRole!));

      try {
        const { data: employee } = await supabase
          .from("employees")
          .select("id")
          .eq("profile_id", user!.id)
          .is("deleted_at", null)
          .maybeSingle();

        if (employee && !cancelled) {
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
      } catch {
        // Use defaults on error
      }

      if (!cancelled) {
        setPermissions(defaults);
        setLoading(false);
      }
    }

    setLoading(true);
    load();

    return () => { cancelled = true; };
  }, [user?.id, userRole, isReady]);

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
    if (!permissions.size) return [];
    const modules = new Set(Array.from(permissions).map((key) => key.split(".")[0]));
    return Array.from(modules);
  }, [permissions]);

  return (
    <PermissionsContext.Provider value={{ permissions, hasPermission, hasAnyPermission, getScope, getVisibleModules, loading }}>
      {children}
    </PermissionsContext.Provider>
  );
}
