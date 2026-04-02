import { useEffect, useRef } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usePermissions, PermissionKey } from "@/hooks/usePermissions";

interface Props {
  module?: string;
  action?: string;
  anyOf?: [string, string][];
  children: React.ReactNode;
}

export function PermissionGuard({ module, action, anyOf, children }: Props) {
  const { hasPermission, hasAnyPermission, loading } = usePermissions();
  const toastFired = useRef(false);

  const allowed = anyOf ? hasAnyPermission(anyOf) : (module && action) ? hasPermission(module, action) : false;

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
