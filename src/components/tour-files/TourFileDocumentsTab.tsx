import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Upload, FileText, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { DOCUMENT_TYPES, DOCUMENT_TYPE_LABEL, CRITICAL_DOC_TYPES, type DocumentType } from "@/lib/tourFileWorkflow";

export default function TourFileDocumentsTab({ tourFileId }: { tourFileId: string }) {
  const qc = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadType, setUploadType] = useState<DocumentType>("program");
  const [file, setFile] = useState<File | null>(null);
  const [docName, setDocName] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data: docs, isLoading } = useQuery({
    queryKey: ["tour_documents", tourFileId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("tour_documents")
        .select("*, uploader:uploaded_by ( full_name )")
        .eq("tour_file_id", tourFileId)
        .order("uploaded_at", { ascending: false });
      return data || [];
    },
  });

  const currentByType: Record<string, any[]> = {};
  (docs || []).forEach((d: any) => {
    if (!currentByType[d.document_type]) currentByType[d.document_type] = [];
    currentByType[d.document_type].push(d);
  });

  const missingCritical = CRITICAL_DOC_TYPES.filter(
    (t) => !(currentByType[t] || []).some((d: any) => d.is_current_version),
  );

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const path = `${tourFileId}/${uploadType}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from("tour-files").upload(path, file);
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage.from("tour-files").createSignedUrl(path, 60 * 60 * 24 * 365);
      const url = signed?.signedUrl || path;
      const { error } = await (supabase as any).from("tour_documents").insert({
        tour_file_id: tourFileId,
        document_type: uploadType,
        document_name: docName || file.name,
        file_url: url,
        file_mime_type: file.type,
      });
      if (error) throw error;
      toast.success("Đã upload tài liệu");
      qc.invalidateQueries({ queryKey: ["tour_documents", tourFileId] });
      setUploadOpen(false);
      setFile(null); setDocName("");
    } catch (e: any) {
      toast.error(e.message);
    } finally { setUploading(false); }
  };

  return (
    <div className="space-y-3">
      {missingCritical.length > 0 && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-3 flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-destructive">Thiếu tài liệu quan trọng</p>
              <p className="text-muted-foreground">
                Chưa có: {missingCritical.map((t) => DOCUMENT_TYPE_LABEL[t]).join(", ")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={() => setUploadOpen(true)}><Upload className="h-4 w-4 mr-1" /> Upload tài liệu</Button>
      </div>

      {isLoading ? (
        <div className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {DOCUMENT_TYPES.map((t) => {
            const list = currentByType[t] || [];
            if (list.length === 0) return null;
            const current = list.find((d: any) => d.is_current_version) || list[0];
            return (
              <Card key={t}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">{DOCUMENT_TYPE_LABEL[t]}</span>
                    </div>
                    <Badge variant="outline">v{current.version_no}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {current.document_name} · {current.uploader?.full_name || "—"} · {format(new Date(current.uploaded_at), "dd/MM/yyyy HH:mm")}
                  </div>
                  <div className="flex gap-2">
                    <a href={current.file_url} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="outline">Xem</Button>
                    </a>
                    {list.length > 1 && (
                      <span className="text-xs text-muted-foreground self-center">+{list.length - 1} version cũ</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {(docs || []).length === 0 && (
            <Card><CardContent className="p-6 text-center text-muted-foreground text-sm col-span-2">
              Chưa có tài liệu nào.
            </CardContent></Card>
          )}
        </div>
      )}

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upload tài liệu</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Loại tài liệu *</Label>
              <Select value={uploadType} onValueChange={(v) => setUploadType(v as DocumentType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{DOCUMENT_TYPE_LABEL[t]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tên hiển thị</Label>
              <Input value={docName} onChange={(e) => setDocName(e.target.value)} placeholder="(tự lấy theo tên file)" />
            </div>
            <div>
              <Label>File *</Label>
              <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Huỷ</Button>
            <Button onClick={handleUpload} disabled={!file || uploading}>
              {uploading ? "Đang upload..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
