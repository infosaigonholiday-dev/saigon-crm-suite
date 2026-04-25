import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Settings as SettingsIcon } from "lucide-react";
import { SettingsAccountsTab } from "@/components/settings/SettingsAccountsTab";
import { SettingsDepartmentsTab } from "@/components/settings/SettingsDepartmentsTab";
import { SettingsLevelsTab } from "@/components/settings/SettingsLevelsTab";
import { SettingsRolesTab } from "@/components/settings/SettingsRolesTab";
import { SettingsPermissionsTab } from "@/components/settings/SettingsPermissionsTab";
import { SettingsAuditLogTab } from "@/components/settings/SettingsAuditLogTab";
import { PushNotificationToggle } from "@/components/PushNotificationToggle";

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];
const HR_ROLES = ["HR_MANAGER", "HCNS"];
const ACCOUNT_MANAGER_ROLES = ["ADMIN", "SUPER_ADMIN", "HR_MANAGER", "HCNS"];

export default function Settings() {
  const { user, userRole } = useAuth();
  const { hasPermission, loading: permLoading } = usePermissions();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    // Just wait for userRole to be available
    setLoading(false);
  }, [user, userRole]);

  if (loading || permLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const canView = hasPermission("settings", "view");
  const canEdit = hasPermission("settings", "edit");
  if (!canView) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Cài đặt</h1>
        </div>
        <p className="text-muted-foreground">Bạn không có quyền truy cập phần quản lý.</p>
      </div>
    );
  }

  const isAdmin = ADMIN_ROLES.includes(userRole || "");
  const isHR = HR_ROLES.includes(userRole || "");

  // Determine visible tabs
  const showAccounts = ACCOUNT_MANAGER_ROLES.includes(userRole || "");
  const showDepartments = isAdmin || isHR;
  const showLevels = isAdmin || isHR;
  const showRoles = isAdmin || isHR; // Chỉ ADMIN/SUPER_ADMIN/HR_MANAGER/HCNS thấy bảng quyền hạn
  const showPermissions = isAdmin || ["MANAGER", "GDKD"].includes(userRole || "");
  const showAuditLog = isAdmin;
  const showNotifications = true; // mọi user có settings.view đều thấy

  const tabs = [
    showAccounts && { value: "accounts", label: "Tài khoản" },
    showNotifications && { value: "notifications", label: "Thông báo" },
    showDepartments && { value: "departments", label: "Phòng ban" },
    showLevels && { value: "levels", label: "Cấp bậc" },
    showRoles && { value: "roles", label: "Quyền hạn" },
    showPermissions && { value: "permissions", label: "Phân quyền" },
    showAuditLog && { value: "audit", label: "Nhật ký thay đổi" },
  ].filter(Boolean) as { value: string; label: string }[];

  const defaultTab = tabs[0]?.value || "roles";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <SettingsIcon className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Cài đặt</h1>
      </div>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className={`grid w-full`} style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
          ))}
        </TabsList>

        {showAccounts && (
          <TabsContent value="accounts" className="mt-4"><SettingsAccountsTab /></TabsContent>
        )}
        {showNotifications && (
          <TabsContent value="notifications" className="mt-4">
            <div className="space-y-3">
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-foreground">Thông báo trên thiết bị này</h3>
                <p className="text-sm text-muted-foreground">
                  Bật để nhận thông báo (giống Zalo) khi được tag trong ghi chú, có lead cần follow-up,
                  sinh nhật khách hàng. <strong>Phải bật riêng trên TỪNG thiết bị</strong> (laptop, điện thoại) bạn đang dùng.
                </p>
              </div>
              <PushNotificationToggle />
            </div>
          </TabsContent>
        )}
        {showDepartments && (
          <TabsContent value="departments" className="mt-4"><SettingsDepartmentsTab /></TabsContent>
        )}
        {showLevels && (
          <TabsContent value="levels" className="mt-4"><SettingsLevelsTab /></TabsContent>
        )}
        {showRoles && (
          <TabsContent value="roles" className="mt-4"><SettingsRolesTab /></TabsContent>
        )}
        {showPermissions && (
          <TabsContent value="permissions" className="mt-4"><SettingsPermissionsTab /></TabsContent>
        )}
        {showAuditLog && (
          <TabsContent value="audit" className="mt-4"><SettingsAuditLogTab /></TabsContent>
        )}
      </Tabs>
    </div>
  );
}
