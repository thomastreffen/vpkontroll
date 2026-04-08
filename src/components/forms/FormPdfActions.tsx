import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, Download, Eye } from "lucide-react";
import { toast } from "sonner";
import { generateFormPdf, type PdfContext, type SignoffData } from "@/lib/form-pdf";
import type { TemplateField } from "@/components/service/DynamicFormRenderer";

export type DocumentEntityType = "service_visit" | "job" | "deal";

interface FormPdfActionsProps {
  fields: TemplateField[];
  values: Record<string, any>;
  context: PdfContext;
  signoff?: SignoffData | null;
  /** Entity to attach document to */
  entityType: DocumentEntityType;
  entityId: string;
  /** Category label for the document */
  categoryLabel: string;
  /** react-query key to invalidate after upload */
  queryKey?: string[];
  /** Existing PDF document if any */
  existingPdf?: { id: string; file_path: string } | null;
  onPdfGenerated?: () => void;
}

export function FormPdfActions({
  fields,
  values,
  context,
  signoff,
  entityType,
  entityId,
  categoryLabel,
  existingPdf,
  onPdfGenerated,
}: FormPdfActionsProps) {
  const { tenantId, user } = useAuth();
  const [generating, setGenerating] = useState(false);

  const generateAndUpload = async () => {
    if (!tenantId) return;
    setGenerating(true);
    try {
      const blob = generateFormPdf(fields, values, context, signoff);
      const fileName = `${context.title.replace(/[^a-zA-Z0-9æøåÆØÅ ]/g, "").replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`;
      const filePath = `${tenantId}/${entityType}s/${entityId}/${Date.now()}_${fileName}`;

      // Upload to storage
      const { error: storageErr } = await supabase.storage
        .from("tenant-documents")
        .upload(filePath, blob, { upsert: false, contentType: "application/pdf" });
      if (storageErr) throw storageErr;

      // Create document record
      const fkMap: Record<string, string> = {
        service_visit: "service_visit_id",
        job: "job_id",
        deal: "deal_id",
      };
      const fkCol = fkMap[entityType];
      const docPayload: any = {
        tenant_id: tenantId,
        [fkCol]: entityId,
        category: "report",
        file_name: fileName,
        file_path: filePath,
        file_size_bytes: blob.size,
        mime_type: "application/pdf",
        uploaded_by: user?.id || null,
        description: categoryLabel,
      };
      const { error: dbErr } = await supabase.from("documents").insert(docPayload);
      if (dbErr) throw dbErr;

      toast.success("PDF generert og lagret som dokument");
      onPdfGenerated?.();
    } catch (e: any) {
      toast.error(`PDF-generering feilet: ${e.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const viewExistingPdf = async () => {
    if (!existingPdf) return;
    const { data, error } = await supabase.storage
      .from("tenant-documents")
      .createSignedUrl(existingPdf.file_path, 3600);
    if (error) {
      toast.error("Kunne ikke åpne PDF");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button
        variant="outline"
        size="sm"
        onClick={generateAndUpload}
        disabled={generating}
        className="gap-1.5"
      >
        {generating ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Download className="h-3.5 w-3.5" />
        )}
        {existingPdf ? "Generer ny PDF" : "Generer PDF"}
      </Button>
      {existingPdf && (
        <Button
          variant="ghost"
          size="sm"
          onClick={viewExistingPdf}
          className="gap-1.5"
        >
          <Eye className="h-3.5 w-3.5" />Se PDF
        </Button>
      )}
      {existingPdf && (
        <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 gap-1">
          <FileText className="h-2.5 w-2.5" />PDF
        </Badge>
      )}
    </div>
  );
}
