import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Plus } from "lucide-react";

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

const customers = [
  { id: 1, name: "Nguyễn Văn A", phone: "0901234567", email: "a@email.com", segment: "DIAMOND", dept: "Phòng KD1", sale: "Trần Hải" },
  { id: 2, name: "Trần Thị B", phone: "0912345678", email: "b@email.com", segment: "GOLD", dept: "Phòng KD2", sale: "Lê Mai" },
  { id: 3, name: "Lê Hoàng C", phone: "0923456789", email: "c@email.com", segment: "SILVER", dept: "Phòng KD1", sale: "Trần Hải" },
  { id: 4, name: "Phạm Minh D", phone: "0934567890", email: "d@email.com", segment: "NEW", dept: "Phòng KD3", sale: "Nguyễn Lan" },
  { id: 5, name: "Hoàng Thị E", phone: "0945678901", email: "e@email.com", segment: "GOLD", dept: "Phòng KD2", sale: "Lê Mai" },
  { id: 6, name: "Vũ Đức F", phone: "0956789012", email: "f@email.com", segment: "NEW", dept: "Phòng KD1", sale: "Trần Hải" },
  { id: 7, name: "Đặng Thị G", phone: "0967890123", email: "g@email.com", segment: "DIAMOND", dept: "Phòng KD3", sale: "Nguyễn Lan" },
  { id: 8, name: "Bùi Văn H", phone: "0978901234", email: "h@email.com", segment: "SILVER", dept: "Phòng KD2", sale: "Lê Mai" },
];

export default function Customers() {
  const [filter, setFilter] = useState<Segment>("ALL");
  const [search, setSearch] = useState("");

  const filtered = customers.filter((c) => {
    const matchSegment = filter === "ALL" || c.segment === filter;
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) || c.email.toLowerCase().includes(search.toLowerCase());
    return matchSegment && matchSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Khách hàng</h1>
          <p className="text-sm text-muted-foreground">{customers.length} khách hàng</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" />Thêm khách hàng</Button>
      </div>

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
              <Input
                placeholder="Tìm kiếm..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên khách hàng</TableHead>
                <TableHead>Điện thoại</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phân khúc</TableHead>
                <TableHead>Phòng KD</TableHead>
                <TableHead>Sale phụ trách</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.phone}</TableCell>
                  <TableCell>{c.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={segmentColors[c.segment]}>
                      {c.segment}
                    </Badge>
                  </TableCell>
                  <TableCell>{c.dept}</TableCell>
                  <TableCell>{c.sale}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
