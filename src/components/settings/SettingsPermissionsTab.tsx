import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Shield, Trash2, AlertTriangle } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PermissionEditDialog } from "./PermissionEditDialog";
import { getDefaultPermissions, ALL_PERMISSION_KEYS, type PermissionKey } from "@/hooks/usePermissions";

const DELETE_KEYS = ALL_PERMISSION_KEYS.filter(k => k.endsWith(".delete"));
const ADMIN_ROLES = ["ADMIN"];

type FilterMode = "ALL" | "HAS_DELETE" | "NO_DELETE" | "CUSTOM_ONLY";

export function SettingsPermissionsTab() {
  const { user, userRole } = useAuth();
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("ALL");
  const [selectedEmployee, setSelectedEmployee] = useState<{
    id: string; full_name: string; role: string;
  } | null>(null);

  // Get current user's department_id for MANAGER scoping
  const { data: myProfile } = useQuery({
    queryKey: ["my-profile-dept"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("department_id").eq("id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const isFullAccess = ADMIN_ROLES.includes(userRole || "");

  const { data: employees } = useQuery({
    queryKey: ["employees-permissions-list", myProfile?.department_id, isFullAccess],
    queryFn: async () => {
      let query = supabase
        .from("employees")
        .select("id, full_name, employee_code, position, department_id, profiles(role)")
        .is("deleted_at", null)
        .order("full_name");

      // MANAGER: only show employees in same department
      if (!isFullAccess && myProfile?.department_id) {
        query = query.eq("department_id", myProfile.department_id);
      }

      const { data } = await query;
      return data || [];
    },
    enabled: isFullAccess || !!myProfile?.department_id,
  });

  const { data: allOverrides } = useQuery({
    queryKey: ["employee-permission-all-overrides"],
    queryFn: async () => {
      const { data } = await supabase
        .from("employee_permissions")
        .select("employee_id, permission_key, granted");
      return data || [];
    },
  });

  // Build per-employee override map
  const overrideMap: Record<string, { granted: number; revoked: number; deleteGranted: string[]; deleteRevoked: string[] }> = {};
  for (const r of allOverrides || []) {
    if (!overrideMap[r.employee_id]) overrideMap[r.employee_id] = { granted: 0, revoked: 0, deleteGranted: [], deleteRevoked: [] };
    const entry = overrideMap[r.employee_id];
    if (r.granted) entry.granted++;
    else entry.revoked++;
    if (r.permission_key.endsWith(".delete")) {
      if (r.granted) entry.deleteGranted.push(r.permission_key);
      else entry.deleteRevoked.push(r.permission_key);
    }
  }

  // Compute effective delete permissions per employee
  function getEffectiveDeleteKeys(empId: string, role: string): string[] {
    const defaults = new Set(getDefaultPermissions(role));
    const overrides = (allOverrides || []).filter(o => o.employee_id === empId);
    const effective: string[] = [];
    for (const dk of DELETE_KEYS) {
      let has = defaults.has(dk);
      const ov = overrides.find(o => o.permission_key === dk);
      if (ov) has = ov.granted ?? false;
      if (has) effective.push(dk);
    }
    return effective;
  }

  const filtered = (employees || []).filter((e) => {
    const matchSearch = e.full_name.toLowerCase().includes(search.toLowerCase()) ||
      e.employee_code.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;

    const role = (e as any).profiles?.role || "";
    const effectiveDelete = getEffectiveDeleteKeys(e.id, role);
    const hasCustom = !!overrideMap[e.id];

    switch (filterMode) {
      case "HAS_DELETE": return effectiveDelete.length > 0;
      case "NO_DELETE": return effectiveDelete.length === 0;
      case "CUSTOM_ONLY": return hasCustom;
      default: return true;
    }
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Phân quyền chi tiết</h2>
        <p className="text-sm text-muted-foreground">
          Quản lý quyền truy cập cho từng nhân viên. Quyền mặc định dựa trên role, có thể ghi đè riêng.
        </p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm nhân viên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterMode} onValueChange={(v) => setFilterMode(v as FilterMode)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả</SelectItem>
            <SelectItem value="HAS_DELETE">
              <span className="flex items-center gap-1.5">
                <Trash2 className="h-3.5 w-3.5 text-destructive" /> Có quyền Xóa
              </span>
            </SelectItem>
            <SelectItem value="NO_DELETE">Không có quyền Xóa</SelectItem>
            <SelectItem value="CUSTOM_ONLY">Đã tùy chỉnh</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã NV</TableHead>
              <TableHead>Họ tên</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Quyền Xóa</TableHead>
              <TableHead>Tùy chỉnh</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((emp) => {
              const role = (emp as any).profiles?.role || "—";
              const counts = overrideMap[emp.id];
              const effectiveDelete = getEffectiveDeleteKeys(emp.id, role);

              return (
                <TableRow key={emp.id}>
                  <TableCell className="font-mono text-xs">{emp.employee_code}</TableCell>
                  <TableCell className="font-medium">{emp.full_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{role}</Badge>
                  </TableCell>
                  <TableCell>
                    {effectiveDelete.length > 0 ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
                        {effectiveDelete.map(dk => (
                          <Badge
                            key={dk}
                            variant="outline"
                            className="text-[10px] bg-destructive/10 text-destructive border-destructive/30"
                          >
                            {dk.split(".")[0]}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Không có</span>
                    )}
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
