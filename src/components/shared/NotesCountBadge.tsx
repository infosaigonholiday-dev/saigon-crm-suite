import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare } from "lucide-react";
import type { EntityType } from "./InternalNotes";

interface Props {
  entityType: EntityType;
  entityId: string;
  showIcon?: boolean;
  className?: string;
}

export function NotesCountBadge({ entityType, entityId, showIcon = false, className = "" }: Props) {
  const { data: count = 0 } = useQuery({
    queryKey: ["internal-notes-count", entityType, entityId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("internal_notes")
        .select("id", { count: "exact", head: true })
        .eq("entity_type", entityType)
        .eq("entity_id", entityId);
      if (error) return 0;
      return count ?? 0;
    },
    enabled: !!entityId,
  });

  if (count === 0 && !showIcon) return null;

  if (showIcon) {
    return (
      <span className={`inline-flex items-center gap-0.5 text-xs text-muted-foreground ${className}`}>
        <MessageSquare className="h-3.5 w-3.5" />
        {count > 0 && <span>{count}</span>}
      </span>
    );
  }

  return <span className={`text-xs text-muted-foreground ${className}`}>({count})</span>;
}
