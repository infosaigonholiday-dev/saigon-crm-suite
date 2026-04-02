import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, TrendingUp, TrendingDown, DollarSign, BarChart3 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { TransactionListTab } from "@/components/finance/TransactionListTab";
import { ApprovalTab } from "@/components/finance/ApprovalTab";
import { SalaryCostTab } from "@/components/finance/SalaryCostTab";
import { ExpenseListTab } from "@/components/finance/ExpenseListTab";
import { ExpenseSummaryTab } from "@/components/finance/ExpenseSummaryTab";
import { BudgetEstimatesTab } from "@/components/finance/BudgetEstimatesTab";
import { BudgetSettlementsTab } from "@/components/finance/BudgetSettlementsTab";
import { RevenueReportTab } from "@/components/finance/RevenueReportTab";
import { ProfitReportTab } from "@/components/finance/ProfitReportTab";
import { CashflowReportTab } from "@/components/finance/CashflowReportTab";
import { TaxReportTab } from "@/components/finance/TaxReportTab";
import { DebtReportTab } from "@/components/finance/DebtReportTab";

const formatVND = (v: number | null) => {
  if (!v) return "0";
  if (Math.abs(v) >= 1_000_000) return (v / 1_000_000).toFixed(1) + "tr";
  return v.toLocaleString("vi-VN");
};

const OFFICE_CATEGORIES = [
  { value: "RENT", label: "Tiền nhà" },
  { value: "ELECTRICITY", label: "Tiền điện" },
  { value: "WATER", label: "Tiền nước" },
  { value: "WIFI", label: "Wifi/Internet" },
  { value: "PHONE", label: "Cước điện thoại" },
  { value: "PARKING", label: "Gửi xe" },
  { value: "SUPPLIES", label: "Văn phòng phẩm" },
  { value: "OTHER", label: "Khác" },
];

const MARKETING_CATEGORIES = [
  { value: "ADS", label: "Quảng cáo" },
  { value: "CONTENT", label: "Nội dung" },
  { value: "OTA_COMMISSION", label: "Hoa hồng OTA" },
  { value: "EVENT", label: "Sự kiện" },
  { value: "OTHER", label: "Khác" },
];

const OTHER_CATEGORIES = [
  { value: "LEGAL", label: "Pháp lý" },
  { value: "TRAINING", label: "Đào tạo" },
  { value: "BANK_FEE", label: "Phí ngân hàng" },
  { value: "LICENSE", label: "Giấy phép" },
  { value: "OTHER", label: "Khác" },
];

const FULL_ACCESS_ROLES = ["ADMIN", "SUPER_ADMIN", "DIRECTOR", "KETOAN"];

function OverviewTab() {
  const currentYear = new Date().getFullYear();

  const { data: pnl = [], isLoading: loadingPnl } = useQuery({
    queryKey: ["profit_loss_monthly", currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profit_loss_monthly")
        .select("*")
        .eq("year", currentYear)
        .order("month", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: revenue = [], isLoading: loadingRev } = useQuery({
    queryKey: ["revenue_records", currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("revenue_records")
        .select("*")
        .eq("year", currentYear)
        .order("month", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const isLoading = loadingPnl || loadingRev;
  const totalRevenue = pnl.reduce((s, r) => s + (r.gross_revenue ?? 0), 0);
  const totalProfit = pnl.reduce((s, r) => s + (r.net_profit ?? 0), 0);
  const totalBookings = revenue.reduce((s, r) => s + (r.booking_count ?? 0), 0);
  const latestMargin = pnl.length > 0 ? pnl[pnl.length - 1].net_margin_pct ?? 0 : 0;

  const chartData = pnl.map((r) => ({
    month: `T${r.month}`,
    revenue: (r.gross_revenue ?? 0) / 1_000_000,
    profit: (r.net_profit ?? 0) / 1_000_000,
  }));

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const stats = [
    { label: "Doanh thu năm", value: formatVND(totalRevenue), icon: TrendingUp },
    { label: "Lợi nhuận ròng", value: formatVND(totalProfit), icon: DollarSign },
    { label: "Tổng booking", value: totalBookings.toString(), icon: BarChart3 },
    { label: "Biên LN tháng gần nhất", value: latestMargin.toFixed(1) + "%", icon: TrendingDown },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold mt-1">{s.value}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Doanh thu & Lợi nhuận theo tháng (triệu VNĐ)</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                <Bar dataKey="revenue" name="Doanh thu" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" name="Lợi nhuận" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center py-12 text-muted-foreground">Chưa có dữ liệu</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SubmitterView() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Nhập chi phí</h1>
        <p className="text-sm text-muted-foreground">Nhập chi phí và gửi Kế toán duyệt</p>
      </div>
      <TransactionListTab submitterOnly />
    </div>
  );
}

function ManagerFinanceView() {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["my-profile-dept-finance", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("department_id")
        .eq("id", user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Doanh thu</h1>
        <p className="text-sm text-muted-foreground">Báo cáo doanh thu phòng ban</p>
      </div>
      <RevenueReportTab departmentFilter={profile?.department_id} />
    </div>
  );
}

export default function Finance() {
  const { hasPermission } = usePermissions();
  const { userRole } = useAuth();
  const hasFinanceView = hasPermission("finance.view");
  const hasFinanceSubmit = hasPermission("finance.submit");
  const isFullAccess = FULL_ACCESS_ROLES.includes(userRole || "");
  const isManager = ["MANAGER", "GDKD"].includes(userRole || "");

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ["pending-approval-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("approval_status", "PENDING_REVIEW");
      if (error) throw error;
      return count || 0;
    },
    enabled: isFullAccess,
  });

  if (!hasFinanceView && hasFinanceSubmit) {
    return <SubmitterView />;
  }

  if (isManager && !isFullAccess) {
    return <ManagerFinanceView />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tài chính</h1>
        <p className="text-sm text-muted-foreground">Quản lý tài chính tổng hợp</p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full flex overflow-x-auto">
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          {isFullAccess && (
            <TabsTrigger value="approval" className="relative">
              Duyệt chi phí
              {pendingCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold min-w-[18px] h-[18px] px-1">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
          )}
          <TabsTrigger value="cashbook">Sổ quỹ</TabsTrigger>
          <TabsTrigger value="estimates">Dự toán</TabsTrigger>
          <TabsTrigger value="settlements">Quyết toán</TabsTrigger>
          <TabsTrigger value="revenue">Doanh thu</TabsTrigger>
          <TabsTrigger value="profit">Lợi nhuận</TabsTrigger>
          <TabsTrigger value="cashflow">Dòng tiền</TabsTrigger>
          <TabsTrigger value="tax">Thuế</TabsTrigger>
          <TabsTrigger value="debt">Công nợ</TabsTrigger>
          <TabsTrigger value="salary">CP Lương</TabsTrigger>
          <TabsTrigger value="office">CP Văn phòng</TabsTrigger>
          <TabsTrigger value="marketing">CP Marketing</TabsTrigger>
          <TabsTrigger value="other">CP Khác</TabsTrigger>
          <TabsTrigger value="opex">Tổng hợp OPEX</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4"><OverviewTab /></TabsContent>
        {isFullAccess && <TabsContent value="approval" className="mt-4"><ApprovalTab /></TabsContent>}
        <TabsContent value="cashbook" className="mt-4"><TransactionListTab /></TabsContent>
        <TabsContent value="estimates" className="mt-4"><BudgetEstimatesTab /></TabsContent>
        <TabsContent value="settlements" className="mt-4"><BudgetSettlementsTab /></TabsContent>
        <TabsContent value="revenue" className="mt-4"><RevenueReportTab /></TabsContent>
        <TabsContent value="profit" className="mt-4"><ProfitReportTab /></TabsContent>
        <TabsContent value="cashflow" className="mt-4"><CashflowReportTab /></TabsContent>
        <TabsContent value="tax" className="mt-4"><TaxReportTab /></TabsContent>
        <TabsContent value="debt" className="mt-4"><DebtReportTab /></TabsContent>
        <TabsContent value="salary" className="mt-4"><SalaryCostTab /></TabsContent>
        <TabsContent value="office" className="mt-4">
          <ExpenseListTab title="Chi phí văn phòng" tableName="office_expenses" categories={OFFICE_CATEGORIES} queryKey="office-expenses" />
        </TabsContent>
        <TabsContent value="marketing" className="mt-4">
          <ExpenseListTab title="Chi phí Marketing" tableName="marketing_expenses" categories={MARKETING_CATEGORIES} queryKey="marketing-expenses" />
        </TabsContent>
        <TabsContent value="other" className="mt-4">
          <ExpenseListTab title="Chi phí khác" tableName="other_expenses" categories={OTHER_CATEGORIES} queryKey="other-expenses" />
        </TabsContent>
        <TabsContent value="opex" className="mt-4"><ExpenseSummaryTab /></TabsContent>
      </Tabs>
    </div>
  );
}
