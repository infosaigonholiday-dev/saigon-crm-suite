import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

type DataScope = "all" | "team" | "self";

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN", "DIRECTOR"];
const MANAGER_ROLES = ["MANAGER", "GDKD", "DIEUHAN"];
const FINANCE_ROLES = ["KETOAN"];
const HR_ROLES = ["HCNS", "HR_MANAGER", "HR_HEAD"];
const SELF_ROLES = ["SALE_DOMESTIC", "SALE_INBOUND", "SALE_OUTBOUND", "SALE_MICE", "MKT", "TOUR", "INTERN"];

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

function groupByMonth(rows: { total_value: number | null; created_at: string | null }[]) {
  const months = Array.from({ length: 12 }, (_, i) => ({ month: `T${i + 1}`, value: 0 }));
  for (const r of rows) {
    if (!r.created_at) continue;
    const m = new Date(r.created_at).getMonth();
    months[m].value += Math.round((Number(r.total_value) || 0) / 1_000_000);
  }
  return months;
}

export function useBusinessDashboardData() {
  const { user, userRole } = useAuth();
  const scope = getDataScope(userRole);

  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("department_id")
        .eq("id", user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const departmentId = profile?.department_id;

  const { data: bookingStats, isLoading: loadingBookings } = useQuery({
    queryKey: ["dashboard-bookings", scope, user?.id, departmentId],
    queryFn: async () => {
      let query = supabase.from("bookings").select("id, total_value, created_at, customer_id, sale_id");

      if (scope === "team" && departmentId) {
        query = query.eq("department_id", departmentId);
      } else if (scope === "self") {
        query = query.eq("sale_id", user!.id);
      }

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      query = query.gte("created_at", startOfMonth);

      const { data } = await query;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: leadStats, isLoading: loadingLeads } = useQuery({
    queryKey: ["dashboard-leads", scope, user?.id, departmentId],
    queryFn: async () => {
      let query = supabase.from("leads").select("id, created_at");

      if (scope === "team" && departmentId) {
        query = query.eq("department_id", departmentId);
      } else if (scope === "self") {
        query = query.eq("assigned_to", user!.id);
      }

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      query = query.gte("created_at", startOfMonth);

      const { data } = await query;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: customerCount, isLoading: loadingCustomers } = useQuery({
    queryKey: ["dashboard-customers", scope, user?.id, departmentId],
    queryFn: async () => {
      let query = supabase.from("customers").select("id", { count: "exact", head: true });

      if (scope === "team" && departmentId) {
        query = query.eq("department_id", departmentId);
      } else if (scope === "self") {
        query = query.eq("assigned_sale_id", user!.id);
      }

      const { count } = await query;
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: revenueByMonth, isLoading: loadingRevenue } = useQuery({
    queryKey: ["dashboard-revenue-chart", scope, user?.id, departmentId],
    queryFn: async () => {
      const now = new Date();
      const year = now.getFullYear();
      const startOfYear = new Date(year, 0, 1).toISOString();
      const endOfYear = new Date(year + 1, 0, 1).toISOString();

      let query = supabase
        .from("bookings")
        .select("total_value, created_at")
        .gte("created_at", startOfYear)
        .lt("created_at", endOfYear);

      if (scope === "team" && departmentId) {
        query = query.eq("department_id", departmentId);
      } else if (scope === "self") {
        query = query.eq("sale_id", user!.id);
      }

      const { data } = await query;
      return groupByMonth(data || []);
    },
    enabled: !!user,
  });

  const { data: deadlines } = useQuery({
    queryKey: ["dashboard-deadlines", scope, user?.id, departmentId],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];

      let depositQuery = supabase
        .from("bookings")
        .select("id, code, total_value, deposit_amount, deposit_due_at, customer_id, customers(full_name)")
        .eq("deposit_due_at", today);

      let remainingQuery = supabase
        .from("bookings")
        .select("id, code, total_value, remaining_amount, remaining_due_at, customer_id, customers(full_name)")
        .eq("remaining_due_at", today);

      if (scope === "team" && departmentId) {
        depositQuery = depositQuery.eq("department_id", departmentId);
        remainingQuery = remainingQuery.eq("department_id", departmentId);
      } else if (scope === "self") {
        depositQuery = depositQuery.eq("sale_id", user!.id);
        remainingQuery = remainingQuery.eq("sale_id", user!.id);
      }

      const [{ data: deposits }, { data: remaining }] = await Promise.all([depositQuery, remainingQuery]);

      const items: { customer: string; tour: string; type: string; amount: string }[] = [];

      (deposits || []).forEach((b: any) => {
        items.push({
          customer: b.customers?.full_name || "N/A",
          tour: b.code,
          type: "Đặt cọc",
          amount: new Intl.NumberFormat("vi-VN").format(b.deposit_amount || 0) + "đ",
        });
      });

      (remaining || []).forEach((b: any) => {
        items.push({
          customer: b.customers?.full_name || "N/A",
          tour: b.code,
          type: "Thanh toán",
          amount: new Intl.NumberFormat("vi-VN").format(b.remaining_amount || 0) + "đ",
        });
      });

      return items;
    },
    enabled: !!user,
  });

  const monthlyRevenue = (bookingStats || []).reduce((s, b) => s + (Number(b.total_value) || 0), 0);

  return {
    scope,
    stats: {
      monthlyRevenue,
      newBookings: bookingStats?.length || 0,
      newLeads: leadStats?.length || 0,
      customerCount: customerCount || 0,
    },
    revenueByMonth: revenueByMonth || [],
    deadlines: deadlines || [],
    loading: loadingBookings || loadingLeads || loadingCustomers || loadingRevenue,
  };
}

export function usePersonalDashboardData() {
  const { user } = useAuth();

  const { data: myBookings } = useQuery({
    queryKey: ["personal-bookings", user?.id],
    queryFn: async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { data } = await supabase
        .from("bookings")
        .select("id, total_value, status, created_at")
        .eq("sale_id", user!.id)
        .gte("created_at", startOfMonth);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: myLeads } = useQuery({
    queryKey: ["personal-leads", user?.id],
    queryFn: async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { data } = await supabase
        .from("leads")
        .select("id, status, created_at")
        .eq("assigned_to", user!.id)
        .gte("created_at", startOfMonth);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: myCustomers } = useQuery({
    queryKey: ["personal-customers", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("assigned_sale_id", user!.id);
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: monthlyData } = useQuery({
    queryKey: ["personal-monthly-chart", user?.id],
    queryFn: async () => {
      const now = new Date();
      const year = now.getFullYear();
      const startOfYear = new Date(year, 0, 1).toISOString();
      const endOfYear = new Date(year + 1, 0, 1).toISOString();

      const { data } = await supabase
        .from("bookings")
        .select("total_value, created_at")
        .eq("sale_id", user!.id)
        .gte("created_at", startOfYear)
        .lt("created_at", endOfYear);

      return groupByMonth(data || []);
    },
    enabled: !!user,
  });

  const myRevenue = (myBookings || []).reduce((s, b) => s + (Number(b.total_value) || 0), 0);

  return {
    stats: {
      myRevenue,
      myBookingCount: myBookings?.length || 0,
      myLeadCount: myLeads?.length || 0,
      myCustomerCount: myCustomers || 0,
    },
    monthlyData: monthlyData || [],
  };
}
