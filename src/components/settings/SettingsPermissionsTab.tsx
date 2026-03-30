import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Shield } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PermissionEditDialog } from "./PermissionEditDialog";

export function SettingsPermissionsTab() {
  const [search, setSearch] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<{
    id: string; full_name: string; role: string;
  } | null>(null);

  const { data: employees } = useQuery({
    queryKey: ["employees-permissions-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("employees")
        .select("id, full_name, employee_code, position, profiles(role)")
        .is("deleted_at", null)
        .order("full_name");
      return data || [];
    },
  });

  const { data: permCounts } = useQuery({
    queryKey: ["employee-permission-counts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("employee_permissions")
        .select("employee_id, permission_key, granted");
      const map: Record<string, { granted: number; revoked: number }> = {};
      for (const r of data || []) {
        if (!map[r.employee_id]) map[r.employee_id] = { granted: 0, revoked: 0 };
        if (r.granted) map[r.employee_id].granted++;
        else map[r.employee_id].revoked++;
      }
      return map;
    },
  });

  const filtered = (employees || []).filter((e) =>
    e.full_name.toLowerCase().includes(search.toLowerCase()) ||
    e.employee_code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Phân quyền chi tiết</h2>
        <p className="text-sm text-muted-foreground">
          Quản lý quyền truy cập cho từng nhân viên. Quyền mặc định dựa trên role, có thể ghi đè riêng.
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Tìm nhân viên..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã NV</TableHead>
              <TableHead>Họ tên</TableHead>
              <TableHead>Chức vụ</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Tùy chỉnh</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((emp) => {
              const role = (emp as any).profiles?.role || "—";
              const counts = permCounts?.[emp.id];
              return (
                <TableRow key={emp.id}>
                  <TableCell className="font-mono text-xs">{emp.employee_code}</TableCell>
                  <TableCell className="font-medium">{emp.full_name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{emp.position || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{role}</Badge>
                  </TableCell>
                  <TableCell>
                    {counts ? (
                      <div className="flex gap-1">
                        {counts.granted > 0 && (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                            +{counts.granted}
                          </Badge>
                        )}
                        {counts.revoked > 0 && (
                          <Badge className="bg-destructive/10 text-destructive border-destructive/20">
                            -{counts.revoked}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Mặc định</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedEmployee({ id: emp.id, full_name: emp.full_name, role })}
                    >
                      <Shield className="h-3.5 w-3.5 mr-1" />
                      Sửa
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Không tìm thấy nhân viên
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {selectedEmployee && (
        <PermissionEditDialog
          employee={selectedEmployee}
          open={!!selectedEmployee}
          onOpenChange={(open) => { if (!open) setSelectedEmployee(null); }}
        />
      )}
    </div>
  );
}
