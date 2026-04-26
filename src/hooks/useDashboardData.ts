import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

type DataScope = "all" | "team" | "self";

const ADMIN_ROLES = ["ADMIN"];
const MANAGER_ROLES = ["MANAGER", "GDKD", "DIEUHAN"];
const FINANCE_ROLES = ["KETOAN"];
const HR_ROLES = ["HCNS", "HR_MANAGER"];

export function getDataScope(role: string | null): DataScope {
  if (!role) return "self";
  if (ADMIN_ROLES.includes(role) || FINANCE_ROLES.includes(role)) return "all";
  if (MANAGER_ROLES.includes(role)) return "team";
  return "self";
}

export function getDashboardType(role: string | null): "business" | "personal" | "hr" | "manager" {
  if (!role) return "personal";
  if (HR_ROLES.includes(role)) return "hr";
  if (MANAGER_ROLES.includes(role)) return "manager";
  if (ADMIN_ROLES.includes(role) || FINANCE_ROLES.includes(role)) return "business";
  return "personal";
}

interface BusinessDashboardResult {
  stats: {
    monthly_revenue: number;
    new_bookings: number;
    new_leads: number;
    customer_count: number;
  };
  revenue_by_month: { month: string; value: number }[];
  deadlines: { customer: string; tour: string; type: string; amount: string }[];
}

interface PersonalDashboardResult {
  stats: {
    my_revenue: number;
    my_booking_count: number;
    my_lead_count: number;
    my_customer_count: number;
  };
  monthly_chart: { month: string; value: number }[];
}

const STALE_5_MIN = 5 * 60 * 1000;

export function useBusinessDashboardData() {
  const { user, userRole } = useAuth();
  const scope = getDataScope(userRole);

  const { data: profile } = useQuery({
    queryKey: ["my-profile-deptid", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("department_id")
        .eq("id", user.id)
        .single();
      return data;
    },
    enabled: !!user && !!userRole,
    staleTime: STALE_5_MIN,
  });

  const departmentId = profile?.department_id ?? null;
  const ready = !!user && !!userRole && (scope !== "team" || profile !== undefined);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-business-rpc", user?.id, scope, departmentId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_dashboard_business" as any, {
        p_user_id: user!.id,
        p_scope: scope,
        p_dept_id: departmentId,
      });
      if (error) throw error;
      return data as unknown as BusinessDashboardResult;
    },
    enabled: ready,
    staleTime: STALE_5_MIN,
  });

  return {
    scope,
    stats: {
      monthlyRevenue: Number(data?.stats?.monthly_revenue ?? 0),
      newBookings: data?.stats?.new_bookings ?? 0,
      newLeads: data?.stats?.new_leads ?? 0,
      customerCount: data?.stats?.customer_count ?? 0,
    },
    revenueByMonth: data?.revenue_by_month ?? [],
    deadlines: data?.deadlines ?? [],
    loading: isLoading,
  };
}

export function usePersonalDashboardData() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-personal-rpc", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_dashboard_personal" as any, {
        p_user_id: user!.id,
      });
      if (error) throw error;
      return data as unknown as PersonalDashboardResult;
    },
    enabled: !!user,
    staleTime: STALE_5_MIN,
  });

  return {
    stats: {
      myRevenue: Number(data?.stats?.my_revenue ?? 0),
      myBookingCount: data?.stats?.my_booking_count ?? 0,
      myLeadCount: data?.stats?.my_lead_count ?? 0,
      myCustomerCount: data?.stats?.my_customer_count ?? 0,
    },
    monthlyData: data?.monthly_chart ?? [],
    loading: isLoading,
  };
}

interface CeoDashboardResult {
  customer_overview: {
    total: number;
    new_this_month: number;
    tier_diamond: number;
    tier_gold: number;
    tier_silver: number;
    tier_new: number;
    blacklisted: number;
  };
  pipeline_funnel: Record<string, number>;
  sale_performance: { sale_id: string; full_name: string; revenue: number; bookings: number }[];
  revenue_chart: { month: string; revenue: number }[];
}

export function useCeoDashboardData(deptId: string | null = null) {
  const { user, userRole } = useAuth();
  const allowed = ["ADMIN", "SUPER_ADMIN", "GDKD", "MANAGER", "DIEUHAN", "KETOAN"].includes(userRole ?? "");

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-ceo-rpc", user?.id, deptId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_dashboard_ceo" as any, {
        p_dept_id: deptId,
      });
      if (error) throw error;
      return data as unknown as CeoDashboardResult;
    },
    enabled: !!user && allowed,
    staleTime: STALE_5_MIN,
  });

  return { data, loading: isLoading };
}
