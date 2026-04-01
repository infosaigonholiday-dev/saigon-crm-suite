import { useEffect, useRef } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usePermissions, PermissionKey } from "@/hooks/usePermissions";

interface Props {
  permission: PermissionKey;
  children: React.ReactNode;
}

export function PermissionGuard({ permission, children }: Props) {
  const { hasPermission, loading } = usePermissions();
  const toastFired = useRef(false);

  const allowed = hasPermission(permission);

  useEffect(() => {
    if (!loading && !allowed && !toastFired.current) {
      toastFired.current = true;
      toast.error("Bạn không có quyền truy cập trang này");
    }
  }, [loading, allowed]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!allowed) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
