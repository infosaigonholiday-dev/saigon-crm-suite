import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Send, Megaphone, History, Users, Search } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { validateNotificationUrl, isValidActionUrl } from "@/lib/actionUrl";
import { Lock } from "lucide-react";

type TargetMode = "all" | "type" | "department" | "role" | "users";

interface Profile {
  id: string;
  full_name: string;
  email: string | null;
  role: string;
  department_id: string | null;
  is_active: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Quản trị viên",
  SUPER_ADMIN: "Super Admin",
  GDKD: "Giám đốc kinh doanh",
  MANAGER: "Trưởng phòng",
  DIEUHAN: "Điều hành",
  HR_MANAGER: "Trưởng phòng HCNS",
  HCNS: "Nhân sự",
  KETOAN: "Kế toán",
  MKT: "Marketing",
  SALE_OUTBOUND: "Sale Outbound",
  SALE_DOMESTIC: "Sale Nội địa",
  SALE_MICE: "Sale MICE",
  INTERN_SALE_OUTBOUND: "TTS Sale Outbound",
  INTERN_SALE_DOMESTIC: "TTS Sale Nội địa",
  INTERN_SALE_MICE: "TTS Sale MICE",
  INTERN_DIEUHAN: "TTS Điều hành",
  INTERN_HCNS: "TTS HCNS",
  INTERN_MKT: "TTS Marketing",
  INTERN_KETOAN: "TTS Kế toán",
};

const isIntern = (role: string) => role.startsWith("INTERN_");
const isOfficial = (role: string) => !role.startsWith("INTERN_") && role !== "SUPER_ADMIN";

export default function BroadcastNotification() {
  const { user, userRole } = useAuth();
  const qc = useQueryClient();

  const canSend = ["ADMIN", "SUPER_ADMIN", "GDKD", "MANAGER", "HCNS"].includes(userRole || "");

  // Form state
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [url, setUrl] = useState("/canh-bao");
  const [mode, setMode] = useState<TargetMode>("all");
  const [includeOfficial, setIncludeOfficial] = useState(true);
  const [includeIntern, setIncludeIntern] = useState(true);
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"compose" | "history">("compose");

  // Load profiles within sender's scope
  const { data: profiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ["broadcast-profiles", userRole, user?.id],
    queryFn: async () => {
      let q = supabase
        .from("profiles")
        .select("id, full_name, email, role, department_id, is_active")
        .eq("is_active", true)
        .neq("id", user!.id) // không tự gửi cho mình
        .order("full_name");
      if (userRole === "GDKD") {
        q = q.in("role", [
          "GDKD", "SALE_OUTBOUND", "SALE_DOMESTIC", "SALE_MICE",
          "INTERN_SALE_OUTBOUND", "INTERN_SALE_DOMESTIC", "INTERN_SALE_MICE",
        ]);
      } else if (userRole === "MANAGER") {
        const { data: me } = await supabase.from("profiles").select("department_id").eq("id", user!.id).maybeSingle();
        if (me?.department_id) q = q.eq("department_id", me.department_id);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Profile[];
    },
    enabled: !!user?.id && canSend,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["broadcast-depts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("departments").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
    enabled: canSend,
  });

  // Compute recipient ids based on mode
  const recipientIds = useMemo(() => {
    if (!profiles.length) return [];
    if (mode === "all") return profiles.map((p) => p.id);
    if (mode === "type") {
      return profiles
        .filter((p) => (includeOfficial && isOfficial(p.role)) || (includeIntern && isIntern(p.role)))
        .map((p) => p.id);
    }
    if (mode === "department") {
      if (!selectedDepts.length) return [];
      return profiles.filter((p) => p.department_id && selectedDepts.includes(p.department_id)).map((p) => p.id);
    }
    if (mode === "role") {
      if (!selectedRoles.length) return [];
      return profiles.filter((p) => selectedRoles.includes(p.role)).map((p) => p.id);
    }
    if (mode === "users") return selectedUsers;
    return [];
  }, [mode, profiles, includeOfficial, includeIntern, selectedDepts, selectedRoles, selectedUsers]);

  const recipientProfiles = useMemo(() => profiles.filter((p) => recipientIds.includes(p.id)), [profiles, recipientIds]);

  const filteredUsers = useMemo(() => {
    const k = userSearch.trim().toLowerCase();
    if (!k) return profiles;
    return profiles.filter(
      (p) =>
        p.full_name?.toLowerCase().includes(k) ||
        (p.email || "").toLowerCase().includes(k) ||
        (ROLE_LABELS[p.role] || p.role).toLowerCase().includes(k)
    );
  }, [profiles, userSearch]);

  const allRoles = useMemo(() => {
    const set = new Set<string>();
    profiles.forEach((p) => set.add(p.role));
    return Array.from(set).sort();
  }, [profiles]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      const target_filter = {
        mode,
        ...(mode === "type" && { official: includeOfficial, intern: includeIntern }),
        ...(mode === "department" && { dept_ids: selectedDepts }),
        ...(mode === "role" && { roles: selectedRoles }),
        ...(mode === "users" && { user_ids: selectedUsers }),
      };
      const { data, error } = await supabase.functions.invoke("broadcast-notification", {
        body: {
          title: title.trim(),
          message: message.trim(),
          priority,
          url: url.trim() || "/canh-bao",
          target_user_ids: recipientIds,
          target_filter,
        },
      });
      if (error) throw new Error(error.message);
      if (!data?.ok) throw new Error(data?.error || "Gửi thất bại");
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(`Đã gửi thông báo đến ${data.sent_count} người`);
      setTitle("");
      setMessage("");
      setPriority("medium");
      setUrl("/canh-bao");
      setSelectedDepts([]);
      setSelectedRoles([]);
      setSelectedUsers([]);
      qc.invalidateQueries({ queryKey: ["broadcast-history"] });
    },
    onError: (e: any) => toast.error(e.message || "Gửi thất bại"),
  });

  // History
  const { data: history = [] } = useQuery({
    queryKey: ["broadcast-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("broadcast_messages")
        .select("id, title, message, priority, sent_count, recipient_ids, created_at, sent_by, profiles!broadcast_messages_sent_by_fkey(full_name)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: canSend && activeTab === "history",
  });

  const [detailItem, setDetailItem] = useState<any>(null);

  if (!canSend) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Bạn không có quyền gửi thông báo broadcast. Liên hệ ADMIN nếu cần.
          </CardContent>
        </Card>
      </div>
    );
  }

  const urlValidation = validateNotificationUrl({ action_url: url, action_required: false, priority });
  const canSubmit = title.trim().length > 0 && message.trim().length > 0 && recipientIds.length > 0 && !sendMutation.isPending && urlValidation.ok;

  const handleSend = () => {
    const v = validateNotificationUrl({ action_url: url, action_required: false, priority });
    if (!v.ok) { toast.error(v.error); return; }
    sendMutation.mutate();
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Megaphone className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Gửi thông báo</h1>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="compose"><Send className="h-4 w-4 mr-1" /> Soạn mới</TabsTrigger>
          <TabsTrigger value="history"><History className="h-4 w-4 mr-1" /> Lịch sử</TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* LEFT: nội dung */}
            <Card>
              <CardHeader><CardTitle className="text-base">Nội dung thông báo</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Tiêu đề *</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="VD: Thưởng tháng 4/2026" />
                  <div className="text-xs text-muted-foreground text-right mt-1">{title.length}/120</div>
                </div>
                <div>
                  <Label>Nội dung *</Label>
                  <Textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} rows={5} placeholder="Nhập nội dung thông báo..." />
                  <div className="text-xs text-muted-foreground text-right mt-1">{message.length}/500</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Mức độ</Label>
                    <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Bình thường</SelectItem>
                        <SelectItem value="high">Cao</SelectItem>
                        <SelectItem value="urgent">Khẩn</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Đường dẫn khi click</Label>
                    <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* RIGHT: đối tượng */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Đối tượng nhận</span>
                  <Badge variant="secondary" className="text-sm">
                    <Users className="h-3 w-3 mr-1" /> {recipientIds.length} người
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingProfiles ? (
                  <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : (
                  <Tabs value={mode} onValueChange={(v) => setMode(v as TargetMode)}>
                    <TabsList className="grid grid-cols-5 w-full">
                      <TabsTrigger value="all" className="text-xs">Tất cả</TabsTrigger>
                      <TabsTrigger value="type" className="text-xs">Loại NS</TabsTrigger>
                      <TabsTrigger value="department" className="text-xs">Phòng ban</TabsTrigger>
                      <TabsTrigger value="role" className="text-xs">Vai trò</TabsTrigger>
                      <TabsTrigger value="users" className="text-xs">Cá nhân</TabsTrigger>
                    </TabsList>

                    <TabsContent value="all" className="mt-3 text-sm text-muted-foreground">
                      Sẽ gửi đến <strong className="text-foreground">{profiles.length}</strong> nhân viên đang hoạt động trong phạm vi quyền của bạn.
                    </TabsContent>

                    <TabsContent value="type" className="mt-3 space-y-2">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={includeOfficial} onCheckedChange={(c) => setIncludeOfficial(!!c)} />
                        Nhân viên chính thức ({profiles.filter((p) => isOfficial(p.role)).length})
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={includeIntern} onCheckedChange={(c) => setIncludeIntern(!!c)} />
                        Thực tập sinh ({profiles.filter((p) => isIntern(p.role)).length})
                      </label>
                    </TabsContent>

                    <TabsContent value="department" className="mt-3">
                      <ScrollArea className="h-[180px] border rounded-md p-2">
                        {(departments as any[]).map((d) => {
                          const cnt = profiles.filter((p) => p.department_id === d.id).length;
                          return (
                            <label key={d.id} className="flex items-center gap-2 text-sm py-1 cursor-pointer">
                              <Checkbox
                                checked={selectedDepts.includes(d.id)}
                                onCheckedChange={(c) =>
                                  setSelectedDepts((s) => (c ? [...s, d.id] : s.filter((x) => x !== d.id)))
                                }
                              />
                              <span className="flex-1">{d.name}</span>
                              <span className="text-xs text-muted-foreground">{cnt}</span>
                            </label>
                          );
                        })}
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="role" className="mt-3">
                      <ScrollArea className="h-[180px] border rounded-md p-2">
                        {allRoles.map((r) => {
                          const cnt = profiles.filter((p) => p.role === r).length;
                          return (
                            <label key={r} className="flex items-center gap-2 text-sm py-1 cursor-pointer">
                              <Checkbox
                                checked={selectedRoles.includes(r)}
                                onCheckedChange={(c) =>
                                  setSelectedRoles((s) => (c ? [...s, r] : s.filter((x) => x !== r)))
                                }
                              />
                              <span className="flex-1">{ROLE_LABELS[r] || r}</span>
                              <span className="text-xs text-muted-foreground">{cnt}</span>
                            </label>
                          );
                        })}
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="users" className="mt-3 space-y-2">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input className="pl-8 h-9" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Tìm tên, email, vai trò..." />
                      </div>
                      <ScrollArea className="h-[180px] border rounded-md p-2">
                        {filteredUsers.map((p) => (
                          <label key={p.id} className="flex items-center gap-2 text-sm py-1 cursor-pointer">
                            <Checkbox
                              checked={selectedUsers.includes(p.id)}
                              onCheckedChange={(c) =>
                                setSelectedUsers((s) => (c ? [...s, p.id] : s.filter((x) => x !== p.id)))
                              }
                            />
                            <span className="flex-1">{p.full_name}</span>
                            <span className="text-xs text-muted-foreground">{ROLE_LABELS[p.role] || p.role}</span>
                          </label>
                        ))}
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>
                )}

                {recipientIds.length > 0 && (
                  <details className="mt-3">
                    <summary className="text-xs text-muted-foreground cursor-pointer">Xem danh sách {recipientIds.length} người nhận</summary>
                    <ScrollArea className="h-[120px] border rounded-md p-2 mt-2">
                      {recipientProfiles.map((p) => (
                        <div key={p.id} className="text-xs py-0.5 flex justify-between">
                          <span>{p.full_name}</span>
                          <span className="text-muted-foreground">{ROLE_LABELS[p.role] || p.role}</span>
                        </div>
                      ))}
                    </ScrollArea>
                  </details>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="lg" disabled={!canSubmit}>
                  {sendMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Send className="h-4 w-4 mr-2" /> Gửi đến {recipientIds.length} người
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Xác nhận gửi thông báo</AlertDialogTitle>
                  <AlertDialogDescription>
                    Sẽ gửi <strong>"{title}"</strong> đến <strong>{recipientIds.length}</strong> người nhận. Họ sẽ nhận được thông báo qua chuông trong app và Web Push (nếu đã bật). Tiếp tục?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Huỷ</AlertDialogCancel>
                  <AlertDialogAction onClick={() => sendMutation.mutate()}>Gửi ngay</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Lịch sử thông báo đã gửi</CardTitle></CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Chưa có lịch sử</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ngày</TableHead>
                      <TableHead>Tiêu đề</TableHead>
                      <TableHead>Người gửi</TableHead>
                      <TableHead>Mức độ</TableHead>
                      <TableHead className="text-right">Số người nhận</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(history as any[]).map((h) => (
                      <TableRow key={h.id}>
                        <TableCell className="text-sm">{format(new Date(h.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                        <TableCell className="font-medium">{h.title}</TableCell>
                        <TableCell className="text-sm">{h.profiles?.full_name || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={h.priority === "urgent" ? "destructive" : h.priority === "high" ? "default" : "secondary"}>
                            {h.priority === "urgent" ? "Khẩn" : h.priority === "high" ? "Cao" : "Thường"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{h.sent_count}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => setDetailItem(h)}>Xem</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!detailItem} onOpenChange={(o) => !o && setDetailItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{detailItem?.title}</DialogTitle>
          </DialogHeader>
          {detailItem && (
            <div className="space-y-3">
              <div className="text-sm whitespace-pre-wrap p-3 bg-muted rounded-md">{detailItem.message}</div>
              <div className="text-xs text-muted-foreground">
                Gửi bởi {detailItem.profiles?.full_name} · {format(new Date(detailItem.created_at), "dd/MM/yyyy HH:mm")} · {detailItem.sent_count} người nhận
              </div>
              <RecipientReadStatus broadcastId={detailItem.id} recipientIds={detailItem.recipient_ids || []} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RecipientReadStatus({ broadcastId, recipientIds }: { broadcastId: string; recipientIds: string[] }) {
  const { data, isLoading } = useQuery({
    queryKey: ["broadcast-read", broadcastId],
    queryFn: async () => {
      const [{ data: notifs }, { data: profs }] = await Promise.all([
        supabase
          .from("notifications")
          .select("user_id, is_read, read_at")
          .eq("entity_type", "broadcast")
          .eq("entity_id", broadcastId),
        supabase.from("profiles").select("id, full_name, role").in("id", recipientIds.length ? recipientIds : ["00000000-0000-0000-0000-000000000000"]),
      ]);
      const readMap = new Map((notifs || []).map((n: any) => [n.user_id, n]));
      return (profs || []).map((p: any) => ({
        ...p,
        read: readMap.get(p.id)?.is_read || false,
        read_at: readMap.get(p.id)?.read_at,
      }));
    },
  });

  if (isLoading) return <Loader2 className="h-4 w-4 animate-spin" />;
  const readCount = (data || []).filter((d: any) => d.read).length;
  return (
    <div className="space-y-1">
      <div className="text-sm font-medium">Đã đọc: {readCount}/{(data || []).length}</div>
      <ScrollArea className="h-[200px] border rounded-md p-2">
        {(data || []).map((p: any) => (
          <div key={p.id} className="text-xs py-1 flex justify-between items-center">
            <span>{p.full_name}</span>
            {p.read ? (
              <Badge variant="outline" className="text-blue-600 border-blue-600">Đã đọc</Badge>
            ) : (
              <Badge variant="outline">Chưa đọc</Badge>
            )}
          </div>
        ))}
      </ScrollArea>
    </div>
  );
}
