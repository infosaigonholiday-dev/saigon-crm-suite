import { supabase } from "@/integrations/supabase/client";

/**
 * Helpers cho action_status (tách bạch khỏi is_read).
 * - markActionInProgress / markActionCompleted / dismissAction: chỉ set khi user
 *   thật sự thao tác nghiệp vụ (không gọi từ click chuông).
 * - completeActionsForEntity: gọi khi sự kiện nghiệp vụ thật sự xảy ra
 *   (lưu care history, thanh toán, duyệt chi, duyệt nghỉ phép, duyệt hợp đồng...).
 */

export type NotificationActionStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "dismissed";

async function setStatus(id: string, status: NotificationActionStatus, note?: string) {
  return supabase.rpc("rpc_notification_set_action_status", {
    p_id: id,
    p_status: status,
    p_note: note ?? null,
  });
}

export const markActionInProgress = (id: string, note?: string) => setStatus(id, "in_progress", note);
export const markActionCompleted = (id: string, note?: string) => setStatus(id, "completed", note);
export const dismissAction = (id: string, note?: string) => setStatus(id, "dismissed", note);

/**
 * Hoàn tất tất cả notification action thuộc 1 entity (của user hiện tại).
 * Dùng khi user vừa thực hiện hành động nghiệp vụ thật.
 */
export async function completeActionsForEntity(
  userId: string,
  entityType: string,
  entityId: string,
  types?: string[]
) {
  let q = supabase
    .from("notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("action_required", true)
    .in("action_status", ["pending", "in_progress", "overdue"]);
  if (types && types.length > 0) q = q.in("type", types);

  const { data, error } = await q;
  if (error || !data?.length) return { completed: 0 };

  let ok = 0;
  for (const row of data) {
    const { error: e } = await setStatus(row.id, "completed");
    if (!e) ok++;
  }
  return { completed: ok };
}
