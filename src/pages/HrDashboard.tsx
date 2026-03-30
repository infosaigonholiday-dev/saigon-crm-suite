import { Card, CardContent } from "@/components/ui/card";
import { Users, CalendarOff, UserCheck, UserX } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function HrDashboard() {
  const { data: employeeStats } = useQuery({
    queryKey: ["hr-dashboard-employees"],
    queryFn: async () => {
      const { count: total } = await supabase
        .from("employees")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null);

      const { count: active } = await supabase
        .from("employees")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null)
        .eq("status", "ACTIVE");

      const { count: probation } = await supabase
        .from("employees")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null)
        .eq("status", "PROBATION");

      return { total: total || 0, active: active || 0, probation: probation || 0 };
    },
  });

  const { data: pendingLeaves } = useQuery({
    queryKey: ["hr-dashboard-leaves"],
    queryFn: async () => {
      const { count } = await supabase
        .from("leave_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "PENDING");
      return count || 0;
    },
  });

  const statCards = [
    { label: "Tổng nhân sự", value: employeeStats?.total || 0, icon: Users },
    { label: "Đang làm việc", value: employeeStats?.active || 0, icon: UserCheck },
    { label: "Thử việc", value: employeeStats?.probation || 0, icon: UserX },
    { label: "Đơn nghỉ phép chờ duyệt", value: pendingLeaves || 0, icon: CalendarOff },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tổng quan nhân sự</h1>
        <p className="text-muted-foreground text-sm">Thống kê nhân sự tháng {new Date().getMonth() + 1}/{new Date().getFullYear()}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
