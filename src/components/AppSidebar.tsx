import {
  LayoutDashboard, Users, ClipboardList, FileText, CalendarDays,
  FileSignature, DollarSign, UserCog, BarChart3, Settings,
  CalendarOff, Banknote, Package, Route, Hotel, Building2, BookOpen, Database, AlertTriangle, UserPlus,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import logo from "@/assets/logo.jpg";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { getDashboardType } from "@/hooks/useDashboardData";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, useSidebar,
} from "@/components/ui/sidebar";

interface MenuItem {
  title: string;
  url: string;
  icon: any;
  moduleKey?: string;
  badge?: number;
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { userRole, user } = useAuth();
  const { getVisibleModules, loading: permLoading } = usePermissions();

  const todayStr = format(new Date(), "yyyy-MM-dd");

  const { data: followUpCount = 0 } = useQuery({
    queryKey: ["follow-up-badge", user?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("assigned_to", user!.id)
        .lte("follow_up_date", todayStr)
        .not("status", "in", "(WON,LOST,DORMANT)");
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user?.id,
    refetchInterval: 60000,
  });

  // Cảnh báo khẩn cấp (priority='high' chưa đọc) cho badge "Cảnh báo"
  const { data: alertCount = 0 } = useQuery({
    queryKey: ["alerts-badge", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("is_read", false)
        .eq("priority", "high");
      return count ?? 0;
    },
    enabled: !!user?.id,
    refetchInterval: 60000,
  });

  const visibleModules = getVisibleModules();

  // 💼 KINH DOANH — luồng nguồn → khách → đơn hàng
  const businessItems: MenuItem[] = [
    { title: "Kho Data", url: "/kho-data", icon: Database, moduleKey: "raw_contacts" },
    { title: "Tiềm năng", url: "/tiem-nang", icon: ClipboardList, moduleKey: "leads", badge: followUpCount > 0 ? followUpCount : undefined },
    { title: "Khách hàng", url: "/khach-hang", icon: Users, moduleKey: "customers" },
    { title: "Báo giá", url: "/bao-gia", icon: FileText, moduleKey: "quotations" },
    { title: "Đặt tour", url: "/dat-tour", icon: CalendarDays, moduleKey: "bookings" },
    { title: "Hợp đồng", url: "/hop-dong", icon: FileSignature, moduleKey: "contracts" },
    { title: "Thanh toán", url: "/thanh-toan", icon: DollarSign, moduleKey: "payments" },
  ];

  // 📦 SẢN PHẨM TOUR — kho sản phẩm và đối tác
  const productItems: MenuItem[] = [
    { title: "Gói tour", url: "/goi-tour", icon: Package, moduleKey: "tour_packages" },
    { title: "Lịch trình", url: "/lich-trinh", icon: Route, moduleKey: "itineraries" },
    { title: "Lưu trú", url: "/luu-tru", icon: Hotel, moduleKey: "accommodations" },
    { title: "Nhà cung cấp", url: "/nha-cung-cap", icon: Building2, moduleKey: "suppliers" },
    { title: "LKH Tour 2026", url: "/b2b-tours", icon: Package, moduleKey: "b2b_tours" },
  ];

  const hrItems: MenuItem[] = [
    { title: "Nhân sự", url: "/nhan-su", icon: UserCog, moduleKey: "staff" },
    { title: "Tuyển dụng", url: "/tuyen-dung", icon: UserPlus, moduleKey: "candidates" },
    { title: "Nghỉ phép", url: "/nghi-phep", icon: CalendarOff, moduleKey: "leave" },
    { title: "Bảng lương", url: "/bang-luong", icon: Banknote, moduleKey: "payroll" },
  ];

  const financeItems: MenuItem[] = [
    { title: "Tài chính", url: "/tai-chinh", icon: BarChart3, moduleKey: "finance" },
  ];

  const sopItems: MenuItem[] = [
    { title: "Quy trình", url: "/quy-trinh", icon: BookOpen, moduleKey: "workflow" },
  ];

  const guideItems: MenuItem[] = [
    { title: "Hướng dẫn", url: "/huong-dan", icon: BookOpen },
  ];

  const settingsItems: MenuItem[] = [
    { title: "Cài đặt", url: "/cai-dat", icon: Settings, moduleKey: "settings" },
  ];

  const alertsItems: MenuItem[] = [
    { title: "Cảnh báo", url: "/canh-bao", icon: AlertTriangle, badge: alertCount > 0 ? alertCount : undefined },
  ];

  const filterItems = (items: MenuItem[]) =>
    items.filter((item) => !item.moduleKey || visibleModules.includes(item.moduleKey));

  const renderItems = (items: MenuItem[]) =>
    items.map((item) => {
      const isB2B = item.moduleKey === "b2b_tours";
      return (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton asChild isActive={
            item.url === "/" ? location.pathname === "/" : location.pathname.startsWith(item.url)
          }>
            <NavLink
              to={item.url}
              end={item.url === "/"}
              className={
                isB2B
                  ? "text-sidebar-foreground/70 hover:text-white hover:bg-blue-600"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              }
              activeClassName={
                isB2B
                  ? "bg-blue-600 text-white hover:bg-blue-700 hover:text-white font-medium"
                  : "bg-sidebar-accent text-sidebar-foreground font-medium"
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && (
                <span className="flex-1 flex items-center justify-between">
                  {item.title}
                  {item.badge && item.badge > 0 && (
                    <Badge variant="destructive" className="h-5 min-w-[20px] px-1 text-[10px] ml-auto">
                      {item.badge > 99 ? "99+" : item.badge}
                    </Badge>
                  )}
                </span>
              )}
            </NavLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    });

  const dashboardType = getDashboardType(userRole);
  const dashboardLabel = dashboardType === "hr" ? "Tổng quan NS" : dashboardType === "personal" ? "Dashboard" : "Tổng quan";

  const dashboardItem: MenuItem[] = [
    { title: dashboardLabel, url: "/", icon: LayoutDashboard },
  ];

  const visibleBusiness = filterItems(businessItems);
  const visibleProduct = filterItems(productItems);
  const visibleHr = filterItems(hrItems);
  const visibleFinance = filterItems(financeItems);
  const visibleSop = filterItems(sopItems);
  const visibleSettings = filterItems(settingsItems);
  const visibleGuide = guideItems;

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Saigon Holiday" className="w-10 h-10 rounded-lg object-contain shrink-0" />
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-semibold text-sm text-sidebar-foreground leading-tight">Saigon Holiday</span>
              <span className="text-xs text-sidebar-muted leading-tight">Travel CRM</span>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-wider">Kinh doanh</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {renderItems(dashboardItem)}
              {visibleBusiness.length > 0 && renderItems(visibleBusiness)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {visibleProduct.length > 0 && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-wider">Sản phẩm</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>{renderItems(visibleProduct)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {visibleHr.length > 0 && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-wider">Nhân sự</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>{renderItems(visibleHr)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {(visibleFinance.length > 0 || visibleSop.length > 0 || visibleSettings.length > 0 || visibleGuide.length > 0) && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-wider">Khác</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {renderItems(alertsItems)}
                {renderItems(visibleFinance)}
                {renderItems(visibleSop)}
                {renderItems(visibleSettings)}
                {renderItems(visibleGuide)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
