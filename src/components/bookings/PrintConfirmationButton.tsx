import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Printer } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  booking: {
    id: string;
    sale_id: string | null;
    department_id: string | null;
  };
}

const ALWAYS_PRINT_ROLES = ["ADMIN", "SUPER_ADMIN", "DIEUHAN", "KETOAN"];
const DEPT_PRINT_ROLES = ["MANAGER", "GDKD"];

export function PrintConfirmationButton({ booking }: Props) {
  const { user, userRole } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["my-dept-for-print", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("department_id")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user && DEPT_PRINT_ROLES.includes(userRole || ""),
  });

  const canPrint =
    (userRole && ALWAYS_PRINT_ROLES.includes(userRole)) ||
    (user && booking.sale_id === user.id) ||
    (userRole &&
      DEPT_PRINT_ROLES.includes(userRole) &&
      profile?.department_id &&
      booking.department_id === profile.department_id);

  if (!canPrint) return null;

  const open = (type: "le" | "doan") => {
    window.open(`/dat-tour/${booking.id}/in-xac-nhan?type=${type}`, "_blank", "noopener,noreferrer");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Printer className="h-4 w-4 mr-2" /> In phiếu xác nhận
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => open("le")}>✈ Tour lẻ (Cá nhân/Gia đình)</DropdownMenuItem>
        <DropdownMenuItem onClick={() => open("doan")}>🚌 Tour đoàn (Nhóm/Doanh nghiệp)</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
