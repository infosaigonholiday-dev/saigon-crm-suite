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

// Resize ảnh client-side về 128x128 (đủ cho display 64px @2x retina), thử WebP trước, fallback JPEG.
// Mục tiêu: file < 8KB để tải nhanh, không ảnh hưởng tốc độ load app.
async function resizeImage(file: File, max = 128): Promise<{ blob: Blob; ext: "webp" | "jpg"; mime: string }> {
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

  // Crop vuông từ giữa (chân dung tròn nên vuông là tối ưu)
  const srcSize = Math.min(img.width, img.height);
  const sx = (img.width - srcSize) / 2;
  const sy = (img.height - srcSize) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = max;
  canvas.height = max;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, srcSize, srcSize, 0, 0, max, max);

  // Thử WebP trước (nhỏ hơn JPEG ~30%)
  const tryEncode = (mime: string, quality: number) =>
    new Promise<Blob | null>(resolve => canvas.toBlob(b => resolve(b), mime, quality));

  const webp = await tryEncode("image/webp", 0.78);
  if (webp && webp.size > 0 && webp.type === "image/webp") {
    return { blob: webp, ext: "webp", mime: "image/webp" };
  }
  const jpg = await tryEncode("image/jpeg", 0.78);
  if (!jpg) throw new Error("Không thể tạo ảnh");
  return { blob: jpg, ext: "jpg", mime: "image/jpeg" };
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
