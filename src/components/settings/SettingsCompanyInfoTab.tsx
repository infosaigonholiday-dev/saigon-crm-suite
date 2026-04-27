import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, Building2, Save } from "lucide-react";
import { toast } from "sonner";
import {
  COMPANY_INFO_KEYS,
  type CompanyInfo,
  type CompanyInfoKey,
  useCompanyInfo,
} from "@/hooks/useCompanyInfo";

const FIELD_LABELS: Record<CompanyInfoKey, { label: string; hint?: string; type?: "text" | "textarea" }> = {
  COMPANY_NAME: { label: "Tên công ty đầy đủ" },
  COMPANY_SHORT_NAME: { label: "Tên ngắn (hiển thị logo)" },
  COMPANY_TAGLINE: { label: "Slogan" },
  COMPANY_TAX_CODE: { label: "Mã số thuế (MST)" },
  COMPANY_LICENSE: { label: "Giấy phép lữ hành quốc tế (GPLHQT)" },
  COMPANY_ADDRESS: { label: "Địa chỉ trụ sở", type: "textarea" },
  COMPANY_ADDRESS2: { label: "Địa chỉ văn phòng phụ", type: "textarea" },
  COMPANY_PHONE: { label: "Số điện thoại" },
  COMPANY_EMAIL: { label: "Email công ty" },
  COMPANY_WEBSITE: { label: "Website" },
  COMPANY_LOGO_URL: { label: "URL logo (tự cập nhật khi upload)" },
  COMPANY_BANK_1: { label: "Ngân hàng 1", hint: "Định dạng: TênNH|Chủ TK|Số TK" },
  COMPANY_BANK_2: { label: "Ngân hàng 2", hint: "Định dạng: TênNH|Chủ TK|Số TK" },
};

export function SettingsCompanyInfoTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useCompanyInfo();
  const [form, setForm] = useState<CompanyInfo | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (data) setForm({ ...data });
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (values: CompanyInfo) => {
      const rows = COMPANY_INFO_KEYS.map((key) => ({
        key,
        value: values[key] ?? "",
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase
        .from("system_config")
        .upsert(rows, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Đã lưu thông tin công ty");
      qc.invalidateQueries({ queryKey: ["company-info"] });
    },
    onError: (e: any) => toast.error(e?.message || "Không lưu được"),
  });

  const handleUploadLogo = async (file: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("company-assets")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("company-assets").getPublicUrl(path);
      setForm((f) => (f ? { ...f, COMPANY_LOGO_URL: pub.publicUrl } : f));
      toast.success("Đã upload logo. Nhấn 'Lưu' để áp dụng.");
    } catch (e: any) {
      toast.error(e?.message || "Upload thất bại");
    } finally {
      setUploading(false);
    }
  };

  if (isLoading || !form) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Building2 className="h-5 w-5 text-primary mt-0.5" />
        <div>
          <h3 className="text-base font-semibold text-foreground">Thông tin công ty</h3>
          <p className="text-sm text-muted-foreground">
            Thông tin này được dùng cho phiếu xác nhận booking, phiếu thu/chi và các tài liệu in từ hệ thống.
            Chỉ Admin / Super Admin mới chỉnh sửa được.
          </p>
        </div>
      </div>

      {/* Logo upload */}
      <div className="rounded-md border bg-card p-4 space-y-3">
        <Label className="text-sm font-semibold">Logo công ty</Label>
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-md border bg-muted/30 flex items-center justify-center overflow-hidden">
            {form.COMPANY_LOGO_URL ? (
              <img src={form.COMPANY_LOGO_URL} alt="logo" className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="text-xs text-muted-foreground">Chưa có</span>
            )}
          </div>
          <div className="flex-1 space-y-2">
            <Input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUploadLogo(f);
              }}
            />
            <p className="text-xs text-muted-foreground">
              Khuyến nghị: PNG nền trong suốt, kích thước ~200×200px.
            </p>
          </div>
          {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
        </div>
      </div>

      {/* Form fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {COMPANY_INFO_KEYS.filter((k) => k !== "COMPANY_LOGO_URL").map((k) => {
          const cfg = FIELD_LABELS[k];
          return (
            <div key={k} className={cfg.type === "textarea" ? "md:col-span-2 space-y-1.5" : "space-y-1.5"}>
              <Label htmlFor={k} className="text-sm">{cfg.label}</Label>
              {cfg.type === "textarea" ? (
                <Textarea
                  id={k}
                  value={form[k]}
                  onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                  rows={2}
                />
              ) : (
                <Input
                  id={k}
                  value={form[k]}
                  onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                />
              )}
              {cfg.hint && <p className="text-xs text-muted-foreground">{cfg.hint}</p>}
            </div>
          );
        })}
      </div>

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => data && setForm({ ...data })}
          disabled={saveMutation.isPending}
        >
          Hoàn tác
        </Button>
        <Button
          onClick={() => form && saveMutation.mutate(form)}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Lưu thông tin
        </Button>
      </div>
    </div>
  );
}
