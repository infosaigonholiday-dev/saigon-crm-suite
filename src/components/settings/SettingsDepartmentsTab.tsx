import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";

interface Department {
  id: string;
  name: string;
  code: string;
  headcount: number | null;
  budget_monthly: number | null;
}

export function SettingsDepartmentsTab() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", code: "" });

  const { data: departments = [], isLoading } = useQuery({
    queryKey: ["settings-departments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("departments").select("id, name, code, headcount, budget_monthly").order("name");
      if (error) throw error;
      return data as Department[];
    },
  });

  function openEdit(dept: Department) {
    setEditId(dept.id);
    setForm({ name: dept.name, code: dept.code });
    setDialogOpen(true);
  }

  function openNew() {
    setEditId(null);
    setForm({ name: "", code: "" });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.code.trim()) {
      toast.error("Vui lòng nhập tên và mã phòng ban");
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        const { error } = await supabase.from("departments").update({ name: form.name.trim(), code: form.code.trim() }).eq("id", editId);
        if (error) throw error;
        toast.success("Cập nhật phòng ban thành công");
      } else {
        const { error } = await supabase.from("departments").insert({ name: form.name.trim(), code: form.code.trim() });
        if (error) throw error;
        toast.success("Thêm phòng ban thành công");
      }
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["settings-departments"] });
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    } catch (err: any) {
      toast.error(err.message || "Lỗi lưu phòng ban");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from("departments").delete().eq("id", deleteId);
      if (error) throw error;
      toast.success("Xóa phòng ban thành công");
      queryClient.invalidateQueries({ queryKey: ["settings-departments"] });
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    } catch (err: any) {
      toast.error(err.message || "Không thể xóa phòng ban (có thể đang được sử dụng)");
    } finally {
      setDeleteId(null);
    }
  }

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Quản lý phòng ban</h2>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Thêm phòng ban</Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã</TableHead>
              <TableHead>Tên phòng ban</TableHead>
              <TableHead>Số nhân sự</TableHead>
              <TableHead className="w-[100px]">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {departments.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-mono text-sm">{d.code}</TableCell>
                <TableCell className="font-medium">{d.name}</TableCell>
                <TableCell>{d.headcount ?? 0}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(d)} title="Sửa">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(d.id)} title="Xóa">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {departments.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">Chưa có phòng ban nào</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Sửa phòng ban" : "Thêm phòng ban"}</DialogTitle>
            <DialogDescription>Nhập thông tin phòng ban</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tên phòng ban *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="VD: Kinh doanh Nội địa" />
            </div>
            <div className="space-y-2">
              <Label>Mã phòng ban *</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="VD: SALE_DOM" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {editId ? "Cập nhật" : "Thêm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa phòng ban?</AlertDialogTitle>
            <AlertDialogDescription>Hành động này không thể hoàn tác. Phòng ban đang có nhân viên sẽ không thể xóa.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Xóa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
