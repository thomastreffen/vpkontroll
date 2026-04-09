import { useState, useRef, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUp, ArrowDown, Trash2, Copy, Plus, GripVertical, X, ClipboardPaste } from "lucide-react";
import { cn } from "@/lib/utils";
import { FIELD_TYPE_META } from "./FieldPalette";
import { toast } from "sonner";

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

export interface Section {
  sectionIndex: number;
  section: TemplateField;
  fields: { field: TemplateField; globalIndex: number }[];
}

export function groupIntoSections(fields: TemplateField[]): Section[] {
  const sections: Section[] = [];
  let current: Section | null = null;

  fields.forEach((f, i) => {
    if (f.field_type === "section_header") {
      current = { sectionIndex: i, section: f, fields: [] };
      sections.push(current);
    } else {
      if (!current) {
        const implicit: TemplateField = {
          field_type: "section_header", field_key: "general", label: "Generelt",
          unit: "", help_text: "", is_required: false, default_value: null,
          options: null, sort_order: -1,
        };
        current = { sectionIndex: -1, section: implicit, fields: [] };
        sections.push(current);
      }
      current.fields.push({ field: f, globalIndex: i });
    }
  });

  return sections;
}

interface Props {
  fields: TemplateField[];
  selectedIndex: number | null;
  onSelect: (index: number | null) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (index: number) => void;
  onDuplicate: (index: number) => void;
  onAddField: (type: string) => void;
  onInsertAt: (type: string, afterIndex: number) => void;
  onUpdateField?: (index: number, updates: Partial<TemplateField>) => void;
  previewMode?: boolean;
}

/* ── Inline options editor for dropdown/checkbox_list ── */
function InlineOptionsEditor({
  options,
  onChange,
  fieldType,
}: {
  options: any;
  onChange: (opts: any) => void;
  fieldType: string;
}) {
  const choices: string[] = options?.choices || [];
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const updateChoice = (i: number, val: string) => {
    const updated = [...choices];
    updated[i] = val;
    onChange({ ...options, choices: updated });
  };

  const addChoice = () => {
    const updated = [...choices, ""];
    onChange({ ...options, choices: updated });
    setTimeout(() => inputRefs.current[updated.length - 1]?.focus(), 50);
  };

  const removeChoice = (i: number) => {
    onChange({ ...options, choices: choices.filter((_, idx) => idx !== i) });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, i: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (i === choices.length - 1) {
        addChoice();
      } else {
        inputRefs.current[i + 1]?.focus();
      }
    } else if (e.key === "Backspace" && choices[i] === "" && choices.length > 1) {
      e.preventDefault();
      removeChoice(i);
      setTimeout(() => inputRefs.current[Math.max(0, i - 1)]?.focus(), 50);
    }
  };

  const handlePaste = () => {
    navigator.clipboard.readText().then(text => {
      const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
      if (lines.length > 0) {
        const merged = [...choices.filter(c => c.trim()), ...lines];
        onChange({ ...options, choices: merged });
        toast.success(`${lines.length} alternativ(er) limt inn`);
      }
    }).catch(() => toast.error("Kunne ikke lese utklippstavlen"));
  };

  return (
    <div className="mt-2 ml-1 space-y-1">
      {choices.map((c, i) => (
        <div key={i} className="flex items-center gap-1.5 group/opt">
          {fieldType === "checkbox_list" ? (
            <Checkbox disabled className="shrink-0" />
          ) : (
            <div className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/30 shrink-0" />
          )}
          <input
            ref={el => { inputRefs.current[i] = el; }}
            value={c}
            onChange={e => updateChoice(i, e.target.value)}
            onKeyDown={e => handleKeyDown(e, i)}
            placeholder={`Alternativ ${i + 1}`}
            className="flex-1 text-xs bg-transparent border-0 border-b border-transparent focus:border-primary/40 outline-none py-0.5 px-0.5 placeholder:text-muted-foreground/40"
          />
          <button
            onClick={e => { e.stopPropagation(); removeChoice(i); }}
            className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground/40 hover:text-destructive opacity-0 group-hover/opt:opacity-100 transition-opacity"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2 pt-0.5">
        <button
          onClick={e => { e.stopPropagation(); addChoice(); }}
          className="text-[10px] text-primary/70 hover:text-primary font-medium flex items-center gap-1"
        >
          <Plus className="h-3 w-3" /> Legg til alternativ
        </button>
        <button
          onClick={e => { e.stopPropagation(); handlePaste(); }}
          className="text-[10px] text-muted-foreground hover:text-foreground font-medium flex items-center gap-1"
        >
          <ClipboardPaste className="h-3 w-3" /> Lim inn flere
        </button>
      </div>
    </div>
  );
}

/* ── Preview content for each field type ── */
function FieldPreviewContent({
  field,
  isSelected,
  onUpdateField,
}: {
  field: TemplateField;
  isSelected?: boolean;
  onUpdateField?: (updates: Partial<TemplateField>) => void;
}) {
  const { field_type, label, help_text, unit, options, is_required } = field;
  const hasOptions = field_type === "dropdown" || field_type === "checkbox_list";

  const labelEl = isSelected && onUpdateField ? (
    <input
      value={label}
      onChange={e => onUpdateField({ label: e.target.value })}
      placeholder="Skriv spørsmål / label..."
      className="text-xs font-medium text-foreground bg-transparent border-0 border-b border-primary/30 outline-none w-full py-0.5"
      onClick={e => e.stopPropagation()}
    />
  ) : (
    <label className="text-xs font-medium text-foreground">
      {label || <span className="text-muted-foreground/50 italic">Klikk for å gi feltet et navn</span>}
      {is_required && <span className="text-destructive ml-0.5">*</span>}
    </label>
  );

  const optionsEditor = hasOptions && isSelected && onUpdateField ? (
    <InlineOptionsEditor
      options={options}
      onChange={opts => onUpdateField({ options: opts })}
      fieldType={field_type}
    />
  ) : null;

  switch (field_type) {
    case "text":
      return <div className="space-y-1">{labelEl}<Input disabled placeholder={help_text || "Kort tekst..."} className="h-8 text-xs bg-muted/30" /></div>;
    case "textarea":
      return <div className="space-y-1">{labelEl}<Textarea disabled placeholder={help_text || "Fritekst..."} rows={2} className="text-xs bg-muted/30 resize-none" /></div>;
    case "checkbox":
      return (
        <div className="flex items-start gap-2.5 py-0.5">
          <Checkbox disabled className="mt-0.5" />
          <div className="flex-1">
            {labelEl}
            {help_text && <p className="text-[10px] text-muted-foreground">{help_text}</p>}
          </div>
        </div>
      );
    case "checkbox_list": {
      const choices: string[] = options?.choices || [];
      return (
        <div className="space-y-1">
          {labelEl}
          {isSelected && onUpdateField ? (
            optionsEditor
          ) : (
            <div className="space-y-1 pl-0.5 mt-1">
              {choices.length === 0 ? (
                <p className="text-[10px] text-muted-foreground/50 italic">Ingen alternativer ennå</p>
              ) : (
                <>
                  {choices.slice(0, 4).map((c, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Checkbox disabled />
                      <span className="text-xs text-muted-foreground">{c || `Alternativ ${i + 1}`}</span>
                    </div>
                  ))}
                  {choices.length > 4 && <span className="text-[10px] text-muted-foreground">+ {choices.length - 4} til</span>}
                </>
              )}
            </div>
          )}
        </div>
      );
    }
    case "dropdown": {
      const choices: string[] = options?.choices || [];
      return (
        <div className="space-y-1">
          {labelEl}
          {isSelected && onUpdateField ? (
            optionsEditor
          ) : (
            <Select disabled>
              <SelectTrigger className="h-8 text-xs bg-muted/30">
                <SelectValue placeholder={choices.length > 0 ? choices[0] : "Velg..."} />
              </SelectTrigger>
            </Select>
          )}
        </div>
      );
    }
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
          <div className="h-14 border-2 border-dashed border-border rounded-md flex items-center justify-center text-xs text-muted-foreground bg-muted/20">
            Dra fil hit eller klikk for å laste opp
          </div>
        </div>
      );
    default:
      return <div className="space-y-1">{labelEl}<Input disabled className="h-8 text-xs bg-muted/30" /></div>;
  }
}

function FieldToolbar({ index, total, onMove, onDuplicate, onRemove }: {
  index: number; total: number;
  onMove: (i: number, d: -1 | 1) => void;
  onDuplicate: (i: number) => void;
  onRemove: (i: number) => void;
}) {
  return (
    <div className="absolute -top-3 right-1 flex items-center gap-0.5 bg-card border border-border rounded-md shadow-sm px-0.5 py-0.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); onMove(index, -1); }} disabled={index === 0}>
        <ArrowUp className="h-3 w-3" />
      </Button>
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); onMove(index, 1); }} disabled={index >= total - 1}>
        <ArrowDown className="h-3 w-3" />
      </Button>
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); onDuplicate(index); }}>
        <Copy className="h-3 w-3" />
      </Button>
      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive/70 hover:text-destructive" onClick={e => { e.stopPropagation(); onRemove(index); }}>
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}

export default function FieldCanvas({
  fields, selectedIndex, onSelect, onMove, onRemove, onDuplicate,
  onAddField, onInsertAt, onUpdateField, previewMode = false,
}: Props) {
  const sections = groupIntoSections(fields);

  if (fields.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <GripVertical className="h-7 w-7 text-primary" />
        </div>
        <h3 className="text-base font-semibold mb-1">Tomt skjema</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm">
          Velg bruksområde ovenfor for å starte med foreslått struktur, eller legg til felt manuelt.
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          <Button variant="outline" size="sm" onClick={() => onAddField("section_header")}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Legg til seksjon
          </Button>
          <Button variant="outline" size="sm" onClick={() => onAddField("checkbox")}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Ja / nei
          </Button>
          <Button variant="outline" size="sm" onClick={() => onAddField("measurement")}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Måling
          </Button>
          <Button variant="outline" size="sm" onClick={() => onAddField("checkbox_list")}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Flere valg
          </Button>
        </div>
      </div>
    );
  }

  if (previewMode) {
    return (
      <div className="space-y-6">
        {sections.map((sec, si) => (
          <div key={si} className="space-y-3">
            <div className="border-b border-border pb-1.5">
              <h3 className="text-sm font-semibold text-foreground">{sec.section.label || "Seksjon"}</h3>
              {sec.section.help_text && <p className="text-xs text-muted-foreground">{sec.section.help_text}</p>}
            </div>
            <div className="space-y-3 pl-0.5">
              {sec.fields.map(({ field, globalIndex }) => (
                <FieldPreviewContent key={globalIndex} field={field} />
              ))}
              {sec.fields.length === 0 && (
                <p className="text-xs text-muted-foreground italic py-2">Ingen felt i denne seksjonen</p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const handleRemoveSection = (sectionGlobalIndex: number, sectionFields: { globalIndex: number }[]) => {
    onRemove(sectionGlobalIndex);
    if (sectionFields.length > 0) {
      toast.info("Feltene ble beholdt og flyttet");
    }
  };

  return (
    <div className="space-y-5">
      {sections.map((sec, si) => {
        const isSectionSelected = selectedIndex === sec.sectionIndex;

        return (
          <div key={si}>
            {si > 0 && (
              <div className="flex justify-center py-1.5 mb-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[10px] text-muted-foreground h-6 px-2"
                  onClick={() => onInsertAt("section_header", sec.sectionIndex)}
                >
                  <Plus className="h-3 w-3 mr-1" /> Seksjon
                </Button>
              </div>
            )}

            {/* Section container */}
            <div className={cn(
              "rounded-lg border transition-all",
              isSectionSelected
                ? "border-primary/50 ring-1 ring-primary/30"
                : "border-border"
            )}>
              {/* Section header - inline editable */}
              {sec.sectionIndex >= 0 && (
                <div
                  className={cn(
                    "group relative flex items-center gap-2 px-4 py-2.5 rounded-t-lg cursor-pointer transition-colors border-b",
                    isSectionSelected
                      ? "bg-primary/5 border-primary/20"
                      : "bg-muted/40 border-border hover:bg-muted/60"
                  )}
                  onClick={() => onSelect(isSectionSelected ? null : sec.sectionIndex)}
                >
                  <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                  <div className="flex-1 min-w-0">
                    {isSectionSelected && onUpdateField ? (
                      <input
                        value={sec.section.label}
                        onChange={e => onUpdateField(sec.sectionIndex, { label: e.target.value })}
                        placeholder="Seksjonsoverskrift..."
                        className="text-sm font-semibold text-foreground bg-transparent border-0 border-b border-primary/30 outline-none w-full"
                        onClick={e => e.stopPropagation()}
                        autoFocus
                      />
                    ) : (
                      <h3 className="text-sm font-semibold text-foreground truncate">
                        {sec.section.label || <span className="text-muted-foreground/50">Ny seksjon</span>}
                      </h3>
                    )}
                    {sec.section.help_text && !isSectionSelected && (
                      <p className="text-[10px] text-muted-foreground truncate">{sec.section.help_text}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {sec.fields.length} felt
                  </span>

                  {/* Section toolbar */}
                  <div className="absolute -top-3 right-1 flex items-center gap-0.5 bg-card border border-border rounded-md shadow-sm px-0.5 py-0.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); onMove(sec.sectionIndex, -1); }} disabled={sec.sectionIndex === 0}>
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); onMove(sec.sectionIndex, 1); }}>
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); onDuplicate(sec.sectionIndex); }}>
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      className="h-6 w-6 text-destructive/70 hover:text-destructive"
                      onClick={e => { e.stopPropagation(); handleRemoveSection(sec.sectionIndex, sec.fields); }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Fields inside section */}
              <div className="px-4 py-2 space-y-1">
                {sec.fields.map(({ field, globalIndex }) => {
                  const isSelected = selectedIndex === globalIndex;
                  const meta = FIELD_TYPE_META[field.field_type];

                  return (
                    <div
                      key={globalIndex}
                      onClick={() => onSelect(isSelected ? null : globalIndex)}
                      className={cn(
                        "relative group rounded-md transition-all cursor-pointer px-3 py-2.5",
                        isSelected
                          ? "ring-2 ring-primary/50 bg-primary/5"
                          : "hover:bg-accent/30"
                      )}
                    >
                      {/* Type badge */}
                      <div className={cn(
                        "absolute -top-2 right-2 text-[9px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground transition-opacity",
                        isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      )}>
                        {meta?.label || field.field_type}
                      </div>

                      <FieldPreviewContent
                        field={field}
                        isSelected={isSelected}
                        onUpdateField={onUpdateField ? (updates) => onUpdateField(globalIndex, updates) : undefined}
                      />

                      <FieldToolbar
                        index={globalIndex}
                        total={fields.length}
                        onMove={onMove}
                        onDuplicate={onDuplicate}
                        onRemove={onRemove}
                      />
                    </div>
                  );
                })}

                {sec.fields.length === 0 && (
                  <p className="text-xs text-muted-foreground italic py-3 text-center">
                    Ingen felt ennå — legg til fra paletten til venstre
                  </p>
                )}

                <div className="flex justify-center pt-1 pb-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[10px] text-muted-foreground h-7 px-3"
                    onClick={() => {
                      const lastFieldIndex = sec.fields.length > 0
                        ? sec.fields[sec.fields.length - 1].globalIndex
                        : sec.sectionIndex;
                      onInsertAt("checkbox", lastFieldIndex + 1);
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Legg til felt
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <div className="flex justify-center pt-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => onAddField("section_header")}
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Legg til seksjon
        </Button>
      </div>
    </div>
  );
}
