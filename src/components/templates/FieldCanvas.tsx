import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUp, ArrowDown, Trash2, Copy, Heading, CheckSquare, Gauge, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { FIELD_TYPE_META } from "./FieldPalette";

export interface TemplateField {
  id?: string;
  field_type: string;
  field_key: string;
  label: string;
  unit: string;
  help_text: string;
  is_required: boolean;
  default_value: any;
  options: any;
  sort_order: number;
}

interface Props {
  fields: TemplateField[];
  selectedIndex: number | null;
  onSelect: (index: number | null) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (index: number) => void;
  onDuplicate: (index: number) => void;
  onAddField: (type: string) => void;
}

function FieldPreview({ field }: { field: TemplateField }) {
  const { field_type, label, help_text, unit, options, is_required } = field;

  if (field_type === "section_header") {
    return (
      <div className="pt-2 pb-1">
        <h3 className="text-sm font-semibold text-foreground">{label || "Ny seksjon"}</h3>
        {help_text && <p className="text-[11px] text-muted-foreground mt-0.5">{help_text}</p>}
      </div>
    );
  }

  const labelEl = (
    <label className="text-xs font-medium text-foreground">
      {label || "(uten navn)"}{is_required && <span className="text-destructive ml-0.5">*</span>}
    </label>
  );

  switch (field_type) {
    case "text":
      return <div className="space-y-1">{labelEl}<Input disabled placeholder={help_text || "Tekst..."} className="h-8 text-xs bg-muted/30" /></div>;
    case "textarea":
      return <div className="space-y-1">{labelEl}<Textarea disabled placeholder={help_text || "Fritekst..."} rows={2} className="text-xs bg-muted/30 resize-none" /></div>;
    case "checkbox":
      return (
        <div className="flex items-start gap-2.5 py-0.5">
          <Checkbox disabled className="mt-0.5" />
          <div>
            {labelEl}
            {help_text && <p className="text-[10px] text-muted-foreground">{help_text}</p>}
          </div>
        </div>
      );
    case "checkbox_list": {
      const choices: string[] = options?.choices || ["Valg 1", "Valg 2"];
      return (
        <div className="space-y-1">
          {labelEl}
          <div className="space-y-1 pl-0.5">
            {choices.slice(0, 4).map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <Checkbox disabled />
                <span className="text-xs text-muted-foreground">{c}</span>
              </div>
            ))}
            {choices.length > 4 && <span className="text-[10px] text-muted-foreground">+ {choices.length - 4} til</span>}
          </div>
        </div>
      );
    }
    case "dropdown":
      return (
        <div className="space-y-1">
          {labelEl}
          <Select disabled>
            <SelectTrigger className="h-8 text-xs bg-muted/30"><SelectValue placeholder="Velg..." /></SelectTrigger>
            <SelectContent>{(options?.choices || []).map((c: string, i: number) => <SelectItem key={i} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      );
    case "number":
      return <div className="space-y-1">{labelEl}<Input disabled type="number" placeholder="0" className="h-8 text-xs bg-muted/30 w-32" /></div>;
    case "date":
      return <div className="space-y-1">{labelEl}<Input disabled type="date" className="h-8 text-xs bg-muted/30 w-44" /></div>;
    case "rating":
      return (
        <div className="space-y-1.5">
          {labelEl}
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(n => (
              <div key={n} className="h-8 w-8 rounded border border-border bg-muted/30 flex items-center justify-center text-xs text-muted-foreground">{n}</div>
            ))}
          </div>
        </div>
      );
    case "measurement":
      return (
        <div className="space-y-1">
          {labelEl}
          <div className="flex gap-2 items-center">
            <Input disabled placeholder="Verdi" className="h-8 text-xs bg-muted/30 w-24" />
            <span className="text-xs text-muted-foreground font-medium">{unit || "enhet"}</span>
          </div>
        </div>
      );
    case "file":
      return (
        <div className="space-y-1">
          {labelEl}
          <div className="h-16 border-2 border-dashed border-border rounded-md flex items-center justify-center text-xs text-muted-foreground bg-muted/20">
            Dra fil hit eller klikk for å laste opp
          </div>
        </div>
      );
    default:
      return <div className="space-y-1">{labelEl}<Input disabled className="h-8 text-xs bg-muted/30" /></div>;
  }
}

export default function FieldCanvas({ fields, selectedIndex, onSelect, onMove, onRemove, onDuplicate, onAddField }: Props) {
  if (fields.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Heading className="h-7 w-7 text-primary" />
        </div>
        <h3 className="text-base font-semibold mb-1">Tomt skjema</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm">
          Velg felttyper fra panelet til venstre, eller bruk hurtigknappene under for å komme i gang.
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          <Button variant="outline" size="sm" onClick={() => onAddField("section_header")}>
            <Heading className="h-3.5 w-3.5 mr-1.5" /> Legg til seksjon
          </Button>
          <Button variant="outline" size="sm" onClick={() => onAddField("checkbox")}>
            <CheckSquare className="h-3.5 w-3.5 mr-1.5" /> Legg til sjekkpunkt
          </Button>
          <Button variant="outline" size="sm" onClick={() => onAddField("measurement")}>
            <Gauge className="h-3.5 w-3.5 mr-1.5" /> Legg til målefelt
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {fields.map((field, index) => {
        const isSelected = selectedIndex === index;
        const isSection = field.field_type === "section_header";
        const meta = FIELD_TYPE_META[field.field_type];

        return (
          <div key={index}>
            {/* Section divider spacing */}
            {isSection && index > 0 && <div className="h-4" />}

            <div
              onClick={() => onSelect(isSelected ? null : index)}
              className={cn(
                "relative group rounded-md transition-all cursor-pointer",
                isSection ? "px-3 py-1" : "px-3 py-2.5",
                isSelected
                  ? "ring-2 ring-primary/50 bg-primary/5"
                  : "hover:bg-accent/30"
              )}
            >
              {/* Field type badge — shown on hover or select */}
              {!isSection && (
                <div className={cn(
                  "absolute -top-2 right-2 text-[9px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground transition-opacity",
                  isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}>
                  {meta?.label || field.field_type}
                </div>
              )}

              <FieldPreview field={field} />

              {/* Actions toolbar on selection */}
              {isSelected && (
                <div className="flex items-center gap-0.5 mt-2 pt-2 border-t border-border/50">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); onMove(index, -1); }} disabled={index === 0}>
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); onMove(index, 1); }} disabled={index === fields.length - 1}>
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); onDuplicate(index); }}>
                    <Copy className="h-3 w-3" />
                  </Button>
                  <div className="flex-1" />
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/70 hover:text-destructive" onClick={e => { e.stopPropagation(); onRemove(index); }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Add field at bottom */}
      <div className="pt-3 flex justify-center">
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => onAddField("checkbox")}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Legg til felt
        </Button>
      </div>
    </div>
  );
}
