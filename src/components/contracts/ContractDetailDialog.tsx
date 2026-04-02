import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ExternalLink, Upload, FileText, Loader2, Check, ChevronRight } from "lucide-react";

type ContractStatus = "DRAFT" | "PENDING_SIGN" | "SIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

const statusFlow: ContractStatus[] = ["DRAFT", "PENDING_SIGN", "SIGNED", "IN_PROGRESS", "COMPLETED"];

const statusConfig: Record<ContractStatus, { label: string; className: string }> = {
  DRAFT: { label: "Nháp", className: "bg-secondary text-secondary-foreground" },
  PENDING_SIGN: { label: "Chờ ký", className: "bg-warning/15 text-warning border-warning/30" },
  SIGNED: { label: "Đã ký", className: "bg-accent/15 text-accent border-accent/30" },
  IN_PROGRESS: { label: "Đang thực hiện", className: "bg-primary/10 text-primary border-primary/20" },
  COMPLETED: { label: "Hoàn thành", className: "bg-green-100 text-green-700 border-green-300" },
  CANCELLED: { label: "Đã hủy", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

interface Props {
  contractId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export default function ContractDetailDialog({ contractId, open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { userRole } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const canChangeStatus = ["ADMIN", "DIEUHAN"].includes(userRole ?? "");

  const { data: contract, isLoading } = useQuery({
    queryKey: ["contract-detail", contractId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("*, customers(full_name, phone, email, address, tax_code, company_name), bookings(code)")
        .eq("id", contractId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!contractId && open,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["contract-documents", contractId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("entity_type", "contract")
        .eq("entity_id", contractId!);
      if (error) throw error;
      return data;
    },
    enabled: !!contractId && open,
  });

  const updateStatus = useMutation({
    mutationFn: async (newStatus: ContractStatus) => {
      const updates: any = { status: newStatus };
      if (newStatus === "SIGNED") updates.signed_at = new Date().toISOString();
      if (newStatus === "SIGNED" || newStatus === "COMPLETED") updates.approved_by = user?.id;
      const { error } = await supabase.from("contracts").update(updates).eq("id", contractId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract-detail", contractId] });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast.success("Đã cập nhật trạng thái");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !contractId || !user) return;
    setUploading(true);
    try {
      const filePath = `${user.id}/${contractId}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from("contract-files").upload(filePath, file);
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from("contract-files").getPublicUrl(filePath);

      const { error: docErr } = await supabase.from("documents").insert({
        name: file.name,
        file_url: urlData.publicUrl,
        file_type: file.type,
        file_size: file.size,
        entity_type: "contract",
        entity_id: contractId,
        uploaded_by: user.id,
      });
      if (docErr) throw docErr;

      queryClient.invalidateQueries({ queryKey: ["contract-documents", contractId] });
      toast.success("Đã upload file");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (!contractId) return null;

  const currentStatus = (contract?.status as ContractStatus) ?? "DRAFT";
  const currentIdx = statusFlow.indexOf(currentStatus);
  const nextStatus = currentIdx >= 0 && currentIdx < statusFlow.length - 1 ? statusFlow[currentIdx + 1] : null;
  const customer = contract?.customers as any;
  const booking = contract?.bookings as any;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Hợp đồng {contract?.code}
            {contract && <Badge variant="outline" className={statusConfig[currentStatus]?.className}>{statusConfig[currentStatus]?.label}</Badge>}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : contract ? (
          <div className="space-y-4">
            {/* Status Timeline */}
            <div className="flex items-center gap-1 overflow-x-auto pb-2">
              {statusFlow.map((s, i) => {
                const done = i <= currentIdx;
                const isCurrent = s === currentStatus;
                return (
                  <div key={s} className="flex items-center">
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                      isCurrent ? "bg-primary text-primary-foreground" : done ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                    }`}>
                      {done && i < currentIdx && <Check className="h-3 w-3" />}
                      {statusConfig[s].label}
                    </div>
                    {i < statusFlow.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                  </div>
                );
              })}
            </div>

            {/* Action buttons */}
            {canChangeStatus && (
              <div className="flex gap-2 flex-wrap">
                {nextStatus && (
                  <Button size="sm" onClick={() => updateStatus.mutate(nextStatus)} disabled={updateStatus.isPending}>
                    Chuyển → {statusConfig[nextStatus].label}
                  </Button>
                )}
                {currentStatus !== "CANCELLED" && currentStatus !== "COMPLETED" && (
                  <Button size="sm" variant="destructive" onClick={() => updateStatus.mutate("CANCELLED")} disabled={updateStatus.isPending}>
                    Hủy HĐ
                  </Button>
                )}
              </div>
            )}

            {/* Party A */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Bên A — Nhà cung cấp dịch vụ</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <p className="font-medium">Công ty TNHH Du lịch Saigon Holiday</p>
                <p className="text-muted-foreground">Đại diện ký kết hợp đồng dịch vụ du lịch</p>
              </CardContent>
            </Card>

            {/* Party B */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Bên B — Khách hàng</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p><span className="text-muted-foreground">Tên:</span> <span className="font-medium">{customer?.full_name ?? "—"}</span></p>
                {customer?.company_name && <p><span className="text-muted-foreground">Công ty:</span> {customer.company_name}</p>}
                {customer?.phone && <p><span className="text-muted-foreground">SĐT:</span> {customer.phone}</p>}
                {customer?.email && <p><span className="text-muted-foreground">Email:</span> {customer.email}</p>}
                {customer?.address && <p><span className="text-muted-foreground">Địa chỉ:</span> {customer.address}</p>}
                {customer?.tax_code && <p><span className="text-muted-foreground">MST:</span> {customer.tax_code}</p>}
              </CardContent>
            </Card>

            {/* Contract info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Thông tin hợp đồng</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Loại HĐ:</span> <span className="font-medium">{contract.contract_type ?? "—"}</span></div>
                  <div><span className="text-muted-foreground">Giá trị:</span> <span className="font-medium">{contract.total_value?.toLocaleString("vi-VN")}đ</span></div>
                  <div><span className="text-muted-foreground">Tiền cọc:</span> <span className="font-medium">{(contract as any).deposit_amount?.toLocaleString("vi-VN") ?? "0"}đ</span></div>
                  <div><span className="text-muted-foreground">Hạn cọc:</span> {(contract as any).deposit_due_at ?? "—"}</div>
                  <div><span className="text-muted-foreground">Hạn TT đủ:</span> {(contract as any).full_payment_due_at ?? "—"}</div>
                  <div><span className="text-muted-foreground">Ngày ký:</span> {contract.signed_at ? new Date(contract.signed_at).toLocaleDateString("vi-VN") : "Chưa ký"}</div>
                </div>
                {(contract as any).cancellation_terms && (
                  <div className="mt-3 pt-3 border-t text-sm">
                    <p className="text-muted-foreground mb-1">Điều khoản hoàn/hủy:</p>
                    <p className="whitespace-pre-wrap">{(contract as any).cancellation_terms}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Documents */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  File đính kèm
                  <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
                    Upload
                  </Button>
                </CardTitle>
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Chưa có file đính kèm</p>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc: any) => (
                      <a
                        key={doc.id}
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 text-sm transition-colors"
                      >
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        <span className="truncate flex-1">{doc.name}</span>
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      </a>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick link */}
            {booking && (
              <Button variant="outline" className="w-full" onClick={() => { onOpenChange(false); navigate(`/dat-tour/${contract.booking_id}`); }}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Xem Booking {booking.code}
              </Button>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
