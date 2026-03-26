import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Shield, Mail, UserCheck, Copy, AlertTriangle } from "lucide-react";

interface Props {
  employeeId: string;
  profileId: string | null;
  employeeEmail?: string | null;
  employeeName?: string | null;
  departmentId?: string | null;
  onProfileLinked?: () => void;
}

const roleOptions = [
  { value: "ADMIN", label: "Admin", desc: "Toàn quyền hệ thống" },
  { value: "DIRECTOR", label: "Giám đốc", desc: "Quản lý cấp cao" },
  { value: "HCNS", label: "Nhân sự (HCNS)", desc: "Quản lý nhân sự, lương" },
  { value: "KETOAN", label: "Kế toán", desc: "Quản lý tài chính" },
  { value: "MANAGER", label: "Trưởng phòng", desc: "Quản lý phòng ban" },
  { value: "DIEUHAN", label: "Điều hành", desc: "Điều hành tour" },
  { value: "SALE_DOMESTIC", label: "Sale Nội địa", desc: "Kinh doanh nội địa" },
  { value: "SALE_INBOUND", label: "Sale Inbound", desc: "Kinh doanh inbound" },
  { value: "SALE_OUTBOUND", label: "Sale Outbound", desc: "Kinh doanh outbound" },
  { value: "TOUR", label: "Tour", desc: "Hướng dẫn viên" },
  { value: "MKT", label: "Marketing", desc: "Marketing" },
  { value: "INTERN", label: "Thực tập sinh", desc: "Quyền hạn hạn chế" },
];

const MANAGER_ROLES = ["ADMIN", "HCNS", "DIRECTOR", "SUPER_ADMIN"];

export function EmployeeRoleTab({ employeeId, profileId, employeeEmail, employeeName, departmentId, onProfileLinked }: Props) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("");

  // Create account form state
  const [creating, setCreating] = useState(false);
  const [newEmail, setNewEmail] = useState(employeeEmail || "");
  const [newRole, setNewRole] = useState("SALE_DOMESTIC");
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (employeeEmail && !newEmail) setNewEmail(employeeEmail);
  }, [employeeEmail]);

  // Countdown timer for password visibility
  useEffect(() => {
    if (countdown <= 0) {
      if (tempPassword && countdown === 0) setTempPassword(null);
      return;
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, tempPassword]);

  const { data: currentUserProfile } = useQuery({
    queryKey: ["my-profile-role"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const isManager = currentUserProfile ? MANAGER_ROLES.includes(currentUserProfile.role) : false;

  const { data: profile, isLoading, refetch } = useQuery({
    queryKey: ["employee-profile", profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, role, is_active")
        .eq("id", profileId!)
        .single();
      if (error) throw error;
      if (data && !selectedRole) setSelectedRole(data.role);
      return data;
    },
  });

  const handleCreateAccount = async () => {
    if (!newEmail.trim()) {
      toast.error("Vui lòng nhập email");
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-employee-accounts", {
        body: {
          action: "create",
          email: newEmail.trim(),
          full_name: employeeName || "Nhân viên",
          role: newRole,
          department_id: departmentId || null,
          employee_id: employeeId,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setTempPassword(data.temp_password);
      setCountdown(60);
      toast.success(data.message || "Tạo tài khoản thành công");
      onProfileLinked?.();
    } catch (err: any) {
      toast.error(err.message || "Lỗi tạo tài khoản");
    } finally {
      setCreating(false);
    }
  };

  const copyPassword = useCallback(() => {
    if (tempPassword) {
      navigator.clipboard.writeText(tempPassword);
      toast.success("Đã sao chép mật khẩu");
    }
  }, [tempPassword]);

  const handleSaveRole = async () => {
    if (!profileId || !selectedRole) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: selectedRole })
        .eq("id", profileId);
      if (error) throw error;
      toast.success("Cập nhật quyền thành công");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Lỗi cập nhật quyền");
    } finally {
      setSaving(false);
    }
  };

  // No profile linked — show create account form
  if (!profileId) {
    return (
      <div className="space-y-4">
        {tempPassword && countdown > 0 ? (
          <Card className="border-warning/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Mật khẩu tạm thời
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Ghi lại mật khẩu này ngay. Sau <span className="font-bold text-warning">{countdown}s</span> sẽ bị ẩn và không thể xem lại.
              </p>
              <div className="flex gap-2">
                <Input value={tempPassword} readOnly className="font-mono" />
                <Button variant="outline" size="icon" onClick={copyPassword}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                Tạo tài khoản đăng nhập
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Nhân viên chưa có tài khoản đăng nhập. Tạo tài khoản để phân quyền truy cập hệ thống.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Email đăng nhập</Label>
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    placeholder="email@company.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Quyền hệ thống</Label>
                  <Select value={newRole} onValueChange={setNewRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {roleOptions.map(r => (
                        <SelectItem key={r.value} value={r.value}>
                          <span className="font-medium">{r.label}</span>
                          <span className="text-xs text-muted-foreground ml-2">— {r.desc}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleCreateAccount} disabled={creating}>
                {creating && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Tạo tài khoản
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!profile) {
    return <Card><CardContent className="py-8 text-center text-muted-foreground">Không tìm thấy thông tin tài khoản</CardContent></Card>;
  }

  const currentRoleLabel = roleOptions.find(r => r.value === profile.role)?.label ?? profile.role;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Thông tin tài khoản</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Email đăng nhập</p>
              <p className="text-sm font-medium">{profile.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <UserCheck className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Trạng thái</p>
              <Badge variant="outline" className={profile.is_active ? "bg-success/15 text-success border-success/30" : "bg-destructive/10 text-destructive border-destructive/20"}>
                {profile.is_active ? "Đang hoạt động" : "Bị khóa"}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Quyền hiện tại</p>
              <Badge variant="secondary">{currentRoleLabel}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {isManager && (
        <Card>
          <CardHeader><CardTitle className="text-base">Thay đổi quyền</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger><SelectValue placeholder="Chọn quyền" /></SelectTrigger>
              <SelectContent>
                {roleOptions.map(r => (
                  <SelectItem key={r.value} value={r.value}>
                    <span className="font-medium">{r.label}</span>
                    <span className="text-xs text-muted-foreground ml-2">— {r.desc}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleSaveRole} disabled={saving || selectedRole === profile.role}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Lưu thay đổi
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
