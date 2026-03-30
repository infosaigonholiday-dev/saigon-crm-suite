import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Settings as SettingsIcon } from "lucide-react";
import { SettingsAccountsTab } from "@/components/settings/SettingsAccountsTab";
import { SettingsDepartmentsTab } from "@/components/settings/SettingsDepartmentsTab";
import { SettingsLevelsTab } from "@/components/settings/SettingsLevelsTab";
import { SettingsRolesTab } from "@/components/settings/SettingsRolesTab";
import { SettingsPermissionsTab } from "@/components/settings/SettingsPermissionsTab";

export default function Settings() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdmin();
  }, [user]);

  async function checkAdmin() {
    if (!user) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    setIsAdmin(profile?.role === "ADMIN");
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <SettingsIcon className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Cài đặt</h1>
      </div>

      {!isAdmin ? (
        <p className="text-muted-foreground">
          Bạn không có quyền truy cập phần quản lý.
        </p>
      ) : (
        <Tabs defaultValue="accounts" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="accounts">Tài khoản</TabsTrigger>
            <TabsTrigger value="departments">Phòng ban</TabsTrigger>
            <TabsTrigger value="levels">Cấp bậc</TabsTrigger>
            <TabsTrigger value="roles">Quyền hạn</TabsTrigger>
            <TabsTrigger value="permissions">Phân quyền</TabsTrigger>
          </TabsList>

          <TabsContent value="accounts" className="mt-4">
            <SettingsAccountsTab />
          </TabsContent>
          <TabsContent value="departments" className="mt-4">
            <SettingsDepartmentsTab />
          </TabsContent>
          <TabsContent value="levels" className="mt-4">
            <SettingsLevelsTab />
          </TabsContent>
          <TabsContent value="roles" className="mt-4">
            <SettingsRolesTab />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
