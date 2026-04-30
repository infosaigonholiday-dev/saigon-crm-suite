import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Briefcase, AlertTriangle, ClipboardCheck, CalendarClock, FileWarning, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Stats {
  overdue_by_dept: { department: string; count: number }[];
  pending_check: number;
  upcoming_with_open_tasks: number;
  tours_missing_guest_list: number;
}

const VISIBLE_ROLES = [
  "ADMIN", "SUPER_ADMIN", "GDKD",
  "MANAGER_HCM", "MANAGER_HN", "MANAGER_DN", "MANAGER_CT", "MANAGER_NT",
  "DIEUHAN", "OPS_HCM", "OPS_HN", "OPS_DN", "OPS_CT", "OPS_NT",
  "KETOAN", "KETOANTRUONG", "ACCOUNTANT",
];

export default function TourOpsWidgets() {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const visible = VISIBLE_ROLES.includes(userRole || "");

  const { data, isLoading } = useQuery({
    queryKey: ["tour-ops-stats"],
    enabled: visible,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("rpc_tour_dashboard_stats");
      if (error) throw error;
      return (data || {}) as Stats;
    },
  });

  if (!visible) return null;

  const overdueTotal = (data?.overdue_by_dept || []).reduce((s, x) => s + (x.count || 0), 0);

  const cards = [
    {
      label: "Task quá hạn",
      value: overdueTotal,
      icon: AlertTriangle,
      tone: "bg-destructive/10 text-destructive border-destructive/30",
      onClick: () => navigate("/ho-so-doan?overdue=true"),
    },
    {
      label: "Chờ kiểm",
      value: data?.pending_check || 0,
      icon: ClipboardCheck,
      tone: "bg-violet-100 text-violet-800 border-violet-300",
      onClick: () => navigate("/ho-so-doan?pending_check=true"),
    },
    {
      label: "Khởi hành ≤ 7 ngày còn task",
      value: data?.upcoming_with_open_tasks || 0,
      icon: CalendarClock,
      tone: "bg-amber-100 text-amber-800 border-amber-300",
      onClick: () => navigate("/ho-so-doan?upcoming=true"),
    },
    {
      label: "Tour thiếu DS khách",
      value: data?.tours_missing_guest_list || 0,
      icon: FileWarning,
      tone: "bg-orange-100 text-orange-800 border-orange-300",
      onClick: () => navigate("/ho-so-doan?missing_doc=guest_list"),
    },
  ];

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Briefcase className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Vận hành đoàn / MICE</h2>
      </div>
      {isLoading ? (
        <Card><CardContent className="py-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></CardContent></Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {cards.map((c) => (
            <Card
              key={c.label}
              role="button"
              onClick={c.onClick}
              className="cursor-pointer hover:shadow-md transition-shadow"
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{c.label}</p>
                  <p className="text-2xl font-bold mt-1">{c.value}</p>
                </div>
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center border ${c.tone}`}>
                  <c.icon className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {(data?.overdue_by_dept || []).length > 0 && (
        <p className="text-xs text-muted-foreground mt-2">
          Quá hạn theo phòng: {data!.overdue_by_dept.map(x => `${x.department} (${x.count})`).join(", ")}
        </p>
      )}
    </div>
  );
}
