import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  employeeId: string;
}

const DAY_LABELS = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
const DAY_SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

type Row = {
  day_of_week: number;
  is_working: boolean;
  start_time: string;
  end_time: string;
};

const FULL_TIME_DEFAULT: Row[] = Array.from({ length: 7 }, (_, d) => ({
  day_of_week: d,
  is_working: d >= 1 && d <= 6, // T2-T7
  start_time: "08:00",
  end_time: "17:30",
}));

const PART_TIME_DEFAULT: Row[] = Array.from({ length: 7 }, (_, d) => ({
  day_of_week: d,
  is_working: d === 1 || d === 3 || d === 5, // T2, T4, T6
  start_time: "08:00",
  end_time: "17:30",
}));

const EMPTY_DEFAULT: Row[] = Array.from({ length: 7 }, (_, d) => ({
  day_of_week: d,
  is_working: false,
  start_time: "08:00",
  end_time: "17:30",
}));

export function EmployeeWorkScheduleTab({ employeeId }: Props) {
  const queryClient = useQueryClient();
  const { userRole } = useAuth();
  const canEdit = ["ADMIN", "SUPER_ADMIN", "HR_MANAGER", "HCNS"].includes(userRole || "");

  const [rows, setRows] = useState<Row[]>(EMPTY_DEFAULT);
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["work_schedules", employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_schedules" as any)
        .select("day_of_week, is_working, start_time, end_time")
        .eq("employee_id", employeeId)
        .order("day_of_week");
      if (error) throw error;
      return data as any[];
    },
  });

  useEffect(() => {
    if (!data) return;
    if (data.length === 0) {
      setRows(EMPTY_DEFAULT);
    } else {
      const map = new Map(data.map((r: any) => [r.day_of_week, r]));
      setRows(Array.from({ length: 7 }, (_, d) => {
        const r = map.get(d) as any;
        return r ? {
          day_of_week: d,
          is_working: !!r.is_working,
          start_time: (r.start_time ?? "08:00").slice(0, 5),
          end_time: (r.end_time ?? "17:30").slice(0, 5),
        } : { day_of_week: d, is_working: false, start_time: "08:00", end_time: "17:30" };
      }));
    }
  }, [data]);

  const summary = useMemo(() => {
    const working = rows.filter(r => r.is_working).map(r => DAY_SHORT[r.day_of_week]);
    if (working.length === 0) return "Chưa cấu hình lịch làm việc";
    return working.join(" • ");
  }, [rows]);

  function update(idx: number, patch: Partial<Row>) {
    setRows(rs => rs.map((r, i) => i === idx ? { ...r, ...patch } : r));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = rows.map(r => ({
        employee_id: employeeId,
        day_of_week: r.day_of_week,
        is_working: r.is_working,
        start_time: r.start_time,
        end_time: r.end_time,
      }));
      const { error } = await supabase
        .from("work_schedules" as any)
        .upsert(payload, { onConflict: "employee_id,day_of_week" });
      if (error) throw error;
      toast.success("Đã lưu lịch làm việc");
      queryClient.invalidateQueries({ queryKey: ["work_schedules", employeeId] });
      queryClient.invalidateQueries({ queryKey: ["work_schedules_all"] });
    } catch (err: any) {
      toast.error(err.message || "Lỗi lưu lịch làm việc");
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="text-base">Lịch làm việc trong tuần</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">{summary}</p>
          </div>
          {canEdit && (
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => setRows(FULL_TIME_DEFAULT)}>
                Mặc định toàn thời gian
              </Button>
              <Button variant="outline" size="sm" onClick={() => setRows(PART_TIME_DEFAULT)}>
                Mặc định bán thời gian
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map((r, idx) => (
          <div key={r.day_of_week} className="flex items-center gap-3 py-2 border-b last:border-b-0">
            <div className="w-24 text-sm font-medium">{DAY_LABELS[r.day_of_week]}</div>
            <Switch
              checked={r.is_working}
              onCheckedChange={(v) => update(idx, { is_working: v })}
              disabled={!canEdit}
            />
            <span className="text-xs text-muted-foreground w-16">
              {r.is_working ? "Làm việc" : "Nghỉ"}
            </span>
            <div className="flex items-center gap-2 ml-auto">
              <Input
                type="time"
                value={r.start_time}
                onChange={(e) => update(idx, { start_time: e.target.value })}
                disabled={!canEdit || !r.is_working}
                className="w-28 h-8"
              />
              <span className="text-muted-foreground text-sm">→</span>
              <Input
                type="time"
                value={r.end_time}
                onChange={(e) => update(idx, { end_time: e.target.value })}
                disabled={!canEdit || !r.is_working}
                className="w-28 h-8"
              />
            </div>
          </div>
        ))}
        {canEdit && (
          <div className="flex justify-end pt-3">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
              Lưu lịch làm việc
            </Button>
          </div>
        )}
        {!canEdit && (
          <p className="text-xs text-muted-foreground italic pt-3">
            Chỉ ADMIN / HR_MANAGER / HCNS mới được chỉnh sửa lịch làm việc.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
