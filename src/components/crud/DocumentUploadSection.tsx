import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, ExternalLink, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DOCUMENT_CATEGORY_LABELS, formatDate } from "@/lib/domain-labels";
import type { Database } from "@/integrations/supabase/types";

type DocCategory = Database["public"]["Enums"]["document_category"];

interface DocumentUploadSectionProps {
  documents: any[] | undefined;
  /** Which entity this is for */
  entityType: "job" | "asset" | "warranty" | "agreement" | "service_visit" | "deal";
  entityId: string;
  /** react-query key to invalidate */
  queryKey: string[];
}

export function DocumentUploadSection({ documents, entityType, entityId, queryKey }: DocumentUploadSectionProps) {
  const { tenantId, user } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState<DocCategory>("other");

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!tenantId) throw new Error("Ingen tenant");
      setUploading(true);

      const filePath = `${tenantId}/${entityType}s/${entityId}/${Date.now()}_${file.name}`;

      const { error: storageErr } = await supabase.storage
        .from("tenant-documents")
        .upload(filePath, file, { upsert: false });
      if (storageErr) throw storageErr;

      const fkMap: Record<string, string> = { job: "job_id", asset: "asset_id", warranty: "warranty_case_id", agreement: "agreement_id", service_visit: "service_visit_id", deal: "deal_id" };
      const fkCol = fkMap[entityType];
      const docPayload: any = {
        tenant_id: tenantId,
        [fkCol]: entityId,
        category,
        file_name: file.name,
        file_path: filePath,
        file_size_bytes: file.size,
        mime_type: file.type || null,
        uploaded_by: user?.id || null,
      };
      const { error: dbErr } = await supabase.from("documents").insert(docPayload);
      if (dbErr) throw dbErr;
    },
    onSuccess: () => {
      toast.success("Dokument lastet opp");
      qc.invalidateQueries({ queryKey });
      setUploading(false);
    },
    onError: (e: any) => {
      toast.error(`Opplasting feilet: ${e.message}`);
      setUploading(false);
    },
  });

  const softDeleteMutation = useMutation({
    mutationFn: async (docId: string) => {
      const { error } = await supabase.from("documents").update({ deleted_at: new Date().toISOString() }).eq("id", docId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Dokument fjernet");
      qc.invalidateQueries({ queryKey });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
      e.target.value = "";
    }
  };

  const getPublicUrl = (filePath: string) => {
    const { data } = supabase.storage.from("tenant-documents").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const getSignedUrl = async (filePath: string) => {
    const { data, error } = await supabase.storage
      .from("tenant-documents")
      .createSignedUrl(filePath, 3600);
    if (error) {
      toast.error("Kunne ikke åpne fil");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="space-y-3">
      {/* Upload bar */}
      <div className="flex items-center gap-2">
        <Select value={category} onValueChange={v => setCategory(v as DocCategory)}>
          <SelectTrigger className="w-40 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(DOCUMENT_CATEGORY_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant="outline"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1" />}
          Last opp
        </Button>
        <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange} />
      </div>

      {/* Document list */}
      {!documents?.length ? (
        <div className="text-center py-10 text-sm text-muted-foreground">Ingen dokumenter</div>
      ) : (
        <div className="grid gap-2">
          {documents.map(d => (
            <Card key={d.id} className="p-3 flex items-center gap-3">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{d.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {DOCUMENT_CATEGORY_LABELS[d.category] || d.category}
                  {d.file_size_bytes && ` · ${(d.file_size_bytes / 1024).toFixed(0)} KB`}
                  {` · ${formatDate(d.created_at)}`}
                </p>
              </div>
              <Badge variant="outline" className="text-[10px] shrink-0">
                {d.mime_type?.split("/")[1] || "fil"}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => getSignedUrl(d.file_path)}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                onClick={() => softDeleteMutation.mutate(d.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
