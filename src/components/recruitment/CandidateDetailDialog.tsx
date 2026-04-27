import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import InternalNotes from "@/components/shared/InternalNotes";
import CandidateFormDialog from "./CandidateFormDialog";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  candidate: any;
}

const statusLabel: Record<string, string> = {
  new: "Mới",
  cv_screening: "Lọc CV",
  interview: "Phỏng vấn",
  offer: "Offer",
  onboarded: "Nhận việc",
  rejected: "Từ chối",
  withdrawn: "Rút lui",
};

export default function CandidateDetailDialog({ open, onOpenChange, candidate }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const { userRole } = useAuth();
  const canEdit = ["ADMIN", "SUPER_ADMIN", "HR_MANAGER", "HCNS"].includes(userRole ?? "");

  if (!candidate) return null;

  const downloadCv = async () => {
    if (!candidate.cv_url) return;
    const { data, error } = await supabase.storage.from("cv-files").createSignedUrl(candidate.cv_url, 60);
    if (error) {
      toast.error("Không tải được CV", { description: error.message });
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {candidate.full_name}
              <Badge variant="outline">{statusLabel[candidate.status] ?? candidate.status}</Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Field label="SĐT" value={candidate.phone} />
              <Field label="Email" value={candidate.email} />
              <Field label="Vị trí" value={candidate.position_applied} />
              <Field label="Phòng ban" value={candidate.departments?.name} />
              <Field label="Nguồn" value={candidate.source} />
              <Field label="Lương mong muốn" value={candidate.salary_expectation ? Number(candidate.salary_expectation).toLocaleString("vi-VN") + "đ" : "—"} />
              <Field label="Offer" value={candidate.offer_salary ? Number(candidate.offer_salary).toLocaleString("vi-VN") + "đ" : "—"} />
              <Field label="Ngày phỏng vấn" value={candidate.interview_date ? new Date(candidate.interview_date).toLocaleDateString("vi-VN") : "—"} />
            </div>
            {candidate.interview_result && (
              <div>
                <p className="text-xs text-muted-foreground">Kết quả phỏng vấn</p>
                <p className="text-sm">{candidate.interview_result}</p>
              </div>
            )}
            {candidate.note && (
              <div>
                <p className="text-xs text-muted-foreground">Ghi chú</p>
                <p className="text-sm whitespace-pre-wrap">{candidate.note}</p>
              </div>
            )}
            {candidate.rejection_reason && (
              <div>
                <p className="text-xs text-muted-foreground">Lý do từ chối</p>
                <p className="text-sm text-destructive">{candidate.rejection_reason}</p>
              </div>
            )}
            <div className="flex gap-2">
              {candidate.cv_url && (
                <Button size="sm" variant="outline" onClick={downloadCv}>
                  <Download className="h-4 w-4 mr-1" />Xem CV
                </Button>
              )}
              {canEdit && (
                <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                  <Pencil className="h-4 w-4 mr-1" />Sửa
                </Button>
              )}
            </div>
            <div className="pt-4 border-t">
              <h4 className="text-sm font-semibold mb-2">Ghi chú nội bộ</h4>
              <InternalNotes entityType="candidate" entityId={candidate.id} />
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <CandidateFormDialog open={editOpen} onOpenChange={setEditOpen} candidate={candidate} />
    </>
  );
}

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value || "—"}</p>
    </div>
  );
}
