import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions, ScopeLevel } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Hook to get department_id for the current user (used when scope = "department")
 */
export function useMyDepartmentId(enabled: boolean) {
  return useQuery({
    queryKey: ["my-dept-id"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_department_id");
      if (error) throw error;
      return data as string | null;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 min cache
  });
}

/**
 * Hook to get the current user's employee ID (used when scope = "personal")
 */
export function useMyEmployeeId(enabled: boolean) {
  return useQuery({
    queryKey: ["my-employee-id"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_employee_id");
      if (error) throw error;
      return data as string | null;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to get the scope for a given module along with department_id if needed
 */
export function useModuleScope(module: string) {
  const { getScope } = usePermissions();
  const { user } = useAuth();
  const scope = getScope(module);
  const { data: myDeptId } = useMyDepartmentId(scope === "department");
  const { data: myEmployeeId } = useMyEmployeeId(scope === "personal");

  return {
    scope,
    userId: user?.id ?? null,
    myDeptId: myDeptId ?? null,
    myEmployeeId: myEmployeeId ?? null,
  };
}
