import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function SettingsExpenseCategoriesTab() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", sort_order: 0, is_active: true });

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["expense-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expense_categories")
        .select("id, name, sort_order, is_active")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Tên danh mục không được trống");
      if (editing) {
        const { error } = await supabase
          .from("expense_categories")
          .update({ name: form.name.trim(), sort_order: form.sort_order, is_active: form.is_active })
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("expense_categories")
          .insert({ name: form.name.trim(), sort_order: form.sort_order, is_active: form.is_active });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Đã cập nhật" : "Đã thêm danh mục");
      queryClient.invalidateQueries({ queryKey: ["expense-categories"] });
      setOpen(false);
      setEditing(null);
      setForm({ name: "", sort_order: 0, is_active: true });
    },
    onError: (e: any) => toast.error(e.message ?? "Lỗi"),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("expense_categories")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["expense-categories"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expense_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Đã xoá");
      queryClient.invalidateQueries({ queryKey: ["expense-categories"] });
    },
    onError: (e: any) => toast.error("Không thể xoá: " + (e.message ?? "")),
  });

  const openEdit = (cat: any) => {
    setEditing(cat);
    setForm({ name: cat.name, sort_order: cat.sort_order ?? 0, is_active: cat.is_active ?? true });
    setOpen(true);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", sort_order: (categories.length + 1) * 10, is_active: true });
    setOpen(true);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Danh mục chi phí</CardTitle>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> Thêm danh mục
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">STT</TableHead>
                <TableHead>Tên danh mục</TableHead>
                <TableHead className="w-[100px]">Hoạt động</TableHead>
                <TableHead className="w-[120px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell>{c.sort_order ?? 0}</TableCell>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>
                    <Switch
                      checked={c.is_active ?? true}
                      onCheckedChange={(v) => toggleActive.mutate({ id: c.id, is_active: v })}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm(`Xoá "${c.name}"?`)) deleteMutation.mutate(c.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Sửa danh mục" : "Thêm danh mục"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Tên danh mục *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Thứ tự sắp xếp</Label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label>Đang hoạt động</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Huỷ</Button>
            <Button onClick={() => upsertMutation.mutate()} disabled={upsertMutation.isPending}>
              {upsertMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editing ? "Cập nhật" : "Thêm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
