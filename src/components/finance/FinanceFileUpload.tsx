import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, X, FileText, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  urls: string[];
  onChange: (urls: string[]) => void;
  folder: string; // e.g. estimateId or settlementId
  maxFiles?: number;
  accept?: string;
  disabled?: boolean;
}

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const BUCKET = "finance-receipts";

const isImage = (url: string) => /\.(jpe?g|png|webp|gif|bmp)(\?|$)/i.test(url);
const isPdf = (url: string) => /\.pdf(\?|$)/i.test(url);

export function FinanceFileUpload({
  urls,
  onChange,
  folder,
  maxFiles = 10,
  accept = "image/*,.pdf",
  disabled = false,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [signedMap, setSignedMap] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const getSignedUrl = async (path: string) => {
    if (signedMap[path]) return signedMap[path];
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
    if (data?.signedUrl) {
      setSignedMap((m) => ({ ...m, [path]: data.signedUrl }));
      return data.signedUrl;
    }
    return "";
  };

  const handleFiles = async (files: FileList | File[]) => {
    if (disabled) return;
    const arr = Array.from(files);
    if (urls.length + arr.length > maxFiles) {
      toast.error(`Tối đa ${maxFiles} file`);
      return;
    }
    setUploading(true);
    const uploaded: string[] = [];
    try {
      for (const file of arr) {
        if (file.size > MAX_SIZE) {
          toast.error(`${file.name}: vượt quá 5MB`);
          continue;
        }
        const ext = file.name.split(".").pop() || "bin";
        const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const path = `${folder}/${safeName}`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });
        if (error) {
          toast.error(`Lỗi upload ${file.name}: ${error.message}`);
          continue;
        }
        uploaded.push(path);
      }
      if (uploaded.length > 0) {
        onChange([...urls, ...uploaded]);
        toast.success(`Đã tải lên ${uploaded.length} file`);
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeFile = async (path: string) => {
    if (disabled) return;
    await supabase.storage.from(BUCKET).remove([path]);
    onChange(urls.filter((u) => u !== path));
  };

  return (
    <div className="space-y-2">
      {!disabled && urls.length < maxFiles && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-md p-3 text-center cursor-pointer transition-colors text-xs",
            dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50"
          )}
        >
          {uploading ? (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Đang tải...
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Upload className="h-4 w-4" /> Kéo thả file hoặc click để chọn ({urls.length}/{maxFiles})
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={accept}
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
        </div>
      )}

      {urls.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {urls.map((path) => (
            <FilePreview
              key={path}
              path={path}
              onRemove={() => removeFile(path)}
              getSignedUrl={getSignedUrl}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FilePreview({
  path,
  onRemove,
  getSignedUrl,
  disabled,
}: {
  path: string;
  onRemove: () => void;
  getSignedUrl: (p: string) => Promise<string>;
  disabled: boolean;
}) {
  const [src, setSrc] = useState<string>("");
  const fileName = path.split("/").pop() || path;

  const open = async () => {
    const url = await getSignedUrl(path);
    if (url) window.open(url, "_blank");
  };

  // Lazy load thumbnail for images
  if (isImage(path) && !src) {
    getSignedUrl(path).then(setSrc);
  }

  return (
    <div className="relative group border rounded-md overflow-hidden bg-muted/30" style={{ width: 70 }}>
      <button
        type="button"
        onClick={open}
        className="block w-full"
        title={fileName}
      >
        {isImage(path) ? (
          src ? (
            <img src={src} alt={fileName} className="w-[70px] h-[60px] object-cover" />
          ) : (
            <div className="w-[70px] h-[60px] flex items-center justify-center">
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
            </div>
          )
        ) : isPdf(path) ? (
          <div className="w-[70px] h-[60px] flex flex-col items-center justify-center text-[9px] text-muted-foreground p-1">
            <FileText className="h-5 w-5 text-red-500" />
            <span className="truncate w-full text-center">PDF</span>
          </div>
        ) : (
          <div className="w-[70px] h-[60px] flex items-center justify-center">
            <FileText className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
      </button>
      {!disabled && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-bl-md p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
