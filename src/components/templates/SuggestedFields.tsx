import { Plus, Sparkles } from "lucide-react";
import { getSuggestedFields, type PresetField } from "@/lib/template-presets";
import { FIELD_TYPE_META } from "./FieldPalette";
import { Button } from "@/components/ui/button";

interface Props {
  category: string;
  existingLabels: string[];
  onAddSuggested: (field: PresetField) => void;
  onApplyFullPreset: () => void;
  hasContent: boolean;
}

export default function SuggestedFields({ category, existingLabels, onAddSuggested, onApplyFullPreset, hasContent }: Props) {
  const suggestions = getSuggestedFields(category, existingLabels);

  if (suggestions.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <Sparkles className="h-3.5 w-3.5 text-primary/60" />
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Vanlige felt
        </p>
      </div>

      {hasContent && (
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs h-8 border-dashed text-primary/70 hover:text-primary"
          onClick={onApplyFullPreset}
        >
          <Sparkles className="h-3 w-3 mr-1.5" />
          Sett inn alle anbefalte felt
        </Button>
      )}

      <div className="space-y-0.5">
        {suggestions.map((sf, i) => {
          const meta = FIELD_TYPE_META[sf.field_type];
          return (
            <button
              key={i}
              onClick={() => onAddSuggested(sf)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left hover:bg-primary/5 transition-colors group"
            >
              <div className="h-6 w-6 rounded bg-muted/50 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                {meta ? <meta.icon className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" /> : <Plus className="h-3 w-3 text-muted-foreground" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium leading-tight truncate">{sf.label}</p>
                <p className="text-[9px] text-muted-foreground/50 leading-tight truncate">
                  {sf.section} · {meta?.label || sf.field_type}
                </p>
              </div>
              <Plus className="h-3 w-3 text-muted-foreground/30 group-hover:text-primary shrink-0 transition-colors" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
