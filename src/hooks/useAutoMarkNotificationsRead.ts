import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Tự động đánh dấu các notification liên quan tới (entityType, entityId) là đã đọc
 * khi user mở trang chi tiết. Giúp giảm noise trên NotificationBell.
 */
export function useAutoMarkNotificationsRead(entityType: string, entityId?: string | null) {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user?.id || !entityId) return;
    let cancelled = false;
    (async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .match({ user_id: user.id, entity_type: entityType, entity_id: entityId, is_read: false });
      if (!cancelled && !error) {
        qc.invalidateQueries({ queryKey: ["notifications-unread", user.id] });
        qc.invalidateQueries({ queryKey: ["notifications-all", user.id] });
        qc.invalidateQueries({ queryKey: ["alerts-badge", user.id] });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, entityType, entityId, qc]);
}
