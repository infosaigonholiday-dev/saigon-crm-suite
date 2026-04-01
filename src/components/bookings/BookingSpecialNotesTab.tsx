import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { HeartPulse, Star, Baby, PartyPopper, Truck, Wallet, Plus, Trash2, Loader2 } from "lucide-react";

type NoteType = "health" | "request" | "elderly_child" | "event" | "operation" | "finance";
type Priority = "high" | "medium" | "low";

const noteTypeConfig: Record<NoteType, { label: string; icon: typeof HeartPulse }> = {
  health: { label: "Sức khoẻ", icon: HeartPulse },
  request: { label: "Yêu cầu đặc biệt", icon: Star },
  elderly_child: { label: "Người già / Trẻ em", icon: Baby },
  event: { label: "Sự kiện", icon: PartyPopper },
  operation: { label: "Vận hành", icon: Truck },
  finance: { label: "Tài chính", icon: Wallet },
};

const priorityConfig: Record<Priority, { label: string; className: string }> = {
  high: { label: "Cao", className: "bg-destructive/15 text-destructive border-destructive/30" },
  medium: { label: "TB", className: "bg-warning/15 text-warning border-warning/30" },
  low: { label: "Thấp", className: "bg-blue-50 text-blue-600 border-blue-200" },
};

interface Props {
  bookingId: string;
  canEdit: boolean;
  canDelete: boolean;
}

export default function BookingSpecialNotesTab({ bookingId, canEdit, canDelete }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [noteType, setNoteType] = useState<NoteType>("request");
  const [content, setContent] = useState("");
  const [relatedGuest, setRelatedGuest] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["booking-special-notes", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_special_notes")
        .select("*, profiles:created_by(full_name)")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addNote = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("booking_special_notes").insert({
        booking_id: bookingId,
        note_type: noteType,
        content,
        related_guest: relatedGuest || null,
        priority,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booking-special-notes", bookingId] });
      queryClient.invalidateQueries({ queryKey: ["booking-high-notes"] });
      setContent("");
      setRelatedGuest("");
      setShowForm(false);
      toast.success("Đã thêm lưu ý");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("booking_special_notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booking-special-notes", bookingId] });
      queryClient.invalidateQueries({ queryKey: ["booking-high-notes"] });
      toast.success("Đã xóa");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Group by note_type
  const grouped = (Object.keys(noteTypeConfig) as NoteType[])
    .map((type) => ({ type, notes: notes.filter((n: any) => n.note_type === type) }))
    .filter((g) => g.notes.length > 0);

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-1" />Thêm lưu ý
          </Button>
        </div>
      )}

      {showForm && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Select value={noteType} onValueChange={(v) => setNoteType(v as NoteType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(noteTypeConfig) as [NoteType, typeof noteTypeConfig.health][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input placeholder="Khách liên quan (tuỳ chọn)" value={relatedGuest} onChange={(e) => setRelatedGuest(e.target.value)} />
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">🔴 Cao</SelectItem>
                  <SelectItem value="medium">🟡 Trung bình</SelectItem>
                  <SelectItem value="low">🔵 Thấp</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Textarea placeholder="Nội dung lưu ý..." value={content} onChange={(e) => setContent(e.target.value)} />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Huỷ</Button>
              <Button size="sm" onClick={() => addNote.mutate()} disabled={!content.trim() || addNote.isPending}>
                {addNote.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Lưu
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {grouped.length === 0 && !showForm && (
        <p className="text-center text-sm text-muted-foreground py-8">Chưa có lưu ý đặc biệt nào</p>
      )}

      {grouped.map(({ type, notes: groupNotes }) => {
        const cfg = noteTypeConfig[type];
        const Icon = cfg.icon;
        return (
          <Card key={type}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" />
                {cfg.label} ({groupNotes.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {groupNotes.map((note: any) => {
                const pCfg = priorityConfig[(note.priority as Priority) ?? "medium"];
                return (
                  <div key={note.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{note.content}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className={pCfg.className}>{pCfg.label}</Badge>
                        {note.related_guest && (
                          <span className="text-xs text-muted-foreground">Khách: {note.related_guest}</span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          — {(note.profiles as any)?.full_name ?? ""}
                        </span>
                      </div>
                    </div>
                    {canDelete && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive" onClick={() => deleteNote.mutate(note.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
