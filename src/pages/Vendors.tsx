import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Search, Pencil, Trash2, Building2 } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";
import { VendorFormDialog } from "@/components/vendors/VendorFormDialog";
import { PermissionGuard } from "@/components/PermissionGuard";

const CATEGORIES = [
  { value: "TRANSPORT", label: "Vận chuyển" },
  { value: "HOTEL", label: "Khách sạn" },
  { value: "RESTAURANT", label: "Nhà hàng" },
  { value: "MC", label: "MC" },
  { value: "GUIDE", label: "Hướng dẫn viên" },
  { value: "VISA", label: "Visa" },
  { value: "EVENT", label: "Sự kiện" },
  { value: "OTHER", label: "Khác" },
];

const categoryLabel = (cat: string) => CATEGORIES.find((c) => c.value === cat)?.label ?? cat;

export default function Vendors() {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission("suppliers", "edit");
  const canDelete = hasPermission("suppliers", "delete");

  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ["vendors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vendors").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vendors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast.success("Đã xoá NCC");
    },
    onError: () => toast.error("Không thể xoá NCC"),
  });

  const filtered = vendors.filter((v: any) => {
    const matchSearch = !search || v.name?.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === "ALL" || v.category === filterCat;
    return matchSearch && matchCat;
  });

  return (
    <PermissionGuard permission="suppliers.view">
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Nhà cung cấp
          </h1>
          <p className="text-sm text-muted-foreground">Quản lý danh bạ đối tác / NCC</p>
        </div>
        {canEdit && (
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Thêm NCC
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Tìm theo tên..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={filterCat} onValueChange={setFilterCat}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả loại</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Chưa có NCC nào</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên NCC</TableHead>
                  <TableHead>Loại DV</TableHead>
                  <TableHead>SĐT</TableHead>
                  <TableHead>Ngân hàng</TableHead>
                  <TableHead>STK</TableHead>
                  {(canEdit || canDelete) && <TableHead className="w-[100px]" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((v: any) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.name}</TableCell>
                    <TableCell><Badge variant="outline">{categoryLabel(v.category)}</Badge></TableCell>
                    <TableCell>{v.contact_phone || "—"}</TableCell>
                    <TableCell>{v.bank_name || "—"}</TableCell>
                    <TableCell>{v.bank_account || "—"}</TableCell>
                    {(canEdit || canDelete) && (
                      <TableCell>
                        <div className="flex gap-1">
                          {canEdit && (
                            <Button variant="ghost" size="icon" onClick={() => { setEditing(v); setDialogOpen(true); }}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button variant="ghost" size="icon" onClick={() => { if (confirm("Xoá NCC này?")) deleteMutation.mutate(v.id); }}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <VendorFormDialog open={dialogOpen} onOpenChange={setDialogOpen} vendor={editing} />
    </div>
    </PermissionGuard>
  );
}
