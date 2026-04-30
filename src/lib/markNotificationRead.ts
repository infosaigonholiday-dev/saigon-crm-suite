import { supabase } from "@/integrations/supabase/client";

/**
 * Mark a single notification as read AND set read_at timestamp.
 * Trigger trg_notifications_set_read_at also enforces this on the DB side.
 */
export async function markNotificationRead(id: string) {
  return supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", id);
}

/**
 * Mark all unread notifications of the current user as read.
 */
export async function markAllNotificationsRead(userId: string) {
  return supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("is_read", false);
}

/**
 * Mark all notifications matching an entity as read (used by detail pages).
 */
export async function markEntityNotificationsRead(
  userId: string,
  entityType: string,
  entityId: string
) {
  return supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .match({ user_id: userId, entity_type: entityType, entity_id: entityId, is_read: false });
}
