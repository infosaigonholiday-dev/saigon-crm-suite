import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "TRANSPORT", label: "Vận chuyển" },
  { value: "HOTEL", label: "Khách sạn" },
  { value: "RESTAURANT", label: "Nhà hàng" },
  { value: "MC", label: "MC" },
  { value: "GUIDE", label: "Hướng dẫn viên" },
  { value: "VISA", label: "Visa" },
  { value: "EVENT", label: "Sự kiện" },
  { value: "OTHER", label: "Khác" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor?: any;
}

export function VendorFormDialog({ open, onOpenChange, vendor }: Props) {
  const queryClient = useQueryClient();
  const isEdit = !!vendor;

  const { register, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: {
      name: "",
      category: "OTHER",
      contact_phone: "",
      bank_account: "",
      bank_name: "",
      beneficiary: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (vendor) {
      reset({
        name: vendor.name || "",
        category: vendor.category || "OTHER",
        contact_phone: vendor.contact_phone || "",
        bank_account: vendor.bank_account || "",
        bank_name: vendor.bank_name || "",
        beneficiary: vendor.beneficiary || "",
        notes: vendor.notes || "",
      });
    } else {
      reset({ name: "", category: "OTHER", contact_phone: "", bank_account: "", bank_name: "", beneficiary: "", notes: "" });
    }
  }, [vendor, open]);

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      if (isEdit) {
        const { error } = await supabase.from("vendors").update(values).eq("id", vendor.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("vendors").insert(values);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast.success(isEdit ? "Đã cập nhật NCC" : "Đã thêm NCC");
      onOpenChange(false);
    },
    onError: () => toast.error("Lỗi khi lưu NCC"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Sửa NCC" : "Thêm NCC mới"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Tên NCC *</Label>
              <Input {...register("name", { required: true })} />
            </div>
            <div>
              <Label>Loại dịch vụ</Label>
              <Select value={watch("category")} onValueChange={(v) => setValue("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>SĐT</Label>
              <Input {...register("contact_phone")} />
            </div>
            <div>
              <Label>Ngân hàng</Label>
              <Input {...register("bank_name")} />
            </div>
            <div>
              <Label>Số tài khoản</Label>
              <Input {...register("bank_account")} />
            </div>
            <div className="col-span-2">
              <Label>Người thụ hưởng</Label>
              <Input {...register("beneficiary")} />
            </div>
            <div className="col-span-2">
              <Label>Ghi chú</Label>
              <Textarea {...register("notes")} rows={2} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Huỷ</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Đang lưu..." : isEdit ? "Cập nhật" : "Thêm"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
