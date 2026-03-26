import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Loader2, Plus, X } from "lucide-react";

export function SettingsLevelsTab() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newLevel, setNewLevel] = useState("");
  const [deleteLevel, setDeleteLevel] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: levels = [], isLoading } = useQuery({
    queryKey: ["employee-levels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "employee_levels")
        .single();
      if (error) throw error;
      try {
        return JSON.parse(data.value || "[]") as string[];
      } catch {
        return [];
      }
    },
  });

  async function saveLevels(newLevels: string[]) {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("app_settings")
        .update({ value: JSON.stringify(newLevels), updated_at: new Date().toISOString() })
        .eq("key", "employee_levels");
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["employee-levels"] });
      toast.success("Cập nhật danh sách cấp bậc thành công");
    } catch (err: any) {
      toast.error(err.message || "Lỗi cập nhật");
    } finally {
      setSaving(false);
    }
  }

  async function handleAdd() {
    const trimmed = newLevel.trim();
    if (!trimmed) return;
    if (levels.includes(trimmed)) {
      toast.error("Cấp bậc đã tồn tại");
      return;
    }
    await saveLevels([...levels, trimmed]);
    setNewLevel("");
    setDialogOpen(false);
  }

  async function handleDelete() {
    if (!deleteLevel) return;
    await saveLevels(levels.filter((l) => l !== deleteLevel));
    setDeleteLevel(null);
  }

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Quản lý cấp bậc / chức danh</h2>
        <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1" /> Thêm cấp bậc</Button>
      </div>

      <div className="border rounded-lg p-4">
        {levels.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">Chưa có cấp bậc nào</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {levels.map((level) => (
              <Badge key={level} variant="secondary" className="text-sm py-1.5 px-3 gap-1.5">
                {level}
                <button onClick={() => setDeleteLevel(level)} className="ml-1 hover:text-destructive transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm cấp bậc mới</DialogTitle>
            <DialogDescription>Nhập tên cấp bậc / chức danh</DialogDescription>
          </DialogHeader>
          <Input value={newLevel} onChange={(e) => setNewLevel(e.target.value)} placeholder="VD: Senior, Team Lead..."
            onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleAdd} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Thêm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteLevel} onOpenChange={(open) => !open && setDeleteLevel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa cấp bậc "{deleteLevel}"?</AlertDialogTitle>
            <AlertDialogDescription>Nhân viên đang có cấp bậc này sẽ không bị ảnh hưởng (dữ liệu vẫn giữ nguyên).</AlertDialogDescription>
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
