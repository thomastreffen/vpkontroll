import { useState, useRef, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowUp, ArrowDown, Trash2, Copy, Plus, GripVertical, X, ClipboardPaste,
  Type, AlignLeft, CheckSquare, ListChecks, ChevronDown, Hash, Calendar, Star, Gauge, ImageIcon,
} from "lucide-react";
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

/* ── Quick-add menu inside sections ── */
function QuickAddMenu({ onAdd }: { onAdd: (type: string) => void }) {
  const items = [
    { type: "checkbox", label: "Sjekkpunkt", icon: CheckSquare },
    { type: "measurement", label: "Måling", icon: Gauge },
    { type: "checkbox_list", label: "Flervalg", icon: ListChecks },
    { type: "text", label: "Tekst", icon: Type },
    { type: "dropdown", label: "Nedtrekk", icon: ChevronDown },
    { type: "number", label: "Tall", icon: Hash },
    { type: "textarea", label: "Fritekst", icon: AlignLeft },
    { type: "rating", label: "Vurdering", icon: Star },
    { type: "date", label: "Dato", icon: Calendar },
    { type: "file", label: "Fil", icon: ImageIcon },
  ];
  return (
    <div className="flex flex-wrap gap-1 justify-center py-1">
      {items.map(it => (
        <button
          key={it.type}
          onClick={e => { e.stopPropagation(); onAdd(it.type); }}
          className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary hover:bg-primary/5 rounded px-1.5 py-1 transition-colors"
        >
          <it.icon className="h-3 w-3" />
          {it.label}
        </button>
      ))}
    </div>
  );
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

  const typeHint = fieldType === "checkbox_list" ? "Velg flere svar" : fieldType === "dropdown" ? "Kompakt nedtrekksliste" : "Velg ett svar";

  return (
    <div className="mt-2.5 space-y-1.5">
      <p className="text-[10px] text-muted-foreground/60 italic">{typeHint}</p>
      {choices.map((c, i) => (
        <div key={i} className="flex items-center gap-2 group/opt">
          {fieldType === "checkbox_list" ? (
            <Checkbox disabled className="shrink-0 opacity-50" />
          ) : (
            <div className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/25 shrink-0" />
          )}
          <input
            ref={el => { inputRefs.current[i] = el; }}
            value={c}
            onChange={e => updateChoice(i, e.target.value)}
            onKeyDown={e => handleKeyDown(e, i)}
            placeholder={`Skriv alternativ ${i + 1}...`}
            className="flex-1 text-sm bg-transparent border-0 border-b border-transparent focus:border-primary/40 outline-none py-1 px-1 placeholder:text-muted-foreground/30 transition-colors"
          />
          <button
            onClick={e => { e.stopPropagation(); removeChoice(i); }}
            className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground/30 hover:text-destructive opacity-0 group-hover/opt:opacity-100 transition-opacity"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={e => { e.stopPropagation(); addChoice(); }}
          className="text-xs text-primary/60 hover:text-primary font-medium flex items-center gap-1 transition-colors"
        >
          <Plus className="h-3 w-3" /> Legg til alternativ
        </button>
        <button
          onClick={e => { e.stopPropagation(); handlePaste(); }}
          className="text-xs text-muted-foreground/50 hover:text-foreground font-medium flex items-center gap-1 transition-colors"
        >
          <ClipboardPaste className="h-3 w-3" /> Lim inn flere
        </button>
      </div>
    </div>
  );
}

/* ── Editable label with inline placeholder ── */
function EditableLabel({
  value, onChange, isSelected, isRequired, placeholder,
}: {
  value: string; onChange?: (v: string) => void; isSelected: boolean; isRequired: boolean; placeholder?: string;
}) {
  if (isSelected && onChange) {
    return (
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || "Skriv spørsmålet her..."}
        className="text-sm font-medium text-foreground bg-transparent border-0 border-b border-primary/30 outline-none w-full py-0.5 placeholder:text-muted-foreground/35"
        onClick={e => e.stopPropagation()}
        autoFocus={!value}
      />
    );
  }
  return (
    <label className="text-sm font-medium text-foreground leading-snug">
      {value || <span className="text-muted-foreground/40 italic">{placeholder || "Klikk for å skrive spørsmål..."}</span>}
      {isRequired && <span className="text-destructive ml-0.5">*</span>}
    </label>
  );
}

/* ── Preview content for each field type ── */
function FieldPreviewContent({
  field, isSelected, onUpdateField,
}: {
  field: TemplateField; isSelected?: boolean; onUpdateField?: (updates: Partial<TemplateField>) => void;
}) {
  const { field_type, label, help_text, unit, options, is_required } = field;
  const hasOptions = field_type === "dropdown" || field_type === "checkbox_list";

  const labelEl = (
    <EditableLabel
      value={label}
      onChange={isSelected && onUpdateField ? v => onUpdateField({ label: v }) : undefined}
      isSelected={!!isSelected}
      isRequired={is_required}
    />
  );

  const helpEl = help_text && !isSelected ? (
    <p className="text-xs text-muted-foreground/60 mt-0.5">{help_text}</p>
  ) : null;

  const optionsEditor = hasOptions && isSelected && onUpdateField ? (
    <InlineOptionsEditor
      options={options}
      onChange={opts => onUpdateField({ options: opts })}
      fieldType={field_type}
    />
  ) : null;

  switch (field_type) {
    case "text":
      return <div className="space-y-1.5">{labelEl}{helpEl}<div className="h-9 rounded-md border border-border bg-muted/20 px-3 flex items-center text-xs text-muted-foreground/40">Kort tekst...</div></div>;
    case "textarea":
      return <div className="space-y-1.5">{labelEl}{helpEl}<div className="h-16 rounded-md border border-border bg-muted/20 px-3 pt-2 text-xs text-muted-foreground/40">Fritekst...</div></div>;
    case "checkbox":
      return (
        <div className="flex items-start gap-3 py-1">
          <Checkbox disabled className="mt-0.5 opacity-50" />
          <div className="flex-1">
            {labelEl}
            {helpEl}
          </div>
        </div>
      );
    case "checkbox_list": {
      const choices: string[] = options?.choices || [];
      return (
        <div className="space-y-1.5">
          {labelEl}
          {helpEl}
          {isSelected && onUpdateField ? (
            optionsEditor
          ) : (
            <div className="space-y-1.5 mt-1.5">
              {choices.length === 0 ? (
                <p className="text-xs text-muted-foreground/40 italic pl-1">Klikk for å legge til alternativer</p>
              ) : (
                <>
                  {choices.slice(0, 5).map((c, i) => (
                    <div key={i} className="flex items-center gap-2.5 pl-0.5">
                      <Checkbox disabled className="opacity-50" />
                      <span className="text-sm text-muted-foreground">{c || `Alternativ ${i + 1}`}</span>
                    </div>
                  ))}
                  {choices.length > 5 && <span className="text-xs text-muted-foreground/50 pl-6">+ {choices.length - 5} til</span>}
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
        <div className="space-y-1.5">
          {labelEl}
          {helpEl}
          {isSelected && onUpdateField ? (
            optionsEditor
          ) : (
            <div className="h-9 rounded-md border border-border bg-muted/20 px-3 flex items-center justify-between text-xs text-muted-foreground/40">
              <span>{choices.length > 0 ? choices[0] : "Velg..."}</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </div>
          )}
        </div>
      );
    }
    case "number":
      return <div className="space-y-1.5">{labelEl}{helpEl}<div className="h-9 w-32 rounded-md border border-border bg-muted/20 px-3 flex items-center text-xs text-muted-foreground/40">0</div></div>;
    case "date":
      return <div className="space-y-1.5">{labelEl}{helpEl}<div className="h-9 w-44 rounded-md border border-border bg-muted/20 px-3 flex items-center text-xs text-muted-foreground/40"><Calendar className="h-3.5 w-3.5 mr-2" />Velg dato...</div></div>;
    case "rating":
      return (
        <div className="space-y-2">
          {labelEl}
          {helpEl}
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map(n => (
              <div key={n} className="h-9 w-9 rounded-md border border-border bg-muted/20 flex items-center justify-center text-xs text-muted-foreground/50 font-medium">{n}</div>
            ))}
          </div>
        </div>
      );
    case "measurement":
      return (
        <div className="space-y-1.5">
          {labelEl}
          {helpEl}
          <div className="flex gap-2 items-center">
            <div className="h-9 w-28 rounded-md border border-border bg-muted/20 px-3 flex items-center text-xs text-muted-foreground/40">Verdi</div>
            <span className="text-sm text-muted-foreground font-medium">{unit || "enhet"}</span>
          </div>
        </div>
      );
    case "file":
      return (
        <div className="space-y-1.5">
          {labelEl}
          {helpEl}
          <div className="h-16 border-2 border-dashed border-border/60 rounded-lg flex items-center justify-center text-xs text-muted-foreground/40 bg-muted/10">
            Dra fil hit eller klikk for å laste opp
          </div>
        </div>
      );
    default:
      return <div className="space-y-1.5">{labelEl}<div className="h-9 rounded-md border border-border bg-muted/20" /></div>;
  }
}

function FieldToolbar({ index, total, onMove, onDuplicate, onRemove }: {
  index: number; total: number;
  onMove: (i: number, d: -1 | 1) => void;
  onDuplicate: (i: number) => void;
  onRemove: (i: number) => void;
}) {
  return (
    <div className="absolute -top-3.5 right-2 flex items-center gap-0.5 bg-card border border-border rounded-lg shadow-sm px-1 py-0.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); onMove(index, -1); }} disabled={index === 0}>
        <ArrowUp className="h-3 w-3" />
      </Button>
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); onMove(index, 1); }} disabled={index >= total - 1}>
        <ArrowDown className="h-3 w-3" />
      </Button>
      <div className="w-px h-4 bg-border mx-0.5" />
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); onDuplicate(index); }}>
        <Copy className="h-3 w-3" />
      </Button>
      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive/60 hover:text-destructive" onClick={e => { e.stopPropagation(); onRemove(index); }}>
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
  const [showQuickAdd, setShowQuickAdd] = useState<number | null>(null);

  if (fields.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="h-16 w-16 rounded-2xl bg-primary/8 flex items-center justify-center mb-5">
          <Plus className="h-8 w-8 text-primary/60" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Bygg skjemaet ditt</h3>
        <p className="text-sm text-muted-foreground mb-8 max-w-sm">
          Velg bruksområde i headeren, eller start med å legge til spørsmål direkte.
        </p>
        <div className="grid grid-cols-2 gap-2 max-w-xs w-full">
          <button onClick={() => onAddField("checkbox")} className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-left">
            <CheckSquare className="h-4 w-4 text-primary/60 shrink-0" />
            <div>
              <p className="text-xs font-medium">Sjekkpunkt</p>
              <p className="text-[10px] text-muted-foreground">Ja / nei</p>
            </div>
          </button>
          <button onClick={() => onAddField("measurement")} className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-left">
            <Gauge className="h-4 w-4 text-primary/60 shrink-0" />
            <div>
              <p className="text-xs font-medium">Målefelt</p>
              <p className="text-[10px] text-muted-foreground">Verdi + enhet</p>
            </div>
          </button>
          <button onClick={() => onAddField("checkbox_list")} className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-left">
            <ListChecks className="h-4 w-4 text-primary/60 shrink-0" />
            <div>
              <p className="text-xs font-medium">Valgspørsmål</p>
              <p className="text-[10px] text-muted-foreground">Velg flere</p>
            </div>
          </button>
          <button onClick={() => onAddField("section_header")} className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-left">
            <GripVertical className="h-4 w-4 text-primary/60 shrink-0" />
            <div>
              <p className="text-xs font-medium">Seksjon</p>
              <p className="text-[10px] text-muted-foreground">Gruppér felt</p>
            </div>
          </button>
        </div>
      </div>
    );
  }

  if (previewMode) {
    return (
      <div className="space-y-8">
        {sections.map((sec, si) => (
          <div key={si} className="space-y-4">
            <div className="border-b border-border pb-2">
              <h3 className="text-base font-semibold text-foreground">{sec.section.label || "Seksjon"}</h3>
              {sec.section.help_text && <p className="text-sm text-muted-foreground mt-0.5">{sec.section.help_text}</p>}
            </div>
            <div className="space-y-5 pl-0.5">
              {sec.fields.map(({ field, globalIndex }) => (
                <FieldPreviewContent key={globalIndex} field={field} />
              ))}
              {sec.fields.length === 0 && (
                <p className="text-sm text-muted-foreground italic py-3">Ingen felt i denne seksjonen</p>
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
    <div className="space-y-6">
      {sections.map((sec, si) => {
        const isSectionSelected = selectedIndex === sec.sectionIndex;

        return (
          <div key={si}>
            {si > 0 && (
              <div className="flex justify-center py-2 mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[10px] text-muted-foreground/50 h-6 px-2 hover:text-primary"
                  onClick={() => onInsertAt("section_header", sec.sectionIndex)}
                >
                  <Plus className="h-3 w-3 mr-1" /> Ny seksjon
                </Button>
              </div>
            )}

            {/* Section container */}
            <div className={cn(
              "rounded-xl border transition-all",
              isSectionSelected
                ? "border-primary/40 ring-2 ring-primary/15 shadow-sm"
                : "border-border hover:border-border/80"
            )}>
              {/* Section header */}
              {sec.sectionIndex >= 0 && (
                <div
                  className={cn(
                    "group relative flex items-center gap-3 px-5 py-3 rounded-t-xl cursor-pointer transition-colors border-b",
                    isSectionSelected
                      ? "bg-primary/5 border-primary/15"
                      : "bg-muted/30 border-border/60 hover:bg-muted/50"
                  )}
                  onClick={() => onSelect(isSectionSelected ? null : sec.sectionIndex)}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                  <div className="flex-1 min-w-0">
                    {isSectionSelected && onUpdateField ? (
                      <div className="space-y-1">
                        <input
                          value={sec.section.label}
                          onChange={e => onUpdateField(sec.sectionIndex, { label: e.target.value })}
                          placeholder="Gi seksjonen et navn..."
                          className="text-sm font-semibold text-foreground bg-transparent border-0 border-b border-primary/30 outline-none w-full py-0.5 placeholder:text-muted-foreground/35"
                          onClick={e => e.stopPropagation()}
                          autoFocus
                        />
                        <input
                          value={sec.section.help_text || ""}
                          onChange={e => onUpdateField(sec.sectionIndex, { help_text: e.target.value })}
                          placeholder="Valgfri beskrivelse av seksjonen..."
                          className="text-xs text-muted-foreground bg-transparent border-0 border-b border-transparent focus:border-primary/20 outline-none w-full py-0.5 placeholder:text-muted-foreground/30"
                          onClick={e => e.stopPropagation()}
                        />
                      </div>
                    ) : (
                      <>
                        <h3 className="text-sm font-semibold text-foreground truncate">
                          {sec.section.label || <span className="text-muted-foreground/40 italic">Ny seksjon</span>}
                        </h3>
                        {sec.section.help_text && (
                          <p className="text-xs text-muted-foreground/60 truncate mt-0.5">{sec.section.help_text}</p>
                        )}
                      </>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground/50 shrink-0 tabular-nums">
                    {sec.fields.length} {sec.fields.length === 1 ? "felt" : "felt"}
                  </span>

                  {/* Section toolbar */}
                  <div className="absolute -top-3.5 right-2 flex items-center gap-0.5 bg-card border border-border rounded-lg shadow-sm px-1 py-0.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); onMove(sec.sectionIndex, -1); }} disabled={sec.sectionIndex === 0}>
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); onMove(sec.sectionIndex, 1); }}>
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                    <div className="w-px h-4 bg-border mx-0.5" />
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); onDuplicate(sec.sectionIndex); }}>
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      className="h-6 w-6 text-destructive/60 hover:text-destructive"
                      onClick={e => { e.stopPropagation(); handleRemoveSection(sec.sectionIndex, sec.fields); }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Fields inside section */}
              <div className="px-5 py-3 space-y-1">
                {sec.fields.map(({ field, globalIndex }) => {
                  const isSelected = selectedIndex === globalIndex;
                  const meta = FIELD_TYPE_META[field.field_type];

                  return (
                    <div
                      key={globalIndex}
                      onClick={() => onSelect(isSelected ? null : globalIndex)}
                      className={cn(
                        "relative group rounded-lg transition-all cursor-pointer px-4 py-3.5",
                        isSelected
                          ? "ring-2 ring-primary/40 bg-primary/[0.03] shadow-sm"
                          : "hover:bg-accent/20"
                      )}
                    >
                      {/* Type badge */}
                      <div className={cn(
                        "absolute -top-2.5 right-3 text-[9px] font-medium px-2 py-0.5 rounded-full transition-opacity",
                        isSelected
                          ? "opacity-100 bg-primary/10 text-primary"
                          : "opacity-0 group-hover:opacity-100 bg-muted text-muted-foreground"
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
                  <div className="text-center py-6 space-y-3">
                    <p className="text-sm text-muted-foreground/50">
                      Ingen spørsmål ennå
                    </p>
                    <p className="text-xs text-muted-foreground/40">
                      Legg til fra paletten, eller velg hurtigvalg:
                    </p>
                    <QuickAddMenu onAdd={(type) => {
                      const insertIdx = sec.sectionIndex >= 0 ? sec.sectionIndex + 1 : 0;
                      onInsertAt(type, insertIdx);
                    }} />
                  </div>
                )}

                {/* Add field button */}
                <div className="flex justify-center pt-2 pb-1">
                  {showQuickAdd === si ? (
                    <div className="w-full">
                      <QuickAddMenu onAdd={(type) => {
                        const lastFieldIndex = sec.fields.length > 0
                          ? sec.fields[sec.fields.length - 1].globalIndex
                          : sec.sectionIndex;
                        onInsertAt(type, lastFieldIndex + 1);
                        setShowQuickAdd(null);
                      }} />
                      <div className="flex justify-center pt-1">
                        <button onClick={() => setShowQuickAdd(null)} className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground">Lukk</button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground/50 h-8 px-4 hover:text-primary hover:bg-primary/5"
                      onClick={() => setShowQuickAdd(si)}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1.5" /> Legg til spørsmål
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <div className="flex justify-center pt-3 pb-2">
        <Button
          variant="outline"
          size="sm"
          className="text-muted-foreground hover:text-primary border-dashed"
          onClick={() => onAddField("section_header")}
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Ny seksjon
        </Button>
      </div>
    </div>
  );
}
