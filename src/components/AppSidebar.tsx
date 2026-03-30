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

const CRM_ROLES = [
  "ADMIN", "SUPER_ADMIN", "DIRECTOR", "DIEUHAN", "MANAGER",
  "SALE_DOMESTIC", "SALE_INBOUND", "SALE_OUTBOUND", "SALE_MICE", "MKT",
];

const HR_ROLES = [
  "ADMIN", "SUPER_ADMIN", "DIRECTOR", "HCNS", "HR_MANAGER",
];

const FINANCE_ROLES = [
  "ADMIN", "SUPER_ADMIN", "DIRECTOR", "KETOAN",
];

const SETTINGS_ROLES = [
  "ADMIN", "SUPER_ADMIN",
];

const crmItems = [
  { title: "Khách hàng", url: "/khach-hang", icon: Users },
  { title: "Tiềm năng", url: "/tiem-nang", icon: ClipboardList },
  { title: "Báo giá", url: "/bao-gia", icon: FileText },
  { title: "Đặt tour", url: "/dat-tour", icon: CalendarDays },
  { title: "Hợp đồng", url: "/hop-dong", icon: FileSignature },
  { title: "Thanh toán", url: "/thanh-toan", icon: DollarSign },
];

const hrItems = [
  { title: "Nhân sự", url: "/nhan-su", icon: UserCog },
  { title: "Nghỉ phép", url: "/nghi-phep", icon: CalendarOff },
  { title: "Bảng lương", url: "/bang-luong", icon: Banknote },
];

const financeItems = [
  { title: "Tài chính", url: "/tai-chinh", icon: BarChart3 },
];

const settingsItems = [
  { title: "Cài đặt", url: "/cai-dat", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { userRole } = useAuth();

  const hasAccess = (allowedRoles: string[]) =>
    !!userRole && allowedRoles.includes(userRole);

  const renderItems = (items: typeof crmItems) =>
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

  // Dashboard is always visible
  const dashboardItem = [
    { title: "Tổng quan", url: "/", icon: LayoutDashboard },
  ];

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
              {hasAccess(CRM_ROLES) && renderItems(crmItems)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {hasAccess(HR_ROLES) && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-wider">Nhân sự</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>{renderItems(hrItems)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {(hasAccess(FINANCE_ROLES) || hasAccess(SETTINGS_ROLES)) && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-wider">Khác</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {hasAccess(FINANCE_ROLES) && renderItems(financeItems)}
                {hasAccess(SETTINGS_ROLES) && renderItems(settingsItems)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
