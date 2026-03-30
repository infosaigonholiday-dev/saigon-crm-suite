import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import TourPackageFormDialog from "@/components/tour-packages/TourPackageFormDialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, Plus, Loader2, MapPin } from "lucide-react";

const statusLabels: Record<string, string> = {
  ACTIVE: "Hoạt động",
  INACTIVE: "Tạm ngưng",
  ARCHIVED: "Lưu trữ",
};

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  INACTIVE: "bg-muted text-muted-foreground",
  ARCHIVED: "bg-muted text-muted-foreground",
};

export default function TourPackages() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: packages, isLoading } = useQuery({
    queryKey: ["tour-packages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tour_packages" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

  const filtered = packages?.filter((p: any) => {
    if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return p.code?.toLowerCase().includes(s) || p.name?.toLowerCase().includes(s);
    }
    return true;
  });

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Gói tour</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Thêm gói tour
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Tìm mã, tên tour..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả</SelectItem>
                <SelectItem value="ACTIVE">Hoạt động</SelectItem>
                <SelectItem value="INACTIVE">Tạm ngưng</SelectItem>
                <SelectItem value="ARCHIVED">Lưu trữ</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã tour</TableHead>
                  <TableHead>Tên gói</TableHead>
                  <TableHead>Điểm đến</TableHead>
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Khách</TableHead>
                  <TableHead className="text-right">Giá cơ bản</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                      Chưa có gói tour nào
                    </TableCell>
                  </TableRow>
                )}
                {filtered?.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.code}</TableCell>
                    <TableCell>{p.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(p.destination ?? []).map((d: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs gap-1">
                            <MapPin className="h-3 w-3" />{d}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{p.duration_days}N{p.duration_nights}Đ</TableCell>
                    <TableCell>{p.min_pax}-{p.max_pax}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(p.base_price)} {p.currency}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[p.status] ?? ""} variant="secondary">
                        {statusLabels[p.status] ?? p.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <TourPackageFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
