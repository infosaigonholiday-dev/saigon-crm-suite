import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import InternalNotes, { type EntityType } from "./InternalNotes";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: EntityType;
  entityId: string | null;
  title?: string;
}

export default function InternalNotesDialog({ open, onOpenChange, entityType, entityId, title = "Ghi chú nội bộ" }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {entityId && <InternalNotes entityType={entityType} entityId={entityId} />}
      </DialogContent>
    </Dialog>
  );
}
