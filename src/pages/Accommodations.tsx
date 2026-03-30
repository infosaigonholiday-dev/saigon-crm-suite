import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AccommodationFormDialog from "@/components/accommodations/AccommodationFormDialog";
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
import { Search, Plus, Loader2, Star } from "lucide-react";

const typeLabels: Record<string, string> = {
  HOTEL: "Khách sạn",
  RESORT: "Resort",
  HOSTEL: "Hostel",
  HOMESTAY: "Homestay",
  OTHER: "Khác",
};

export default function Accommodations() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: accommodations, isLoading } = useQuery({
    queryKey: ["accommodations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accommodations" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const filtered = accommodations?.filter((a: any) => {
    if (typeFilter !== "ALL" && a.type !== typeFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return a.name?.toLowerCase().includes(s) || a.city?.toLowerCase().includes(s) || a.location?.toLowerCase().includes(s);
    }
    return true;
  });

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`h-3.5 w-3.5 ${rating >= s ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Điểm lưu trú</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Thêm lưu trú
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Tìm tên, thành phố..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Loại" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả</SelectItem>
                <SelectItem value="HOTEL">Khách sạn</SelectItem>
                <SelectItem value="RESORT">Resort</SelectItem>
                <SelectItem value="HOSTEL">Hostel</SelectItem>
                <SelectItem value="HOMESTAY">Homestay</SelectItem>
                <SelectItem value="OTHER">Khác</SelectItem>
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
                  <TableHead>Tên</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Địa điểm</TableHead>
                  <TableHead>Đánh giá</TableHead>
                  <TableHead>Liên hệ</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                      Chưa có điểm lưu trú nào
                    </TableCell>
                  </TableRow>
                )}
                {filtered?.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{typeLabels[a.type] ?? a.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{a.city ?? ""}{a.city && a.country ? ", " : ""}{a.country ?? ""}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">{a.location}</div>
                    </TableCell>
                    <TableCell>{renderStars(a.rating ?? 0)}</TableCell>
                    <TableCell className="text-sm">
                      {a.contact_phone && <div>{a.contact_phone}</div>}
                      {a.contact_email && <div className="text-muted-foreground">{a.contact_email}</div>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={a.status === "ACTIVE" ? "bg-green-100 text-green-700" : ""}>
                        {a.status === "ACTIVE" ? "Hoạt động" : "Tạm ngưng"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AccommodationFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
