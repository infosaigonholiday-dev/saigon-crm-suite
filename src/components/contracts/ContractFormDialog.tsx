import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const contractTypes = ["Khách lẻ", "Đoàn", "MICE", "Đại lý"];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export default function ContractFormDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [bookingId, setBookingId] = useState("");
  const [contractType, setContractType] = useState("Khách lẻ");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositDueAt, setDepositDueAt] = useState("");
  const [fullPaymentDueAt, setFullPaymentDueAt] = useState("");
  const [cancellationTerms, setCancellationTerms] = useState("");

  // Available bookings (no existing contract)
  const { data: availableBookings = [] } = useQuery({
    queryKey: ["available-bookings-for-contract"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, code, customer_id, total_value, customers(full_name)")
        .not("status", "eq", "CANCELLED");
      if (error) throw error;

      // Filter out bookings that already have contracts
      const { data: existing } = await supabase
        .from("contracts")
        .select("booking_id");
      const existingIds = new Set((existing || []).map((c) => c.booking_id));
      return (data || []).filter((b) => !existingIds.has(b.id));
    },
    enabled: open,
  });

  const selectedBooking = availableBookings.find((b) => b.id === bookingId);

  const createContract = useMutation({
    mutationFn: async () => {
      if (!selectedBooking) throw new Error("Chưa chọn booking");
      const code = `HD-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      const { error } = await supabase.from("contracts").insert({
        code,
        booking_id: selectedBooking.id,
        customer_id: selectedBooking.customer_id,
        contract_type: contractType,
        total_value: selectedBooking.total_value,
        deposit_amount: depositAmount ? Number(depositAmount) : 0,
        deposit_due_at: depositDueAt || null,
        full_payment_due_at: fullPaymentDueAt || null,
        cancellation_terms: cancellationTerms || null,
        status: "DRAFT",
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["available-bookings-for-contract"] });
      onOpenChange(false);
      resetForm();
      toast.success("Đã tạo hợp đồng");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const resetForm = () => {
    setBookingId("");
    setContractType("Khách lẻ");
    setDepositAmount("");
    setDepositDueAt("");
    setFullPaymentDueAt("");
    setCancellationTerms("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Tạo hợp đồng mới</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Booking</Label>
            <Select value={bookingId} onValueChange={setBookingId}>
              <SelectTrigger><SelectValue placeholder="Chọn booking..." /></SelectTrigger>
              <SelectContent>
                {availableBookings.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.code} — {(b.customers as any)?.full_name ?? "N/A"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedBooking && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-muted/50 rounded-lg text-sm">
              <div>
                <span className="text-muted-foreground">Khách hàng:</span>{" "}
                <span className="font-medium">{(selectedBooking.customers as any)?.full_name}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Giá trị:</span>{" "}
                <span className="font-medium">{selectedBooking.total_value?.toLocaleString("vi-VN")}đ</span>
              </div>
            </div>
          )}

          <div>
            <Label>Loại hợp đồng</Label>
            <Select value={contractType} onValueChange={setContractType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {contractTypes.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tiền cọc yêu cầu</Label>
              <Input type="number" placeholder="0" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} />
            </div>
            <div>
              <Label>Hạn TT cọc</Label>
              <Input type="date" value={depositDueAt} onChange={(e) => setDepositDueAt(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Hạn thanh toán đủ</Label>
            <Input type="date" value={fullPaymentDueAt} onChange={(e) => setFullPaymentDueAt(e.target.value)} />
          </div>

          <div>
            <Label>Điều khoản hoàn/hủy</Label>
            <Textarea placeholder="Nhập điều khoản..." value={cancellationTerms} onChange={(e) => setCancellationTerms(e.target.value)} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Huỷ</Button>
            <Button onClick={() => createContract.mutate()} disabled={!bookingId || createContract.isPending}>
              {createContract.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Tạo hợp đồng
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
