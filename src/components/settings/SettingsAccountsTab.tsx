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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, ShieldCheck, ShieldOff } from "lucide-react";

const ROLES = [
  "ADMIN", "DIRECTOR", "DIEUHAN", "HCNS",
  "SALE_DOMESTIC", "SALE_INBOUND", "SALE_OUTBOUND", "KETOAN",
];

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  department_id: string | null;
  departments?: { name: string } | null;
}

export function SettingsAccountsTab() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    full_name: "", email: "", department_id: "", role: "SALE_DOMESTIC",
  });

  useEffect(() => {
    loadProfiles();
    loadDepartments();
  }, []);

  async function loadProfiles() {
    const { data } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, is_active, department_id, departments(name)")
      .order("created_at", { ascending: false });
    if (data) setProfiles(data as unknown as Profile[]);
  }

  async function loadDepartments() {
    const { data } = await supabase.from("departments").select("id, name").order("name");
    if (data) setDepartments(data);
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
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(data.message || "Tạo tài khoản thành công");
      setDialogOpen(false);
      setFormData({ full_name: "", email: "", department_id: "", role: "SALE_DOMESTIC" });
      await loadProfiles();
    } catch (err: any) {
      toast.error(err.message || "Lỗi tạo tài khoản");
    } finally {
      setCreating(false);
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Quản lý tài khoản nhân viên</h2>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Thêm tài khoản
        </Button>
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
              <TableHead className="w-[100px]">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-sm">{p.email}</TableCell>
                <TableCell>{p.full_name}</TableCell>
                <TableCell>{p.departments?.name || "—"}</TableCell>
                <TableCell><Badge variant="outline">{p.role}</Badge></TableCell>
                <TableCell>
                  <Badge variant={p.is_active ? "default" : "destructive"}>
                    {p.is_active ? "Hoạt động" : "Vô hiệu"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {p.id !== user?.id && (
                    <Button variant="ghost" size="icon" disabled={togglingId === p.id} onClick={() => handleToggleActive(p)}
                      title={p.is_active ? "Vô hiệu hóa" : "Kích hoạt"}>
                      {togglingId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> :
                        p.is_active ? <ShieldOff className="h-4 w-4 text-destructive" /> : <ShieldCheck className="h-4 w-4 text-primary" />}
                    </Button>
                  )}
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
            <DialogDescription>Tạo tài khoản đăng nhập cho nhân viên. Mật khẩu mặc định: sgh123456</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
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
                  {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
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
    </div>
  );
}
