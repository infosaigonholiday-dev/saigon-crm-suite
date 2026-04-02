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
  Building2,
  BookOpen,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import logo from "@/assets/logo.jpg";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
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
  moduleKey?: string;
}

const crmItems: MenuItem[] = [
  { title: "Khách hàng", url: "/khach-hang", icon: Users, moduleKey: "customers" },
  { title: "Tiềm năng", url: "/tiem-nang", icon: ClipboardList, moduleKey: "leads" },
  { title: "Báo giá", url: "/bao-gia", icon: FileText, moduleKey: "quotations" },
  { title: "Gói tour", url: "/goi-tour", icon: Package, moduleKey: "tour_packages" },
  { title: "Lịch trình", url: "/lich-trinh", icon: Route, moduleKey: "itineraries" },
  { title: "Lưu trú", url: "/luu-tru", icon: Hotel, moduleKey: "accommodations" },
  { title: "Nhà cung cấp", url: "/nha-cung-cap", icon: Building2, moduleKey: "suppliers" },
  { title: "Đặt tour", url: "/dat-tour", icon: CalendarDays, moduleKey: "bookings" },
  { title: "Hợp đồng", url: "/hop-dong", icon: FileSignature, moduleKey: "contracts" },
  { title: "Thanh toán", url: "/thanh-toan", icon: DollarSign, moduleKey: "payments" },
];

const hrItems: MenuItem[] = [
  { title: "Nhân sự", url: "/nhan-su", icon: UserCog, moduleKey: "staff" },
  { title: "Nghỉ phép", url: "/nghi-phep", icon: CalendarOff, moduleKey: "leave" },
  { title: "Bảng lương", url: "/bang-luong", icon: Banknote, moduleKey: "payroll" },
];

const financeItems: MenuItem[] = [
  { title: "Tài chính", url: "/tai-chinh", icon: BarChart3, moduleKey: "finance" },
];

const sopItems: MenuItem[] = [
  { title: "Quy trình", url: "/quy-trinh", icon: BookOpen, moduleKey: "workflow" },
];

const settingsItems: MenuItem[] = [
  { title: "Cài đặt", url: "/cai-dat", icon: Settings, moduleKey: "settings" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { userRole } = useAuth();
  const { getVisibleModules, loading: permLoading } = usePermissions();

  const visibleModules = getVisibleModules();

  const filterItems = (items: MenuItem[]) =>
    items.filter((item) => !item.moduleKey || visibleModules.includes(item.moduleKey));

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
  const visibleSop = filterItems(sopItems);
  const visibleSettings = filterItems(settingsItems);

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Saigon Holiday" className="w-8 h-8 rounded-lg object-contain shrink-0" />
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

        {(visibleFinance.length > 0 || visibleSop.length > 0 || visibleSettings.length > 0) && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-wider">Khác</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {renderItems(visibleFinance)}
                {renderItems(visibleSop)}
                {renderItems(visibleSettings)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
