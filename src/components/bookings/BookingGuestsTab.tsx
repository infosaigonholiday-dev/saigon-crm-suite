import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Upload, Download, Pencil, Trash2, Crown, Users } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface Props {
  bookingId: string;
  paxTotal?: number | null;
  canEdit: boolean;
}

interface Guest {
  id: string;
  booking_id: string;
  full_name: string;
  gender: string | null;
  date_of_birth: string | null;
  id_number: string | null;
  id_type: string | null;
  phone: string | null;
  email: string | null;
  special_request: string | null;
  room_assignment: string | null;
  is_leader: boolean;
}

const emptyGuest = {
  full_name: "",
  gender: "",
  date_of_birth: "",
  id_number: "",
  id_type: "cccd",
  phone: "",
  email: "",
  special_request: "",
  room_assignment: "",
  is_leader: false,
};

export default function BookingGuestsTab({ bookingId, paxTotal, canEdit }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Guest | null>(null);
  const [form, setForm] = useState<any>(emptyGuest);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: guests = [], isLoading } = useQuery({
    queryKey: ["booking-guests", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tour_guests")
        .select("*")
        .eq("booking_id", bookingId)
        .order("is_leader", { ascending: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Guest[];
    },
  });

  const upsertMut = useMutation({
    mutationFn: async (payload: any) => {
      const data = {
        ...payload,
        date_of_birth: payload.date_of_birth || null,
        gender: payload.gender || null,
        booking_id: bookingId,
      };
      if (editing) {
        const { error } = await supabase.from("tour_guests").update(data).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tour_guests").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["booking-guests", bookingId] });
      toast.success(editing ? "Đã cập nhật khách" : "Đã thêm khách");
      setOpen(false);
      setEditing(null);
      setForm(emptyGuest);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tour_guests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["booking-guests", bookingId] });
      toast.success("Đã xoá khách");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const importMut = useMutation({
    mutationFn: async (rows: any[]) => {
      const payload = rows.map((r) => ({
        booking_id: bookingId,
        full_name: String(r["Họ tên"] ?? r.full_name ?? "").trim(),
        gender: String(r["Giới tính"] ?? r.gender ?? "").toLowerCase().trim() || null,
        date_of_birth: r["Ngày sinh"] || r.date_of_birth || null,
        id_number: String(r["CCCD/Passport"] ?? r.id_number ?? "").trim() || null,
        id_type: String(r["Loại GT"] ?? r.id_type ?? "cccd").toLowerCase().trim() || "cccd",
        phone: String(r["SĐT"] ?? r.phone ?? "").trim() || null,
        email: String(r["Email"] ?? r.email ?? "").trim() || null,
        special_request: String(r["Yêu cầu"] ?? r.special_request ?? "").trim() || null,
        room_assignment: String(r["Phòng"] ?? r.room_assignment ?? "").trim() || null,
        is_leader: Boolean(r["Trưởng đoàn"] || r.is_leader),
      })).filter((r) => r.full_name);
      if (!payload.length) throw new Error("Không có dòng hợp lệ");
      const { error } = await supabase.from("tour_guests").insert(payload);
      if (error) throw error;
      return payload.length;
    },
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ["booking-guests", bookingId] });
      toast.success(`Đã nhập ${n} khách`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleOpenAdd = () => {
    setEditing(null);
    setForm(emptyGuest);
    setOpen(true);
  };

  const handleEdit = (g: Guest) => {
    setEditing(g);
    setForm({
      full_name: g.full_name ?? "",
      gender: g.gender ?? "",
      date_of_birth: g.date_of_birth ?? "",
      id_number: g.id_number ?? "",
      id_type: g.id_type ?? "cccd",
      phone: g.phone ?? "",
      email: g.email ?? "",
      special_request: g.special_request ?? "",
      room_assignment: g.room_assignment ?? "",
      is_leader: g.is_leader ?? false,
    });
    setOpen(true);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any>(ws, { defval: "" });
      await importMut.mutateAsync(rows);
    } catch (err: any) {
      toast.error("Lỗi đọc file: " + err.message);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleExport = () => {
    const rows = guests.map((g, i) => ({
      "STT": i + 1,
      "Họ tên": g.full_name,
      "Giới tính": g.gender ?? "",
      "Ngày sinh": g.date_of_birth ?? "",
      "Loại GT": g.id_type ?? "",
      "CCCD/Passport": g.id_number ?? "",
      "SĐT": g.phone ?? "",
      "Email": g.email ?? "",
      "Yêu cầu": g.special_request ?? "",
      "Phòng": g.room_assignment ?? "",
      "Trưởng đoàn": g.is_leader ? "x" : "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Khách");
    XLSX.writeFile(wb, `khach-${bookingId.slice(0, 8)}.xlsx`);
  };

  const downloadTemplate = () => {
    const sample = [{
      "Họ tên": "Nguyễn Văn A", "Giới tính": "male", "Ngày sinh": "1990-01-15",
      "Loại GT": "cccd", "CCCD/Passport": "012345678901", "SĐT": "0901234567",
      "Email": "a@example.com", "Yêu cầu": "Ăn chay", "Phòng": "Single", "Trưởng đoàn": "x",
    }];
    const ws = XLSX.utils.json_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mẫu");
    XLSX.writeFile(wb, "mau-danh-sach-khach.xlsx");
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">
              {guests.length} / {paxTotal ?? 0} khách
            </span>
            {paxTotal && guests.length > paxTotal && (
              <Badge variant="destructive">Vượt số khách dự kiến</Badge>
            )}
          </div>
          {canEdit && (
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" onClick={handleOpenAdd}>
                <Plus className="h-4 w-4 mr-1" /> Thêm khách
              </Button>
              <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4 mr-1" /> Nhập Excel
              </Button>
              <Button size="sm" variant="outline" onClick={handleExport} disabled={!guests.length}>
                <Download className="h-4 w-4 mr-1" /> Xuất Excel
              </Button>
              <Button size="sm" variant="ghost" onClick={downloadTemplate}>
                Tải file mẫu
              </Button>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" hidden onChange={handleImport} />
            </div>
          )}
        </div>

        <div className="border rounded-md overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">STT</TableHead>
                <TableHead>Họ tên</TableHead>
                <TableHead>GT</TableHead>
                <TableHead>Ngày sinh</TableHead>
                <TableHead>CCCD/Passport</TableHead>
                <TableHead>SĐT</TableHead>
                <TableHead>Yêu cầu</TableHead>
                <TableHead>Phòng</TableHead>
                <TableHead className="w-12"></TableHead>
                {canEdit && <TableHead className="w-24"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={canEdit ? 10 : 9} className="text-center py-6">Đang tải...</TableCell></TableRow>
              ) : guests.length === 0 ? (
                <TableRow><TableCell colSpan={canEdit ? 10 : 9} className="text-center py-6 text-muted-foreground">Chưa có khách nào</TableCell></TableRow>
              ) : (
                guests.map((g, i) => (
                  <TableRow key={g.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell className="font-medium">
                      {g.full_name}
                      {g.is_leader && <Crown className="inline h-3.5 w-3.5 ml-1 text-amber-500" />}
                    </TableCell>
                    <TableCell>{g.gender === "male" ? "Nam" : g.gender === "female" ? "Nữ" : g.gender === "other" ? "Khác" : "—"}</TableCell>
                    <TableCell>{g.date_of_birth ?? "—"}</TableCell>
                    <TableCell>
                      {g.id_number ? <span className="text-xs">{g.id_type?.toUpperCase()}: {g.id_number}</span> : "—"}
                    </TableCell>
                    <TableCell>{g.phone ?? "—"}</TableCell>
                    <TableCell className="max-w-[180px] truncate">{g.special_request ?? "—"}</TableCell>
                    <TableCell>{g.room_assignment ?? "—"}</TableCell>
                    <TableCell>{g.is_leader && <Badge variant="outline" className="text-[10px]">Trưởng đoàn</Badge>}</TableCell>
                    {canEdit && (
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(g)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => {
                          if (confirm(`Xoá khách "${g.full_name}"?`)) deleteMut.mutate(g.id);
                        }}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editing ? "Sửa khách" : "Thêm khách"}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Họ tên *</Label>
                <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </div>
              <div>
                <Label>Giới tính</Label>
                <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Nam</SelectItem>
                    <SelectItem value="female">Nữ</SelectItem>
                    <SelectItem value="other">Khác</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ngày sinh</Label>
                <Input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
              </div>
              <div>
                <Label>Loại giấy tờ</Label>
                <Select value={form.id_type} onValueChange={(v) => setForm({ ...form, id_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cccd">CCCD</SelectItem>
                    <SelectItem value="cmnd">CMND</SelectItem>
                    <SelectItem value="passport">Passport</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Số CCCD/Passport</Label>
                <Input value={form.id_number} onChange={(e) => setForm({ ...form, id_number: e.target.value })} />
              </div>
              <div>
                <Label>SĐT</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <Label>Phân phòng</Label>
                <Input value={form.room_assignment} onChange={(e) => setForm({ ...form, room_assignment: e.target.value })} placeholder="Single / Double / Twin..." />
              </div>
              <div className="flex items-end gap-2 pb-2">
                <Checkbox id="is_leader" checked={form.is_leader} onCheckedChange={(c) => setForm({ ...form, is_leader: !!c })} />
                <Label htmlFor="is_leader" className="cursor-pointer">Trưởng đoàn</Label>
              </div>
              <div className="col-span-2">
                <Label>Yêu cầu đặc biệt</Label>
                <Textarea value={form.special_request} onChange={(e) => setForm({ ...form, special_request: e.target.value })} rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Huỷ</Button>
              <Button
                onClick={() => {
                  if (!form.full_name.trim()) { toast.error("Vui lòng nhập họ tên"); return; }
                  upsertMut.mutate(form);
                }}
                disabled={upsertMut.isPending}
              >
                {editing ? "Cập nhật" : "Thêm"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
