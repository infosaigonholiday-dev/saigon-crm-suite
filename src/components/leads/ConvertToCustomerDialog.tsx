import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: any;
}

export default function ConvertToCustomerDialog({ open, onOpenChange, lead }: Props) {
  const [extraNotes, setExtraNotes] = useState("");
  const qc = useQueryClient();
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: async () => {
      const combinedNotes = [lead.call_notes, extraNotes].filter(Boolean).join("\n---\n");
      
      const { data: customer, error: custErr } = await supabase
        .from("customers")
        .insert({
          full_name: lead.full_name,
          phone: lead.phone || null,
          email: lead.email || null,
          company_name: lead.company_name || null,
          company_address: lead.company_address || null,
          contact_person: lead.contact_person || null,
          contact_position: lead.contact_position || null,
          assigned_sale_id: lead.assigned_to || null,
          department_id: lead.department_id || null,
          type: lead.company_name ? "CORPORATE" : "INDIVIDUAL",
          source: lead.channel || null,
          tour_interest: lead.destination || lead.interest_type || null,
          notes: combinedNotes || null,
          tax_code: lead.tax_code || null,
          company_size: lead.company_size || null,
          segment: "NEW",
        })
        .select("id")
        .single();
      if (custErr) throw custErr;

      // Update lead status and link
      const updatePayload: any = { converted_customer_id: customer.id };
      if (lead.status !== "WON") updatePayload.status = "WON";
      
      const { error: leadErr } = await supabase
        .from("leads")
        .update(updatePayload)
        .eq("id", lead.id);
      if (leadErr) throw leadErr;

      return customer;
    },
    onSuccess: (customer) => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Đã chuyển thành khách hàng thành công!");
      onOpenChange(false);
      setExtraNotes("");
      navigate(`/khach-hang/${customer.id}`);
    },
    onError: (err: any) => toast.error("Lỗi", { description: err.message }),
  });

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Chuyển thành Khách hàng</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Chuyển lead <strong>{lead.full_name}</strong> thành khách hàng?
          </p>
          
          <div className="rounded-md border p-3 bg-muted/30 space-y-1.5 text-sm">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <span className="text-muted-foreground">Tên:</span>
              <span>{lead.full_name}</span>
              <span className="text-muted-foreground">SĐT:</span>
              <span>{lead.phone || "—"}</span>
              <span className="text-muted-foreground">Email:</span>
              <span>{lead.email || "—"}</span>
              {lead.company_name && (
                <>
                  <span className="text-muted-foreground">Công ty:</span>
                  <span>{lead.company_name}</span>
                </>
              )}
              <span className="text-muted-foreground">Loại:</span>
              <span>{lead.company_name ? "Doanh nghiệp" : "Cá nhân"}</span>
            </div>
          </div>

          <div>
            <Label>Ghi chú thêm cho KH (tùy chọn)</Label>
            <Textarea value={extraNotes} onChange={(e) => setExtraNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="bg-green-600 hover:bg-green-700">
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Xác nhận chuyển
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
