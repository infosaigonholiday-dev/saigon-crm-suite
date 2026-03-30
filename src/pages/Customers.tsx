import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import CustomerFormDialog from "@/components/customers/CustomerFormDialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, Plus, Loader2 } from "lucide-react";

type Segment = "ALL" | "NEW" | "SILVER" | "GOLD" | "DIAMOND";

const segments: { label: string; value: Segment }[] = [
  { label: "Tất cả", value: "ALL" },
  { label: "Mới", value: "NEW" },
  { label: "Silver", value: "SILVER" },
  { label: "Gold", value: "GOLD" },
  { label: "Diamond", value: "DIAMOND" },
];

const segmentColors: Record<string, string> = {
  NEW: "bg-secondary text-secondary-foreground",
  SILVER: "bg-muted text-muted-foreground",
  GOLD: "bg-warning/15 text-warning border border-warning/30",
  DIAMOND: "bg-accent/15 text-accent border border-accent/30",
};

export default function Customers() {
  const [filter, setFilter] = useState<Segment>("ALL");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, full_name, phone, email, segment, department_id, assigned_sale_id")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = customers.filter((c) => {
    const matchSegment = filter === "ALL" || c.segment === filter;
    const q = search.toLowerCase();
    const matchSearch = !search || 
      c.full_name.toLowerCase().includes(q) ||
      (c.phone?.includes(search)) ||
      (c.email?.toLowerCase().includes(q));
    return matchSegment && matchSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Khách hàng</h1>
          <p className="text-sm text-muted-foreground">{customers.length} khách hàng</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Thêm khách hàng</Button>
      </div>
      <CustomerFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <div className="flex gap-1 flex-wrap">
              {segments.map((s) => (
                <Button
                  key={s.value}
                  variant={filter === s.value ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setFilter(s.value)}
                  className="text-xs"
                >
                  {s.label}
                </Button>
              ))}
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Tìm kiếm..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên khách hàng</TableHead>
                  <TableHead>Điện thoại</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phân khúc</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium">{c.full_name}</TableCell>
                    <TableCell>{c.phone ?? "—"}</TableCell>
                    <TableCell>{c.email ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={segmentColors[c.segment ?? "NEW"]}>
                        {c.segment ?? "NEW"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Không có dữ liệu</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
