import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, AtSign } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

export type EntityType =
  | "raw_contact" | "lead" | "customer" | "booking"
  | "quotation" | "contract" | "payment" | "employee" | "finance"
  | "payroll" | "candidate";

const entityRouteMap: Record<EntityType, (id: string) => string> = {
  raw_contact: () => "/kho-data",
  lead: () => "/tiem-nang",
  customer: (id) => `/khach-hang/${id}`,
  booking: (id) => `/dat-tour/${id}`,
  quotation: () => "/bao-gia",
  contract: () => "/hop-dong",
  payment: () => "/thanh-toan",
  employee: (id) => `/nhan-su/${id}`,
  finance: () => "/tai-chinh",
  payroll: () => "/bang-luong",
  candidate: () => "/tuyen-dung",
};

interface Props {
  entityType: EntityType;
  entityId: string;
  entityName?: string; // optional for notification title
}

interface Profile {
  id: string;
  full_name: string;
}

interface Note {
  id: string;
  content: string;
  mention_user_ids: string[];
  created_by: string;
  created_at: string;
  author?: { full_name: string | null } | null;
}

function highlightMentions(text: string, mentionMap: Map<string, string>) {
  // Replace @Tên with highlighted span
  const parts: (string | JSX.Element)[] = [];
  const regex = /@([\p{L}\p{N}\s]+?)(?=\s|$|[,.;:!?])/gu;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    const name = match[1].trim();
    const isKnown = Array.from(mentionMap.values()).some((n) => n === name);
    parts.push(
      <span
        key={`m-${key++}`}
        className={isKnown ? "text-blue-600 font-medium" : "text-muted-foreground"}
      >
        @{name}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

export default function InternalNotes({ entityType, entityId, entityName }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [content, setContent] = useState("");
  const [mentionedUsers, setMentionedUsers] = useState<Profile[]>([]);
  const [mentionPickerOpen, setMentionPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["internal-notes", entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("internal_notes")
        .select("id, content, mention_user_ids, created_by, created_at")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch author names
      const ids = Array.from(new Set((data ?? []).map((n) => n.created_by)));
      const { data: profs } = ids.length > 0
        ? await supabase.from("profiles").select("id, full_name").in("id", ids)
        : { data: [] };
      const profMap = new Map((profs ?? []).map((p: any) => [p.id, p.full_name]));
      return ((data ?? []) as any[]).map((n) => ({
        ...n,
        author: { full_name: profMap.get(n.created_by) ?? "—" },
      })) as Note[];
    },
    enabled: !!entityId,
  });

  // Profile suggestions for @mention picker
  const { data: profileOptions = [] } = useQuery({
    queryKey: ["profiles-for-mention", search],
    queryFn: async () => {
      let q = supabase.from("profiles").select("id, full_name").eq("is_active", true).order("full_name").limit(20);
      if (search.trim()) q = q.ilike("full_name", `%${search.trim()}%`);
      const { data } = await q;
      return (data ?? []) as Profile[];
    },
    enabled: mentionPickerOpen,
  });

  // Build a map of @Name → user_id from notes for highlighting
  const mentionNameMap = new Map<string, string>();
  // Also add picker-known profiles
  profileOptions.forEach((p) => mentionNameMap.set(p.id, p.full_name));
  mentionedUsers.forEach((p) => mentionNameMap.set(p.id, p.full_name));

  const handleAddMention = (profile: Profile) => {
    if (!mentionedUsers.find((u) => u.id === profile.id)) {
      setMentionedUsers((prev) => [...prev, profile]);
    }
    // Insert "@Name " into textarea at end (or replace trailing @)
    const ta = textareaRef.current;
    if (ta) {
      const value = content;
      const lastAtIdx = value.lastIndexOf("@");
      let newValue: string;
      if (lastAtIdx >= 0 && value.slice(lastAtIdx).match(/^@[^\s]*$/)) {
        newValue = value.slice(0, lastAtIdx) + `@${profile.full_name} `;
      } else {
        newValue = value + (value.endsWith(" ") || value === "" ? "" : " ") + `@${profile.full_name} `;
      }
      setContent(newValue);
      setTimeout(() => ta.focus(), 0);
    }
    setMentionPickerOpen(false);
    setSearch("");
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    // Auto-open picker on '@'
    const cursor = e.target.selectionStart;
    const before = val.slice(0, cursor);
    const m = before.match(/@([^\s@]*)$/);
    if (m) {
      setSearch(m[1]);
      setMentionPickerOpen(true);
    } else {
      setMentionPickerOpen(false);
    }
  };

  const handleSubmit = async () => {
    if (!content.trim() || !user) return;
    setSubmitting(true);
    try {
      // Filter mentioned users that actually appear in content as @Name
      const activeMentions = mentionedUsers.filter((u) =>
        content.includes(`@${u.full_name}`)
      );
      const mentionIds = activeMentions.map((u) => u.id);

      const { data: inserted, error } = await supabase
        .from("internal_notes")
        .insert({
          entity_type: entityType,
          entity_id: entityId,
          content: content.trim(),
          mention_user_ids: mentionIds,
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;

      // Notifications for each mention (excluding self)
      const recipientIds = mentionIds.filter((id) => id !== user.id);
      if (recipientIds.length > 0) {
        // Get sender name
        const { data: me } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
        const senderName = me?.full_name ?? "Đồng nghiệp";
        const preview = content.trim().slice(0, 100);

        const notifTitle = `${senderName} đã tag bạn`;
        const notifRows = recipientIds.map((uid) => ({
          user_id: uid,
          type: "internal_note" as const,
          title: notifTitle,
          message: preview,
          entity_type: entityType,
          entity_id: entityId,
        }));
        await supabase.from("notifications").insert(notifRows);
        // Web Push được gửi tự động qua DB trigger notify_push_on_insert → OneSignal
      }

      toast.success("Đã gửi ghi chú");
      setContent("");
      setMentionedUsers([]);
      queryClient.invalidateQueries({ queryKey: ["internal-notes", entityType, entityId] });
      queryClient.invalidateQueries({ queryKey: ["internal-notes-count", entityType, entityId] });
    } catch (err: any) {
      toast.error("Lỗi gửi ghi chú", { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Form */}
      <div className="space-y-2 border rounded-lg p-3 bg-muted/30">
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            placeholder="Viết ghi chú nội bộ. Gõ @ để tag đồng nghiệp..."
            rows={3}
            className="resize-none bg-background"
          />
          <Popover open={mentionPickerOpen} onOpenChange={setMentionPickerOpen}>
            <PopoverTrigger asChild>
              <span className="absolute -bottom-px left-0 w-px h-px" />
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 p-0">
              <Command>
                <CommandInput
                  placeholder="Tìm tên..."
                  value={search}
                  onValueChange={setSearch}
                  autoFocus
                />
                <CommandList>
                  <CommandEmpty>Không tìm thấy</CommandEmpty>
                  <CommandGroup>
                    {profileOptions.map((p) => (
                      <CommandItem
                        key={p.id}
                        value={p.full_name}
                        onSelect={() => handleAddMention(p)}
                      >
                        <AtSign className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                        {p.full_name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground flex flex-wrap gap-1">
            {mentionedUsers
              .filter((u) => content.includes(`@${u.full_name}`))
              .map((u) => (
                <span key={u.id} className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                  @{u.full_name}
                </span>
              ))}
          </div>
          <Button size="sm" onClick={handleSubmit} disabled={!content.trim() || submitting}>
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Send className="h-3.5 w-3.5 mr-1" />}
            Gửi
          </Button>
        </div>
      </div>

      {/* Timeline */}
      {isLoading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : notes.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-6">Chưa có ghi chú nào</p>
      ) : (
        <div className="space-y-3">
          {notes.map((n) => {
            const initial = (n.author?.full_name ?? "?").charAt(0).toUpperCase();
            return (
              <div key={n.id} className="flex gap-3 border-b pb-3 last:border-b-0">
                <div className="h-8 w-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                  {initial}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-medium text-sm">{n.author?.full_name ?? "Người dùng"}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: vi })}
                    </span>
                  </div>
                  <p className="text-sm mt-1 whitespace-pre-wrap break-words">
                    {highlightMentions(n.content, mentionNameMap)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
