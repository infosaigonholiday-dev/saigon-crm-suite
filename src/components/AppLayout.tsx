import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";

export function AppLayout() {
  const { user, signOut } = useAuth();
  const initials = user?.email?.substring(0, 2).toUpperCase() ?? "?";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b bg-card px-4 gap-4 shrink-0">
            <SidebarTrigger />
            <div className="flex items-center gap-2 ml-auto">
              <NotificationBell />
              <span className="text-sm text-muted-foreground hidden sm:inline">{user?.email}</span>
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-medium">
                {initials}
              </div>
              <Button variant="ghost" size="icon" onClick={signOut} title="Đăng xuất">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
