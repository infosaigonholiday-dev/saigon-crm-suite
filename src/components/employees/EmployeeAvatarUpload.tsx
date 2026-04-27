import { useState, useRef, ChangeEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { EmployeeAvatar } from "./EmployeeAvatar";

interface Props {
  employeeId?: string; // nếu chưa có, lưu vào "tmp/{timestamp}.jpg"
  currentUrl?: string | null;
  fullName?: string;
  onChange: (url: string | null) => void;
}

// Resize ảnh client-side về max 200x200 dùng canvas, trả về Blob jpeg
async function resizeImage(file: File, max = 200): Promise<Blob> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });
  let { width, height } = img;
  if (width > height) {
    if (width > max) { height = Math.round((height * max) / width); width = max; }
  } else {
    if (height > max) { width = Math.round((width * max) / height); height = max; }
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, width, height);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(b => b ? resolve(b) : reject(new Error("Không thể tạo ảnh")), "image/jpeg", 0.85);
  });
}

export function EmployeeAvatarUpload({ employeeId, currentUrl, fullName, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn file ảnh");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File ảnh tối đa 10MB");
      return;
    }
    setUploading(true);
    try {
      const blob = await resizeImage(file, 200);
      const folder = employeeId ?? `tmp-${Date.now()}`;
      const path = `${folder}/avatar-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("employee-avatars")
        .upload(path, blob, { upsert: true, contentType: "image/jpeg", cacheControl: "3600" });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("employee-avatars").getPublicUrl(path);
      // Append cache-buster để hiện ngay
      const url = `${pub.publicUrl}?t=${Date.now()}`;
      onChange(url);
      toast.success("Tải ảnh thành công");
    } catch (err: any) {
      toast.error(err.message || "Lỗi tải ảnh");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-4">
      <EmployeeAvatar url={currentUrl} name={fullName} size={80} className="border-2 border-border" />
      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
          {currentUrl ? "Đổi ảnh" : "Tải ảnh chân dung"}
        </Button>
        {currentUrl && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => onChange(null)}
            disabled={uploading}
          >
            <X className="h-3.5 w-3.5 mr-1.5" /> Xóa ảnh
          </Button>
        )}
        <p className="text-[11px] text-muted-foreground">JPG/PNG, tự động thu nhỏ 200×200</p>
      </div>
    </div>
  );
}
