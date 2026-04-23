import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, ShieldCheck, ShieldOff, KeyRound, Trash2, Pencil, ArrowRightLeft } from "lucide-react";
import { DataHandoverDialog } from "./DataHandoverDialog";
import { PushNotificationToggle } from "@/components/PushNotificationToggle";

const ROLES: { value: string; label: string }[] = [
  { value: "ADMIN", label: "Quản trị viên" },
  { value: "HCNS", label: "Nhân viên HCNS" },
  { value: "HR_MANAGER", label: "Leader HCNS" },
  { value: "KETOAN", label: "Kế toán" },
  { value: "MANAGER", label: "Trưởng phòng" },
  { value: "GDKD", label: "GĐ Kinh doanh" },
  { value: "DIEUHAN", label: "Điều hành" },
  { value: "SALE_DOMESTIC", label: "Sale Nội địa" },
  { value: "SALE_INBOUND", label: "Sale Inbound" },
  { value: "SALE_OUTBOUND", label: "Sale Outbound" },
  { value: "SALE_MICE", label: "Sale MICE" },
  { value: "TOUR", label: "Hướng dẫn viên" },
  { value: "MKT", label: "Marketing" },
  { value: "INTERN_DIEUHAN", label: "TTS Điều hành" },
  { value: "INTERN_SALE_DOMESTIC", label: "TTS KD Nội địa" },
  { value: "INTERN_SALE_OUTBOUND", label: "TTS KD Outbound" },
  { value: "INTERN_SALE_MICE", label: "TTS KD MICE" },
  { value: "INTERN_SALE_INBOUND", label: "TTS KD Inbound" },
  { value: "INTERN_MKT", label: "TTS Marketing" },
  { value: "INTERN_HCNS", label: "TTS HCNS" },
  { value: "INTERN_KETOAN", label: "TTS Kế toán" },
];

const ROLE_LABEL_MAP: Record<string, string> = {};
ROLES.forEach(r => { ROLE_LABEL_MAP[r.value] = r.label; });

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  department_id: string | null;
  departments?: { name: string } | null;
}

interface UnlinkedEmployee {
  id: string;
  full_name: string;
  email: string | null;
  employee_code: string;
}

export function SettingsAccountsTab() {
  const { user, userRole } = useAuth();
  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(userRole || "");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [unlinkedEmployees, setUnlinkedEmployees] = useState<UnlinkedEmployee[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [resettingAll, setResettingAll] = useState(false);
  const [confirmResetId, setConfirmResetId] = useState<string | null>(null);
  const [confirmResetAll, setConfirmResetAll] = useState(false);
  const [cleaningUp, setCleaningUp] = useState(false);
  const [orphanDetected, setOrphanDetected] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "", email: "", department_id: "", role: "SALE_DOMESTIC", employee_id: "",
  });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editProfile, setEditProfile] = useState<Profile | null>(null);
  const [editData, setEditData] = useState({ department_id: "", role: "" });
  const [saving, setSaving] = useState(false);
  const [handoverProfile, setHandoverProfile] = useState<Profile | null>(null);
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteProfile, setConfirmDeleteProfile] = useState<Profile | null>(null);

  useEffect(() => {
    loadProfiles();
    loadDepartments();
    loadUnlinkedEmployees();
  }, []);

  async function loadProfiles() {
    const { data } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, is_active, department_id, departments!profiles_department_id_fkey(name)")
      .order("created_at", { ascending: false });
    if (data) setProfiles(data as unknown as Profile[]);
  }

  async function loadDepartments() {
    const { data } = await supabase.from("departments").select("id, name").order("name");
    if (data) setDepartments(data);
  }

  async function loadUnlinkedEmployees() {
    const { data } = await supabase
      .from("employees")
      .select("id, full_name, email, employee_code")
      .is("profile_id", null)
      .is("deleted_at", null)
      .order("full_name");
    if (data) setUnlinkedEmployees(data);
  }

  function handleSelectEmployee(employeeId: string) {
    if (employeeId === "__none__") {
      setFormData({ ...formData, employee_id: "" });
      return;
    }
    const emp = unlinkedEmployees.find((e) => e.id === employeeId);
    if (emp) {
      setFormData({
        ...formData,
        employee_id: employeeId,
        full_name: emp.full_name,
        email: emp.email || formData.email,
      });
    }
  }

  async function handleCreate() {
    if (!formData.full_name || !formData.email || !formData.role) {
      toast.error("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-employee-accounts", {
        body: {
          action: "create",
          full_name: formData.full_name,
          email: formData.email,
          department_id: formData.department_id || null,
          role: formData.role,
          employee_id: formData.employee_id || null,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(data.message || "Tạo tài khoản thành công");
      setDialogOpen(false);
      setFormData({ full_name: "", email: "", department_id: "", role: "SALE_DOMESTIC", employee_id: "" });
      await Promise.all([loadProfiles(), loadUnlinkedEmployees()]);
    } catch (err: any) {
      const msg = await parseEdgeFnError(err);
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteAccount(profile: Profile) {
    setDeletingId(profile.id);
    try {
      const { data, error } = await supabase.functions.invoke("manage-employee-accounts", {
        body: { action: "delete_account", user_id: profile.id },
      });
      if (error) {
        const msg = await parseEdgeFnError(error);
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);
      toast.success(data.message || "Đã xóa tài khoản thành công");
      await Promise.all([loadProfiles(), loadUnlinkedEmployees()]);
    } catch (err: any) {
      toast.error(err.message || "Lỗi xóa tài khoản");
    } finally {
      setDeletingId(null);
      setConfirmDeleteProfile(null);
    }
  }

  async function handleToggleActive(profile: Profile) {
    setTogglingId(profile.id);
    try {
      const action = profile.is_active ? "deactivate" : "activate";
      const { data, error } = await supabase.functions.invoke("manage-employee-accounts", {
        body: { action, user_id: profile.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(profile.is_active ? "Đã vô hiệu hóa tài khoản" : "Đã kích hoạt tài khoản");
      await loadProfiles();
    } catch (err: any) {
      toast.error(err.message || "Lỗi cập nhật trạng thái");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleResetPassword(userId: string, email?: string) {
    setResettingId(userId);
    try {
      const { data, error } = await supabase.functions.invoke("manage-employee-accounts", {
        body: { action: "reset_password", user_id: userId, email: email ?? null },
      });
      if (error) throw error;
      if (data?.orphan) {
        setOrphanDetected(true);
        toast.error("Profile này không có tài khoản auth tương ứng. Hãy dùng nút 'Dọn dẹp tài khoản lỗi' để xử lý.");
        return;
      }
      if (data?.error) throw new Error(data.error);
      toast.success(data.message || "Đã reset mật khẩu thành công");
    } catch (err: any) {
      if (err.message?.includes("không tồn tại")) {
        setOrphanDetected(true);
      }
      toast.error(err.message || "Lỗi reset mật khẩu");
    } finally {
      setResettingId(null);
      setConfirmResetId(null);
    }
  }

  async function handleResetAllPasswords() {
    setResettingAll(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-employee-accounts", {
        body: { action: "reset_all_passwords" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.skipped && data.skipped.length > 0) {
        setOrphanDetected(true);
        toast.warning(
          `${data.message}\n⚠️ Bỏ qua ${data.skipped.length} profile lỗi (không có auth): ${data.skipped.join(", ")}`,
          { duration: 8000 }
        );
      } else {
        toast.success(data.message || "Đã reset tất cả mật khẩu");
      }
    } catch (err: any) {
      toast.error(err.message || "Lỗi reset mật khẩu");
    } finally {
      setResettingAll(false);
      setConfirmResetAll(false);
    }
  }

  async function handleCleanupOrphans() {
    setCleaningUp(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-employee-accounts", {
        body: { action: "cleanup_orphans" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(data.message || "Dọn dẹp hoàn tất");
      setOrphanDetected(false);
      await loadProfiles();
    } catch (err: any) {
      toast.error(err.message || "Lỗi dọn dẹp");
    } finally {
      setCleaningUp(false);
    }
  }

  function openEditDialog(profile: Profile) {
    setEditProfile(profile);
    setEditData({
      department_id: profile.department_id || "",
      role: profile.role,
    });
    setEditDialogOpen(true);
  }

  async function handleSaveEdit() {
    if (!editProfile) return;
    setSaving(true);
    try {
      const newDeptId = editData.department_id || null;
      const { error } = await supabase
        .from("profiles")
        .update({
          department_id: newDeptId,
          role: editData.role,
        })
        .eq("id", editProfile.id);
      if (error) throw error;

      // Sync employees.department_id when Admin changes department in profile
      if (newDeptId) {
        const { data: linkedEmp } = await supabase
          .from("employees")
          .select("id")
          .eq("profile_id", editProfile.id)
          .is("deleted_at", null)
          .maybeSingle();
        if (linkedEmp) {
          await supabase.from("employees").update({ department_id: newDeptId }).eq("id", linkedEmp.id);
        }
      }

      toast.success("Cập nhật tài khoản thành công");
      setEditDialogOpen(false);
      await loadProfiles();
    } catch (err: any) {
      toast.error(err.message || "Lỗi cập nhật tài khoản");
    } finally {
      setSaving(false);
    }
  }

  const confirmResetProfile = profiles.find((p) => p.id === confirmResetId) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Quản lý tài khoản nhân viên</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Vô hiệu hóa = khóa đăng nhập (có thể kích hoạt lại) · Xóa hoàn toàn = xóa vĩnh viễn (chỉ dành cho tài khoản test/lỗi, chỉ Admin)
          </p>
        </div>
        <div className="flex gap-2">
          {orphanDetected && (
            <Button variant="destructive" onClick={handleCleanupOrphans} disabled={cleaningUp}>
              {cleaningUp && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              <Trash2 className="h-4 w-4 mr-1" /> Dọn dẹp TK lỗi
            </Button>
          )}
          <Button variant="outline" onClick={() => setConfirmResetAll(true)} disabled={resettingAll}>
            {resettingAll && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            <KeyRound className="h-4 w-4 mr-1" /> Reset tất cả MK
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Thêm tài khoản
          </Button>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Họ tên</TableHead>
              <TableHead>Phòng ban</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="w-[120px]">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-sm">{p.email}</TableCell>
                <TableCell>{p.full_name}</TableCell>
                <TableCell>{p.departments?.name || "—"}</TableCell>
                <TableCell><Badge variant="outline">{ROLE_LABEL_MAP[p.role] || p.role}</Badge></TableCell>
                <TableCell>
                  <Badge variant={p.is_active ? "default" : "destructive"}>
                    {p.is_active ? "Hoạt động" : "Vô hiệu"}
                  </Badge>
                </TableCell>
                <TableCell>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(p)}
                    title="Sửa tài khoản"
                  >
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </Button>
                {p.id !== user?.id && (
                  <>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={resettingId === p.id}
                        onClick={() => setConfirmResetId(p.id)}
                        title="Reset mật khẩu"
                      >
                        {resettingId === p.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <KeyRound className="h-4 w-4 text-primary" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={togglingId === p.id}
                        onClick={() => {
                          if (p.is_active) {
                            setHandoverProfile(p);
                            setHandoverOpen(true);
                          } else {
                            handleToggleActive(p);
                          }
                        }}
                        title={p.is_active ? "Bàn giao & Vô hiệu hóa" : "Kích hoạt"}
                      >
                        {togglingId === p.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : p.is_active ? (
                          <ArrowRightLeft className="h-4 w-4 text-destructive" />
                        ) : (
                          <ShieldCheck className="h-4 w-4 text-primary" />
                        )}
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={deletingId === p.id}
                          onClick={() => setConfirmDeleteProfile(p)}
                          title="Xóa hoàn toàn tài khoản (chỉ Admin)"
                        >
                          {deletingId === p.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-destructive" />
                          )}
                        </Button>
                      )}
                  </>
                  )}
                </div>
                </TableCell>
              </TableRow>
            ))}
            {profiles.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Chưa có tài khoản nào</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm tài khoản mới</DialogTitle>
            <DialogDescription>Tạo tài khoản đăng nhập cho nhân viên. Mật khẩu mặc định: <strong>sgh123456</strong>. Nhân viên bắt buộc đổi mật khẩu ở lần đăng nhập đầu tiên.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Liên kết nhân viên</Label>
              <Select value={formData.employee_id || "__none__"} onValueChange={handleSelectEmployee}>
                <SelectTrigger><SelectValue placeholder="Chọn nhân viên (không bắt buộc)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Không liên kết —</SelectItem>
                  {unlinkedEmployees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.employee_code} — {e.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Họ tên *</Label>
              <Input value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} placeholder="Nguyễn Văn A" />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="employee@company.com" />
            </div>
            <div className="space-y-2">
              <Label>Phòng ban</Label>
              <Select value={formData.department_id} onValueChange={(v) => setFormData({ ...formData, department_id: v })}>
                <SelectTrigger><SelectValue placeholder="Chọn phòng ban" /></SelectTrigger>
                <SelectContent>
                  {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Role *</Label>
              <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Tạo tài khoản
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmResetId} onOpenChange={(open) => !open && setConfirmResetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset mật khẩu?</AlertDialogTitle>
            <AlertDialogDescription>
              Mật khẩu tài khoản <strong>{confirmResetProfile?.email}</strong> sẽ được reset. Nhân viên cần dùng "Quên mật khẩu" để đặt lại.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmResetProfile && handleResetPassword(confirmResetProfile.id, confirmResetProfile.email)}
              disabled={!confirmResetProfile || resettingId === confirmResetProfile?.id}
            >
              {confirmResetProfile && resettingId === confirmResetProfile.id && (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              )}
              Xác nhận reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sửa tài khoản</DialogTitle>
            <DialogDescription>Cập nhật phòng ban và role cho {editProfile?.full_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Phòng ban</Label>
              <Select value={editData.department_id} onValueChange={(v) => setEditData({ ...editData, department_id: v })}>
                <SelectTrigger><SelectValue placeholder="Chọn phòng ban" /></SelectTrigger>
                <SelectContent>
                  {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={editData.role} onValueChange={(v) => setEditData({ ...editData, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmResetAll} onOpenChange={setConfirmResetAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset tất cả mật khẩu?</AlertDialogTitle>
            <AlertDialogDescription>
              Tất cả tài khoản (trừ tài khoản của bạn) sẽ được reset mật khẩu. Nhân viên cần dùng "Quên mật khẩu" để đặt lại.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetAllPasswords} disabled={resettingAll}>
              {resettingAll && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Xác nhận reset tất cả
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmDeleteProfile} onOpenChange={(open) => !open && setConfirmDeleteProfile(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Xóa hoàn toàn tài khoản?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Bạn sắp <strong>xóa vĩnh viễn</strong> tài khoản <strong>{confirmDeleteProfile?.email}</strong> ({confirmDeleteProfile?.full_name}).</p>
              <p>Thao tác này sẽ:</p>
              <ul className="list-disc pl-5 text-sm">
                <li>Xóa tài khoản đăng nhập (auth)</li>
                <li>Xóa hồ sơ profile</li>
                <li>Bỏ liên kết với hồ sơ nhân viên (nếu có)</li>
              </ul>
              <p className="font-semibold text-destructive">⚠️ Hành động này KHÔNG THỂ hoàn tác. Chỉ dùng cho tài khoản test hoặc tài khoản lỗi.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmDeleteProfile && handleDeleteAccount(confirmDeleteProfile)}
              disabled={deletingId === confirmDeleteProfile?.id}
            >
              {deletingId === confirmDeleteProfile?.id && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Xóa hoàn toàn
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DataHandoverDialog
        open={handoverOpen}
        onOpenChange={setHandoverOpen}
        profile={handoverProfile}
        onComplete={loadProfiles}
      />

      <div className="pt-6 border-t">
        <h3 className="text-base font-semibold text-foreground mb-1">Thông báo trên thiết bị này</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Bật để nhận thông báo popup ngay trên trình duyệt / hệ điều hành — kể cả khi không mở tab CRM.
          Cần bật riêng trên mỗi thiết bị bạn dùng.
        </p>
        <PushNotificationToggle />
      </div>
    </div>
  );
}

/** Parse edge function error to extract meaningful message */
async function parseEdgeFnError(error: any): Promise<string> {
  // supabase-js wraps edge function errors - try to extract body
  if (error?.context) {
    try {
      const body = await error.context.json?.();
      if (body?.error) return body.error;
    } catch (_) {}
    try {
      const text = await error.context.text?.();
      if (text) {
        try {
          const parsed = JSON.parse(text);
          if (parsed.error) return parsed.error;
        } catch (_) {}
        return text;
      }
    } catch (_) {}
  }
  return error.message || "Lỗi gọi Edge Function";
}
