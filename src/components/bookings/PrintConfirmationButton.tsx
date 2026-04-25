import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Printer } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMyDepartmentId } from "@/hooks/useScopedQuery";
import {
  canPrintBookingConfirmation,
  DEPT_PRINT_ROLES,
} from "@/lib/bookingPrintAccess";

interface Props {
  booking: {
    id: string;
    sale_id: string | null;
    department_id: string | null;
  };
}

export function PrintConfirmationButton({ booking }: Props) {
  const { user, userRole } = useAuth();
  const { data: myDeptId } = useMyDepartmentId(
    !!user && (DEPT_PRINT_ROLES as readonly string[]).includes(userRole || "")
  );

  const canPrint = canPrintBookingConfirmation({
    userRole,
    userId: user?.id,
    myDeptId,
    booking,
  });

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
