import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, Wand2, LayoutList, Loader2, ChevronDown, ChevronUp,
  ClipboardCheck, Plus, ArrowRight, AlertTriangle, Info, CheckCircle2, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { TemplateField } from "./FieldCanvas";

interface ReviewSuggestion {
  type: "add_field" | "move_field" | "add_section" | "improve_label" | "remove_field" | "general";
  severity: "high" | "medium" | "low";
  message: string;
  field_type?: string;
  field_key?: string;
  label?: string;
  unit?: string;
  help_text?: string;
  target_section?: string;
  options?: { choices?: string[] };
}

interface ReviewResult {
  summary: string;
  suggestions: ReviewSuggestion[];
}

interface Props {
  category: string;
  fields: TemplateField[];
  onApplyFields: (fields: TemplateField[], mode: "replace" | "merge") => void;
  onAddSingleField?: (field: TemplateField) => void;
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").substring(0, 40);
}

const SEVERITY_CONFIG = {
  high: { icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10", label: "Viktig" },
  medium: { icon: Info, color: "text-amber-600", bg: "bg-amber-500/10", label: "Anbefalt" },
  low: { icon: Info, color: "text-muted-foreground", bg: "bg-muted", label: "Valgfritt" },
};

const TYPE_LABELS: Record<string, string> = {
  add_field: "Legg til felt",
  move_field: "Flytt felt",
  add_section: "Legg til seksjon",
  improve_label: "Forbedre label",
  remove_field: "Fjern felt",
  general: "Generelt",
};

export default function TemplateAiAssist({ category, fields, onApplyFields, onAddSingleField }: Props) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [pendingFields, setPendingFields] = useState<TemplateField[] | null>(null);
  const [review, setReview] = useState<ReviewResult | null>(null);
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<number>>(new Set());

  const generate = async (mode: "generate" | "improve" | "cleanup") => {
    setLoading(true);
    setReview(null);
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
      if (data?.error) { toast.error(data.error); return; }

      const generated = data?.fields as TemplateField[];
      if (!generated || generated.length === 0) { toast.error("Ingen forslag ble generert"); return; }

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

  const runReview = async () => {
    if (fields.filter(f => f.field_type !== "section_header").length === 0) {
      toast.error("Legg til noen felt først for å kjøre kvalitetssjekk");
      return;
    }
    setLoading(true);
    setPendingFields(null);
    setReview(null);
    setAppliedSuggestions(new Set());
    try {
      const { data, error } = await supabase.functions.invoke("template-ai", {
        body: { category, mode: "review", existingFields: fields },
      });

      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      if (data?.review) {
        setReview(data.review);
        toast.success("Kvalitetssjekk fullført");
      } else {
        toast.error("Ingen analyse generert");
      }
    } catch (e: any) {
      console.error("AI review error:", e);
      toast.error("Kunne ikke analysere skjema. Prøv igjen.");
    } finally {
      setLoading(false);
    }
  };

  const applySuggestion = (suggestion: ReviewSuggestion, index: number) => {
    if (suggestion.type === "add_field" && suggestion.label) {
      const newField: TemplateField = {
        field_type: suggestion.field_type || "text",
        field_key: suggestion.field_key || slugify(suggestion.label),
        label: suggestion.label,
        unit: suggestion.unit || "",
        help_text: suggestion.help_text || "",
        is_required: false,
        default_value: null,
        options: suggestion.options || null,
        sort_order: fields.length,
      };
      onApplyFields([newField], "merge");
      toast.success(`"${suggestion.label}" lagt til`);
    } else if (suggestion.type === "add_section" && suggestion.label) {
      const newField: TemplateField = {
        field_type: "section_header",
        field_key: slugify(suggestion.label),
        label: suggestion.label,
        unit: "",
        help_text: suggestion.help_text || "",
        is_required: false,
        default_value: null,
        options: null,
        sort_order: fields.length,
      };
      onApplyFields([newField], "merge");
      toast.success(`Seksjon "${suggestion.label}" lagt til`);
    }
    setAppliedSuggestions(prev => new Set(prev).add(index));
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

  const applyAllActionable = () => {
    if (!review) return;
    const toApply: TemplateField[] = [];
    const newApplied = new Set(appliedSuggestions);

    review.suggestions.forEach((s, i) => {
      if (newApplied.has(i)) return;
      if ((s.type === "add_field" || s.type === "add_section") && s.label) {
        toApply.push({
          field_type: s.type === "add_section" ? "section_header" : (s.field_type || "text"),
          field_key: s.field_key || slugify(s.label),
          label: s.label,
          unit: s.unit || "",
          help_text: s.help_text || "",
          is_required: false,
          default_value: null,
          options: s.options || null,
          sort_order: fields.length + toApply.length,
        });
        newApplied.add(i);
      }
    });

    if (toApply.length > 0) {
      onApplyFields(toApply, "merge");
      setAppliedSuggestions(newApplied);
      toast.success(`${toApply.length} forslag brukt`);
    } else {
      toast.info("Ingen flere forslag å bruke");
    }
  };

  return (
    <div className="bg-gradient-to-r from-primary/5 to-primary/[0.02] border border-primary/15 rounded-lg">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-primary/5 transition-colors rounded-lg"
      >
        <Sparkles className="h-4 w-4 text-primary/70 shrink-0" />
        <span className="text-sm font-medium text-foreground flex-1">AI-assistent</span>
        <span className="text-[10px] text-muted-foreground/60">Generer, forbedre eller kvalitetssjekk</span>
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
            <Button size="sm" variant="default" className="h-8 text-xs gap-1.5" onClick={() => generate("generate")} disabled={loading}>
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
              Generer forslag
            </Button>
            {fields.length > 0 && (
              <>
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => generate("improve")} disabled={loading}>
                  <Sparkles className="h-3.5 w-3.5" /> Forbedre
                </Button>
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => generate("cleanup")} disabled={loading}>
                  <LayoutList className="h-3.5 w-3.5" /> Rydd opp
                </Button>
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10" onClick={runReview} disabled={loading}>
                  {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ClipboardCheck className="h-3.5 w-3.5" />}
                  Kvalitetssjekk
                </Button>
              </>
            )}
          </div>

          {/* Pending generate confirmation */}
          {pendingFields && (
            <div className="bg-background border border-border rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium">{pendingFields.length} felt generert. Hva vil du gjøre?</p>
              <div className="flex gap-2">
                <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => applyPending("replace")}>Erstatt alt</Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => applyPending("merge")}>Legg til</Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setPendingFields(null)}>Forkast</Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {pendingFields.filter(f => f.field_type === "section_header").length} seksjoner,{" "}
                {pendingFields.filter(f => f.field_type !== "section_header").length} felt
              </p>
            </div>
          )}

          {/* Review results */}
          {review && (
            <div className="bg-background border border-border rounded-lg overflow-hidden">
              {/* Summary */}
              <div className="p-3 border-b border-border bg-muted/30 flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold flex items-center gap-1.5">
                    <ClipboardCheck className="h-3.5 w-3.5 text-primary" /> Kvalitetssjekk
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{review.summary}</p>
                </div>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0" onClick={() => setReview(null)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>

              {/* Actions bar */}
              {review.suggestions.some(s => (s.type === "add_field" || s.type === "add_section") && !appliedSuggestions.has(review.suggestions.indexOf(s))) && (
                <div className="px-3 py-2 border-b border-border bg-primary/5">
                  <Button size="sm" variant="default" className="h-7 text-xs gap-1.5" onClick={applyAllActionable}>
                    <Plus className="h-3 w-3" /> Bruk alle felt-forslag
                  </Button>
                </div>
              )}

              {/* Suggestion list */}
              <div className="divide-y divide-border max-h-80 overflow-y-auto">
                {review.suggestions.map((s, i) => {
                  const applied = appliedSuggestions.has(i);
                  const config = SEVERITY_CONFIG[s.severity];
                  const SevIcon = config.icon;
                  const canApply = (s.type === "add_field" || s.type === "add_section") && s.label && !applied;

                  return (
                    <div key={i} className={`px-3 py-2.5 flex items-start gap-2.5 ${applied ? "opacity-50" : ""}`}>
                      <SevIcon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${config.color}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Badge variant="outline" className={`text-[9px] h-4 px-1 ${config.bg} ${config.color} border-0`}>
                            {config.label}
                          </Badge>
                          <Badge variant="outline" className="text-[9px] h-4 px-1">
                            {TYPE_LABELS[s.type] || s.type}
                          </Badge>
                        </div>
                        <p className="text-xs text-foreground">{s.message}</p>
                        {s.label && s.type === "add_field" && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {s.field_type || "text"} • {s.label}{s.unit ? ` (${s.unit})` : ""}
                            {s.target_section ? ` → ${s.target_section}` : ""}
                          </p>
                        )}
                      </div>
                      {canApply && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-[10px] gap-1 shrink-0"
                          onClick={() => applySuggestion(s, i)}
                        >
                          <Plus className="h-3 w-3" /> Legg til
                        </Button>
                      )}
                      {applied && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
