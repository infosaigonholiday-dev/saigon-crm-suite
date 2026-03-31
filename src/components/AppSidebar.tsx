import {
  LayoutDashboard,
  Users,
  ClipboardList,
  FileText,
  CalendarDays,
  FileSignature,
  DollarSign,
  UserCog,
  BarChart3,
  Settings,
  CalendarOff,
  Banknote,
  Package,
  Route,
  Hotel,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions, type PermissionKey } from "@/hooks/usePermissions";
import { getDashboardType } from "@/hooks/useDashboardData";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";

interface MenuItem {
  title: string;
  url: string;
  icon: any;
  permission?: PermissionKey;
}

const crmItems: MenuItem[] = [
  { title: "Khách hàng", url: "/khach-hang", icon: Users, permission: "customers.view" },
  { title: "Tiềm năng", url: "/tiem-nang", icon: ClipboardList, permission: "leads.view" },
  { title: "Báo giá", url: "/bao-gia", icon: FileText, permission: "quotations.view" },
  { title: "Gói tour", url: "/goi-tour", icon: Package, permission: "quotations.view" },
  { title: "Lịch trình", url: "/lich-trinh", icon: Route, permission: "quotations.view" },
  { title: "Lưu trú", url: "/luu-tru", icon: Hotel, permission: "quotations.view" },
  { title: "Nhà cung cấp", url: "/nha-cung-cap", icon: Building2, permission: "bookings.view" },
  { title: "Đặt tour", url: "/dat-tour", icon: CalendarDays, permission: "bookings.view" },
  { title: "Hợp đồng", url: "/hop-dong", icon: FileSignature, permission: "bookings.view" },
  { title: "Thanh toán", url: "/thanh-toan", icon: DollarSign, permission: "payments.view" },
];

const hrItems: MenuItem[] = [
  { title: "Nhân sự", url: "/nhan-su", icon: UserCog, permission: "employees.view" },
  { title: "Nghỉ phép", url: "/nghi-phep", icon: CalendarOff, permission: "leave.view" },
  { title: "Bảng lương", url: "/bang-luong", icon: Banknote, permission: "payroll.view" },
];

const financeItems: MenuItem[] = [
  { title: "Tài chính", url: "/tai-chinh", icon: BarChart3, permission: "finance.view" },
];

const settingsItems: MenuItem[] = [
  { title: "Cài đặt", url: "/cai-dat", icon: Settings, permission: "settings.view" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { userRole } = useAuth();
  const { hasPermission, loading: permLoading } = usePermissions();

  const filterItems = (items: MenuItem[]) =>
    items.filter((item) => !item.permission || hasPermission(item.permission));

  const renderItems = (items: MenuItem[]) =>
    items.map((item) => (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton asChild isActive={
          item.url === "/" ? location.pathname === "/" : location.pathname.startsWith(item.url)
        }>
          <NavLink
            to={item.url}
            end={item.url === "/"}
            className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            activeClassName="bg-sidebar-accent text-sidebar-foreground font-medium"
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ));

  const dashboardType = getDashboardType(userRole);
  const dashboardLabel = dashboardType === "hr" ? "Tổng quan NS" : dashboardType === "personal" ? "Dashboard" : "Tổng quan";

  const dashboardItem: MenuItem[] = [
    { title: dashboardLabel, url: "/", icon: LayoutDashboard },
  ];

  const visibleCrm = filterItems(crmItems);
  const visibleHr = filterItems(hrItems);
  const visibleFinance = filterItems(financeItems);
  const visibleSettings = filterItems(settingsItems);

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-bold text-sm shrink-0">
            SH
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-semibold text-sm text-sidebar-foreground leading-tight">
                Saigon Holiday
              </span>
              <span className="text-xs text-sidebar-muted leading-tight">
                Travel CRM
              </span>
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
              {visibleCrm.length > 0 && renderItems(visibleCrm)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {visibleHr.length > 0 && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-wider">Nhân sự</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>{renderItems(visibleHr)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {(visibleFinance.length > 0 || visibleSettings.length > 0) && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-wider">Khác</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {renderItems(visibleFinance)}
                {renderItems(visibleSettings)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
