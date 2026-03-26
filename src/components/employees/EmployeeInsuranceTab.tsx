import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

const formatVND = (v: number | null) => v ? v.toLocaleString("vi-VN") + "đ" : "—";

export function EmployeeInsuranceTab({ employeeId }: { employeeId: string }) {
  const { data: insurance, isLoading } = useQuery({
    queryKey: ["insurance_records", employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurance_records")
        .select("*")
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  if (!insurance) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Chưa có thông tin bảo hiểm
        </CardContent>
      </Card>
    );
  }

  const InfoRow = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="text-right">
        <span className="text-sm font-medium">{value}</span>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Thông tin bảo hiểm</CardTitle>
            <Badge variant="outline" className={insurance.status === "ACTIVE" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}>
              {insurance.status === "ACTIVE" ? "Đang đóng" : insurance.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <InfoRow label="Số BHXH" value={insurance.bhxh_number ?? "—"} />
          <InfoRow label="Số BHYT" value={insurance.bhyt_number ?? "—"} />
          <InfoRow label="Số BHTN" value={insurance.bhtn_number ?? "—"} />
          <InfoRow label="Ngày tham gia BHXH" value={insurance.bhxh_enrolled_at ?? "—"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Tỷ lệ đóng</CardTitle></CardHeader>
        <CardContent>
          <InfoRow label="BHXH (NV / Cty)" value={`${insurance.bhxh_employee_pct ?? 0}% / ${insurance.bhxh_employer_pct ?? 0}%`} />
          <InfoRow label="BHYT (NV / Cty)" value={`${insurance.bhyt_employee_pct ?? 0}% / ${insurance.bhyt_employer_pct ?? 0}%`} />
          <InfoRow label="BHTN (NV / Cty)" value={`${insurance.bhtn_employee_pct ?? 0}% / ${insurance.bhtn_employer_pct ?? 0}%`} />
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader><CardTitle className="text-base">Đóng hàng tháng</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">NV đóng</p>
              <p className="text-xl font-bold">{formatVND(insurance.monthly_contribution_employee)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Công ty đóng</p>
              <p className="text-xl font-bold">{formatVND(insurance.monthly_contribution_employer)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
