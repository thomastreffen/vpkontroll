import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Star } from "lucide-react";

export interface TemplateField {
  id: string;
  field_key: string | null;
  field_type: string;
  label: string;
  help_text?: string | null;
  is_required?: boolean;
  default_value?: any;
  options?: any;
  unit?: string | null;
  sort_order: number;
}

interface DynamicFormRendererProps {
  fields: TemplateField[];
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
  readonly?: boolean;
}

const CONDITION_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "Kritisk", color: "text-destructive" },
  2: { label: "Dårlig", color: "text-orange-600" },
  3: { label: "Akseptabel", color: "text-amber-600" },
  4: { label: "God", color: "text-emerald-600" },
  5: { label: "Utmerket", color: "text-emerald-700" },
};

export function DynamicFormRenderer({ fields, values, onChange, readonly = false }: DynamicFormRendererProps) {
  const sorted = [...fields].sort((a, b) => a.sort_order - b.sort_order);

  const getKey = (f: TemplateField) => f.field_key || f.id;
  const getVal = (f: TemplateField) => values[getKey(f)];

  return (
    <div className="space-y-4">
      {sorted.map((field) => {
        const key = getKey(field);

        switch (field.field_type) {
          case "section_header":
            return (
              <div key={field.id}>
                <Separator className="my-2" />
                <h3 className="text-sm font-semibold mt-3">{field.label}</h3>
                {field.help_text && <p className="text-xs text-muted-foreground">{field.help_text}</p>}
              </div>
            );

          case "text":
            return (
              <FieldWrapper key={field.id} field={field}>
                {readonly ? (
                  <ReadonlyValue value={getVal(field) || "–"} />
                ) : (
                  <Input
                    value={getVal(field) || ""}
                    onChange={(e) => onChange(key, e.target.value)}
                    placeholder={field.help_text || ""}
                  />
                )}
              </FieldWrapper>
            );

          case "textarea":
            return (
              <FieldWrapper key={field.id} field={field}>
                {readonly ? (
                  <ReadonlyValue value={getVal(field) || "–"} />
                ) : (
                  <Textarea
                    value={getVal(field) || ""}
                    onChange={(e) => onChange(key, e.target.value)}
                    rows={3}
                    placeholder={field.help_text || ""}
                  />
                )}
              </FieldWrapper>
            );

          case "checkbox":
            return (
              <div key={field.id} className="flex items-start gap-3 py-1">
                <Checkbox
                  checked={!!getVal(field)}
                  onCheckedChange={(c) => !readonly && onChange(key, !!c)}
                  disabled={readonly}
                  className="mt-0.5"
                />
                <div>
                  <p className={`text-sm font-medium ${getVal(field) && readonly ? "line-through text-muted-foreground" : ""}`}>
                    {field.label}
                    {field.is_required && <span className="text-destructive ml-1">*</span>}
                  </p>
                  {field.help_text && <p className="text-xs text-muted-foreground">{field.help_text}</p>}
                </div>
              </div>
            );

          case "checkbox_list": {
            const opts: string[] = field.options?.choices || field.options || [];
            const currentVal: string[] = getVal(field) || [];
            return (
              <FieldWrapper key={field.id} field={field}>
                <div className="space-y-1.5">
                  {opts.map((opt: string) => (
                    <label key={opt} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={currentVal.includes(opt)}
                        disabled={readonly}
                        onCheckedChange={(c) => {
                          if (readonly) return;
                          const next = c
                            ? [...currentVal, opt]
                            : currentVal.filter((v: string) => v !== opt);
                          onChange(key, next);
                        }}
                      />
                      <span className="text-sm">{opt}</span>
                    </label>
                  ))}
                </div>
              </FieldWrapper>
            );
          }

          case "dropdown": {
            const opts: string[] = field.options?.choices || field.options || [];
            return (
              <FieldWrapper key={field.id} field={field}>
                {readonly ? (
                  <ReadonlyValue value={getVal(field) || "–"} />
                ) : (
                  <Select value={getVal(field) || ""} onValueChange={(v) => onChange(key, v)}>
                    <SelectTrigger><SelectValue placeholder="Velg..." /></SelectTrigger>
                    <SelectContent>
                      {opts.map((opt: string) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </FieldWrapper>
            );
          }

          case "number":
            return (
              <FieldWrapper key={field.id} field={field}>
                {readonly ? (
                  <ReadonlyValue value={getVal(field) != null ? String(getVal(field)) : "–"} />
                ) : (
                  <Input
                    type="number"
                    step="any"
                    value={getVal(field) ?? ""}
                    onChange={(e) => onChange(key, e.target.value === "" ? null : parseFloat(e.target.value))}
                    placeholder={field.help_text || ""}
                  />
                )}
              </FieldWrapper>
            );

          case "date":
            return (
              <FieldWrapper key={field.id} field={field}>
                {readonly ? (
                  <ReadonlyValue value={getVal(field) || "–"} />
                ) : (
                  <Input
                    type="date"
                    value={getVal(field) || ""}
                    onChange={(e) => onChange(key, e.target.value)}
                  />
                )}
              </FieldWrapper>
            );

          case "rating": {
            const current = getVal(field) as number | null;
            return (
              <FieldWrapper key={field.id} field={field}>
                {readonly ? (
                  <div className="flex items-center gap-2">
                    {current != null ? (
                      <>
                        <span className={`font-bold ${CONDITION_LABELS[current]?.color || ""}`}>{current}</span>
                        <span className="text-sm">{CONDITION_LABELS[current]?.label || ""}</span>
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">–</span>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {[1, 2, 3, 4, 5].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => onChange(key, v)}
                        className={`w-full flex items-center gap-3 p-2 rounded-lg border text-left transition-colors text-sm ${
                          current === v
                            ? "border-primary bg-primary/5 font-medium"
                            : "border-transparent hover:bg-muted/50"
                        }`}
                      >
                        <Star className={`h-3.5 w-3.5 ${current === v ? CONDITION_LABELS[v]?.color || "" : "text-muted-foreground"}`} />
                        <span className={`font-bold ${CONDITION_LABELS[v]?.color || ""}`}>{v}</span>
                        <span>{CONDITION_LABELS[v]?.label || ""}</span>
                      </button>
                    ))}
                  </div>
                )}
              </FieldWrapper>
            );
          }

          case "measurement": {
            const mVal = getVal(field) as { value?: number | null; unit?: string } | null;
            const unit = mVal?.unit || field.unit || field.options?.unit || "";
            const min = field.options?.min;
            const max = field.options?.max;
            return (
              <FieldWrapper key={field.id} field={field}>
                {readonly ? (
                  <ReadonlyValue value={mVal?.value != null ? `${mVal.value} ${unit}` : "–"} />
                ) : (
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.1"
                      min={min}
                      max={max}
                      placeholder={field.help_text || "–"}
                      value={mVal?.value ?? ""}
                      onChange={(e) => {
                        const num = e.target.value === "" ? null : parseFloat(e.target.value);
                        onChange(key, { value: num, unit: unit });
                      }}
                      className="pr-12"
                    />
                    {unit && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        {unit}
                      </span>
                    )}
                  </div>
                )}
              </FieldWrapper>
            );
          }

          case "file":
            return (
              <FieldWrapper key={field.id} field={field}>
                {readonly ? (
                  <ReadonlyValue value={getVal(field) ? "Fil lastet opp" : "Ingen fil"} />
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    Filopplasting håndteres via vedleggsseksjonen nedenfor.
                  </p>
                )}
              </FieldWrapper>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}

function FieldWrapper({ field, children }: { field: TemplateField; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">
        {field.label}
        {field.is_required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {children}
      {field.help_text && field.field_type !== "text" && field.field_type !== "textarea" && field.field_type !== "measurement" && (
        <p className="text-xs text-muted-foreground">{field.help_text}</p>
      )}
    </div>
  );
}

function ReadonlyValue({ value }: { value: string }) {
  return <p className="text-sm py-1">{value}</p>;
}

export default DynamicFormRenderer;
