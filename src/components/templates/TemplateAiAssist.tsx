import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Wand2, LayoutList, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { TemplateField } from "./FieldCanvas";

interface Props {
  category: string;
  fields: TemplateField[];
  onApplyFields: (fields: TemplateField[], mode: "replace" | "merge") => void;
}

export default function TemplateAiAssist({ category, fields, onApplyFields }: Props) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [pendingFields, setPendingFields] = useState<TemplateField[] | null>(null);

  const generate = async (mode: "generate" | "improve" | "cleanup") => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("template-ai", {
        body: {
          prompt: prompt.trim() || undefined,
          category,
          mode,
          existingFields: mode !== "generate" ? fields : undefined,
        },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      const generated = data?.fields as TemplateField[];
      if (!generated || generated.length === 0) {
        toast.error("Ingen forslag ble generert");
        return;
      }

      // If canvas is empty, apply directly
      const hasContent = fields.filter(f => f.field_type !== "section_header").length > 0;
      if (!hasContent && mode === "generate") {
        onApplyFields(generated, "replace");
        toast.success(`${generated.length} felt generert`);
        setPendingFields(null);
      } else {
        setPendingFields(generated);
      }
    } catch (e: any) {
      console.error("AI assist error:", e);
      toast.error("Kunne ikke generere forslag. Prøv igjen.");
    } finally {
      setLoading(false);
    }
  };

  const applyPending = (mode: "replace" | "merge") => {
    if (!pendingFields) return;
    onApplyFields(pendingFields, mode);
    toast.success(mode === "replace"
      ? `${pendingFields.length} felt satt inn`
      : `${pendingFields.length} felt lagt til`
    );
    setPendingFields(null);
  };

  return (
    <div className="bg-gradient-to-r from-primary/5 to-primary/[0.02] border border-primary/15 rounded-lg">
      {/* Toggle header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-primary/5 transition-colors rounded-lg"
      >
        <Sparkles className="h-4 w-4 text-primary/70 shrink-0" />
        <span className="text-sm font-medium text-foreground flex-1">AI-assistent</span>
        <span className="text-[10px] text-muted-foreground/60">Generer utkast fra beskrivelse</span>
        {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          <Textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="Beskriv hva skjemaet skal dekke, f.eks: «Service på luft-vann med fokus på trykk, temperatur og filter»"
            rows={2}
            className="text-sm resize-none bg-background/80"
            disabled={loading}
          />

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="default"
              className="h-8 text-xs gap-1.5"
              onClick={() => generate("generate")}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
              Generer forslag
            </Button>
            {fields.length > 0 && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => generate("improve")}
                  disabled={loading}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Forbedre eksisterende
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => generate("cleanup")}
                  disabled={loading}
                >
                  <LayoutList className="h-3.5 w-3.5" />
                  Rydd opp struktur
                </Button>
              </>
            )}
          </div>

          {/* Pending confirmation */}
          {pendingFields && (
            <div className="bg-background border border-border rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium">
                {pendingFields.length} felt generert. Hva vil du gjøre?
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => applyPending("replace")}>
                  Erstatt alt
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => applyPending("merge")}>
                  Legg til
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setPendingFields(null)}>
                  Forkast
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {pendingFields.filter(f => f.field_type === "section_header").length} seksjoner,{" "}
                {pendingFields.filter(f => f.field_type !== "section_header").length} felt
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
