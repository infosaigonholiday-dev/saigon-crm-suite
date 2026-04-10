import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getResetPasswordUrl } from "@/lib/authRedirect";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Shield, Mail, UserCheck, KeyRound, AlertTriangle, Lightbulb } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { positionOptions, suggestRole, detectPositionRoleMismatch } from "@/lib/positionRoleMapping";

interface Props {
  employeeId: string;
  profileId: string | null;
  employeeEmail?: string | null;
  employeeName?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  departmentCode?: string | null;
  employeePosition?: string | null;
  onProfileLinked?: () => void;
}

const roleOptions = [
  { value: "ADMIN", label: "Quản trị viên", desc: "Toàn quyền hệ thống" },
  { value: "HCNS", label: "Nhân viên HCNS", desc: "Quản lý nhân sự cơ bản" },
  { value: "HR_MANAGER", label: "Leader HCNS", desc: "Toàn quyền nhân sự" },
  { value: "KETOAN", label: "Kế toán", desc: "Quản lý tài chính" },
  { value: "MANAGER", label: "Trưởng phòng", desc: "Quản lý phòng ban" },
  { value: "GDKD", label: "GĐ Kinh doanh", desc: "Quản lý phòng KD" },
  { value: "DIEUHAN", label: "Điều hành", desc: "Điều hành tour" },
  { value: "SALE_DOMESTIC", label: "Sale Nội địa", desc: "Kinh doanh nội địa" },
  { value: "SALE_INBOUND", label: "Sale Inbound", desc: "Kinh doanh inbound" },
  { value: "SALE_OUTBOUND", label: "Sale Outbound", desc: "Kinh doanh outbound" },
  { value: "SALE_MICE", label: "Sale MICE", desc: "Kinh doanh MICE" },
  { value: "TOUR", label: "Hướng dẫn viên", desc: "Xem tour được phân công" },
  { value: "MKT", label: "Marketing", desc: "Quản lý lead, chiến dịch" },
  { value: "INTERN_DIEUHAN", label: "TTS Điều hành", desc: "Xem booking" },
  { value: "INTERN_SALE_DOMESTIC", label: "TTS KD Nội địa", desc: "Xem KH, lead, booking" },
  { value: "INTERN_SALE_OUTBOUND", label: "TTS KD Outbound", desc: "Xem KH, lead, booking" },
  { value: "INTERN_SALE_MICE", label: "TTS KD MICE", desc: "Xem KH, lead, booking" },
  { value: "INTERN_SALE_INBOUND", label: "TTS KD Inbound", desc: "Xem KH, lead, booking" },
  { value: "INTERN_MKT", label: "TTS Marketing", desc: "Xem KH, lead" },
  { value: "INTERN_HCNS", label: "TTS HCNS", desc: "Xem nhân sự" },
  { value: "INTERN_KETOAN", label: "TTS Kế toán", desc: "Xem KH, booking, thanh toán" },
];

const MANAGER_ROLES = ["ADMIN", "HCNS"];

function detectRoleMismatch(role: string, deptName?: string | null): string | null {
  if (!deptName || !role) return null;
  const deptLower = deptName.toLowerCase();
  const isSaleDept = deptLower.includes("kinh doanh") || deptLower.includes("kd ");
  const isHrDept = deptLower.includes("hcns") || deptLower.includes("nhân sự");
  const isFinDept = deptLower.includes("kế toán") || deptLower.includes("tài chính");
  
  const hrRoles = ["HCNS", "HR_MANAGER", "HR_HEAD", "INTERN_HCNS"];
  const finRoles = ["KETOAN", "INTERN_KETOAN"];
  const saleRoles = ["SALE_DOMESTIC", "SALE_INBOUND", "SALE_OUTBOUND", "SALE_MICE", "INTERN_SALE_DOMESTIC", "INTERN_SALE_OUTBOUND", "INTERN_SALE_MICE", "INTERN_SALE_INBOUND"];
  
  const roleLabel = roleOptions.find(r => r.value === role)?.label ?? role;
  
  if (isSaleDept && (hrRoles.includes(role) || finRoles.includes(role))) {
    return `Quyền hệ thống "${roleLabel}" không khớp với phòng ban "${deptName}". Vui lòng kiểm tra lại.`;
  }
  if (isHrDept && (saleRoles.includes(role) || finRoles.includes(role))) {
    return `Quyền hệ thống "${roleLabel}" không khớp với phòng ban "${deptName}". Vui lòng kiểm tra lại.`;
  }
  if (isFinDept && (saleRoles.includes(role) || hrRoles.includes(role))) {
    return `Quyền hệ thống "${roleLabel}" không khớp với phòng ban "${deptName}". Vui lòng kiểm tra lại.`;
  }
  return null;
}

export function EmployeeRoleTab({ employeeId, profileId, employeeEmail, employeeName, departmentId, departmentName, departmentCode, employeePosition, onProfileLinked }: Props) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [newEmail, setNewEmail] = useState(employeeEmail || "");
  const [newRole, setNewRole] = useState("SALE_DOMESTIC");
  const [accountCreated, setAccountCreated] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);

  useEffect(() => {
    if (employeeEmail && !newEmail) setNewEmail(employeeEmail);
  }, [employeeEmail]);

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
    if (!newEmail.trim()) { toast.error("Vui lòng nhập email"); return; }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-employee-accounts", {
        body: { action: "create", email: newEmail.trim(), full_name: employeeName || "Nhân viên", role: newRole, department_id: departmentId || null, employee_id: employeeId },
      });
      if (error) {
        // Try to parse actual error from edge function response
        let msg = error.message || "Lỗi tạo tài khoản";
        try {
          const body = await error.context?.json?.();
          if (body?.error) msg = body.error;
        } catch (_) {
          try {
            const text = await error.context?.text?.();
            if (text) {
              const parsed = JSON.parse(text);
              if (parsed.error) msg = parsed.error;
            }
          } catch (_) {}
        }
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);

      // Sync employees.department_id after account creation
      if (data?.profile_id && departmentId) {
        await supabase.from("employees").update({ profile_id: data.profile_id, department_id: departmentId }).eq("id", employeeId);
      }

      setAccountCreated(true);
      toast.success(data.message || "Tạo tài khoản thành công");
      onProfileLinked?.();
    } catch (err: any) {
      toast.error(err.message || "Lỗi tạo tài khoản");
    } finally {
      setCreating(false);
    }
  };

  const handleSendResetEmail = async (email: string) => {
    setSendingReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: getResetPasswordUrl() });
      if (error) throw error;
      toast.success(`Đã gửi email đặt lại mật khẩu đến ${email}`);
    } catch (err: any) {
      toast.error(err.message || "Lỗi gửi email");
    } finally {
      setSendingReset(false);
    }
  };

  const handleSaveRole = async () => {
    if (!profileId || !selectedRole) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({ role: selectedRole }).eq("id", profileId);
      if (error) throw error;
      toast.success("Cập nhật quyền thành công");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Lỗi cập nhật quyền");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!profileId || !profile) return;
    setTogglingActive(true);
    try {
      const action = profile.is_active ? "deactivate" : "activate";
      const { data, error } = await supabase.functions.invoke("manage-employee-accounts", {
        body: { action, user_id: profileId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(profile.is_active ? "Đã vô hiệu hóa tài khoản" : "Đã kích hoạt tài khoản");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Lỗi cập nhật trạng thái");
    } finally {
      setTogglingActive(false);
    }
  };

  // No profile linked — show create account form
  if (!profileId) {
    return (
      <div className="space-y-4">
        {accountCreated ? (
          <Card className="border-success/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-success" />
                Tài khoản đã được tạo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Tài khoản đã tạo thành công với mật khẩu mặc định. Nhân viên cần đăng nhập lần đầu và đổi mật khẩu mới.
              </p>
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
                Nhân viên chưa có tài khoản đăng nhập. Sau khi tạo, tài khoản sẽ dùng mật khẩu mặc định và bắt buộc đổi ở lần đăng nhập đầu.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Email đăng nhập</Label>
                  <Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="email@company.com" />
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

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!profile) return <Card><CardContent className="py-8 text-center text-muted-foreground">Không tìm thấy thông tin tài khoản</CardContent></Card>;

  const currentRoleLabel = roleOptions.find(r => r.value === profile.role)?.label ?? profile.role;
  const roleMismatch = detectPositionRoleMismatch(employeePosition ?? null, departmentCode ?? null, profile.role, currentRoleLabel)
    || detectRoleMismatch(profile.role, departmentName);
  const suggestedRole = (employeePosition && departmentCode) ? suggestRole(employeePosition, departmentCode) : null;
  const showSuggestion = suggestedRole && suggestedRole !== profile.role && isManager;

  return (
    <div className="space-y-4">
      {roleMismatch && (
        <Alert className="border-warning/50 bg-warning/10">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-warning font-medium">
            {roleMismatch}
          </AlertDescription>
        </Alert>
      )}
      {showSuggestion && (
        <Alert className="border-primary/50 bg-primary/5">
          <Lightbulb className="h-4 w-4 text-primary" />
          <AlertDescription className="text-primary font-medium flex items-center justify-between">
            <span>
              Gợi ý: Vị trí "{positionOptions.find(p => p.value === employeePosition)?.label}" nên gán quyền "{roleOptions.find(r => r.value === suggestedRole)?.label}"
            </span>
            <Button variant="outline" size="sm" className="ml-2 shrink-0" onClick={() => {
              setSelectedRole(suggestedRole!);
            }}>
              Áp dụng
            </Button>
          </AlertDescription>
        </Alert>
      )}
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UserCheck className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Trạng thái tài khoản</p>
                <Badge variant="outline" className={profile.is_active ? "bg-success/15 text-success border-success/30" : "bg-destructive/10 text-destructive border-destructive/20"}>
                  {profile.is_active ? "Đang hoạt động" : "Bị khóa"}
                </Badge>
              </div>
            </div>
            {isManager && (
              <div className="flex items-center gap-2">
                {togglingActive && <Loader2 className="h-4 w-4 animate-spin" />}
                <Switch checked={profile.is_active} onCheckedChange={handleToggleActive} disabled={togglingActive} />
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Quyền hiện tại</p>
              <Badge variant="secondary">{currentRoleLabel}</Badge>
            </div>
          </div>
          {isManager && (
            <div className="pt-2">
              <Button variant="outline" size="sm" onClick={() => handleSendResetEmail(profile.email)} disabled={sendingReset}>
                {sendingReset ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <KeyRound className="h-4 w-4 mr-1" />}
                Gửi email đặt lại mật khẩu
              </Button>
            </div>
          )}
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
