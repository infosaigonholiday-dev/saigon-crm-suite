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
      // Helper: trim & convert empty string to null
      const clean = (v: any) => {
        if (v === undefined || v === null) return null;
        if (typeof v === "string") {
          const t = v.trim();
          return t === "" ? null : t;
        }
        return v;
      };

      const noteParts: string[] = [];
      if (lead.call_notes) noteParts.push(lead.call_notes);
      // Include interest_type in notes if it differs from destination
      if (lead.interest_type && lead.interest_type !== lead.destination) {
        noteParts.push(`Loại quan tâm: ${lead.interest_type}`);
      }
      if (extraNotes) noteParts.push(extraNotes);
      const combinedNotes = noteParts.filter(Boolean).join("\n---\n");

      const hasCompany = !!clean(lead.company_name);
      const payload = {
        full_name: clean(lead.full_name),
        phone: clean(lead.phone),
        email: clean(lead.email),
        company_name: clean(lead.company_name),
        company_address: clean(lead.company_address),
        contact_person: clean(lead.contact_person),
        contact_position: clean(lead.contact_position),
        assigned_sale_id: clean(lead.assigned_to),
        department_id: clean(lead.department_id),
        type: hasCompany ? "CORPORATE" : "INDIVIDUAL",
        source: clean(lead.channel),
        tour_interest: clean(lead.destination) || clean(lead.interest_type),
        notes: clean(combinedNotes),
        tax_code: clean(lead.tax_code),
        company_size: lead.company_size || null,
        segment: "NEW",
      };

      // Debug log to verify field values before insert
      console.log("[ConvertToCustomer] Lead source:", lead);
      console.log("[ConvertToCustomer] Customer payload:", payload);

      const { data: customer, error: custErr } = await supabase
        .from("customers")
        .insert(payload)
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
