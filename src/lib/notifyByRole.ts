import { supabase } from "@/integrations/supabase/client";

export type NotifyPayload = {
  type: string;
  title: string;
  message: string;
  entity_type?: string;
  entity_id?: string;
  priority?: "low" | "medium" | "high" | "critical";
};

/**
 * Insert a notification for every active user that has one of the given roles.
 * Excludes the current user (no self-notification).
 */
export async function notifyUsersByRole(roles: string[], payload: NotifyPayload, excludeSelfId?: string | null) {
  const { data: targets, error } = await supabase
    .from("profiles")
    .select("id")
    .in("role", roles)
    .eq("is_active", true);
  if (error) throw error;
  const recipients = (targets ?? [])
    .map((t: any) => t.id)
    .filter((id: string) => !excludeSelfId || id !== excludeSelfId);
  if (recipients.length === 0) return { sent: 0 };

  const rows = recipients.map((user_id: string) => ({
    user_id,
    type: payload.type,
    title: payload.title,
    message: payload.message,
    entity_type: payload.entity_type ?? null,
    entity_id: payload.entity_id ?? null,
    priority: payload.priority ?? "normal",
    is_read: false,
  }));
  const { error: insErr } = await supabase.from("notifications").insert(rows as any);
  if (insErr) throw insErr;
  return { sent: rows.length };
}

export async function notifyUser(userId: string, payload: NotifyPayload) {
  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    type: payload.type,
    title: payload.title,
    message: payload.message,
    entity_type: payload.entity_type ?? null,
    entity_id: payload.entity_id ?? null,
    priority: payload.priority ?? "normal",
    is_read: false,
  } as any);
  if (error) throw error;
}
