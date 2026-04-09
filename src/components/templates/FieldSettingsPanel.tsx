import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { FIELD_TYPE_META } from "./FieldPalette";
import type { TemplateField } from "./FieldCanvas";
import { Settings2, HelpCircle } from "lucide-react";

interface Props {
  field: TemplateField;
  onChange: (updates: Partial<TemplateField>) => void;
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").substring(0, 40);
}

const RATING_LABELS = ["Svært dårlig", "Dårlig", "Middels", "God", "Svært god"];

/* ── Empty state when no field is selected ── */
export function FieldSettingsEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center mb-3">
        <Settings2 className="h-5 w-5 text-muted-foreground/40" />
      </div>
      <p className="text-sm font-medium text-muted-foreground/60 mb-1.5">Feltinnstillinger</p>
      <p className="text-xs text-muted-foreground/40 max-w-[180px] leading-relaxed">
        Velg et felt eller en seksjon i skjemaet for å se og endre innstillinger
      </p>
    </div>
  );
}

export default function FieldSettingsPanel({ field, onChange }: Props) {
  const meta = FIELD_TYPE_META[field.field_type];
  const isSection = field.field_type === "section_header";
  const hasOptions = field.field_type === "dropdown" || field.field_type === "checkbox_list";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2.5 pb-3 border-b border-border">
        {meta && <meta.icon className="h-4 w-4 text-primary/60" />}
        <div>
          <p className="text-xs font-semibold text-foreground">
            {isSection ? "Seksjon" : meta?.label || field.field_type}
          </p>
          <p className="text-[10px] text-muted-foreground">{meta?.description}</p>
        </div>
      </div>

      {/* ── General ── */}
      <div className="space-y-3">
        {!isSection && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Feltnøkkel</Label>
            <Input
              value={field.field_key}
              onChange={e => onChange({ field_key: e.target.value })}
              placeholder="auto-generert"
              className="text-xs font-mono h-8"
            />
            <p className="text-[10px] text-muted-foreground/50">Intern lagringsnøkkel</p>
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            <HelpCircle className="h-3 w-3 inline mr-1" />
            {isSection ? "Undertekst" : "Hjelpetekst for utfyller"}
          </Label>
          <Input
            value={field.help_text}
            onChange={e => onChange({ help_text: e.target.value })}
            placeholder={isSection ? "Kort beskrivelse..." : "Veiledning som vises under feltet"}
            className="text-xs h-8"
          />
        </div>

        {!isSection && (
          <div className="flex items-center justify-between py-1.5 px-1">
            <Label className="text-xs">Obligatorisk</Label>
            <Switch checked={field.is_required} onCheckedChange={v => onChange({ is_required: v })} />
          </div>
        )}
      </div>

      <Separator />

      {/* Felttype-bytte */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Bytt felttype</Label>
        <Select value={field.field_type} onValueChange={v => onChange({ field_type: v })}>
          <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(FIELD_TYPE_META).map(([k, m]) => (
              <SelectItem key={k} value={k}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Type-specific ── */}

      {field.field_type === "measurement" && (
        <>
          <Separator />
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Måleinnstillinger</p>
            <div className="space-y-1.5">
              <Label className="text-xs">Enhet</Label>
              <Input value={field.unit} onChange={e => onChange({ unit: e.target.value })} placeholder="°C, bar, kW..." className="text-xs h-8" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Min</Label>
                <Input
                  type="number"
                  value={field.options?.min ?? ""}
                  onChange={e => onChange({ options: { ...field.options, min: e.target.value ? Number(e.target.value) : undefined } })}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Maks</Label>
                <Input
                  type="number"
                  value={field.options?.max ?? ""}
                  onChange={e => onChange({ options: { ...field.options, max: e.target.value ? Number(e.target.value) : undefined } })}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>
        </>
      )}

      {field.field_type === "rating" && (
        <>
          <Separator />
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Vurderingsskala</p>
            <div className="space-y-0.5">
              {RATING_LABELS.map((l, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground py-0.5">
                  <span className="w-4 text-right font-medium text-foreground/70">{i + 1}</span>
                  <span className="text-muted-foreground/60">= {l}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {hasOptions && (
        <>
          <Separator />
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Alternativer (bulk)
            </p>
            <p className="text-[10px] text-muted-foreground/50">
              Rediger direkte i canvas, eller lim inn her (ett per linje):
            </p>
            <Textarea
              value={(field.options?.choices || []).join("\n")}
              onChange={e => {
                const choices = e.target.value.split("\n");
                onChange({ options: { ...field.options, choices } });
              }}
              placeholder={"Alternativ 1\nAlternativ 2\nAlternativ 3"}
              rows={4}
              className="text-xs font-mono"
            />
          </div>
        </>
      )}

      {field.field_type === "file" && (
        <>
          <Separator />
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Fil</p>
            <div className="flex items-center justify-between px-1">
              <Label className="text-xs">Kun bilder</Label>
              <Switch
                checked={field.options?.images_only || false}
                onCheckedChange={v => onChange({ options: { ...field.options, images_only: v } })}
              />
            </div>
            <p className="text-[10px] text-muted-foreground/50">Begrens til jpg, png, heic</p>
          </div>
        </>
      )}

      {(field.field_type === "text" || field.field_type === "textarea" || field.field_type === "number") && (
        <>
          <Separator />
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Standardverdi</p>
            <Input
              value={field.default_value != null ? String(field.default_value) : ""}
              onChange={e => {
                const v = e.target.value;
                onChange({ default_value: field.field_type === "number" && v ? Number(v) : v || null });
              }}
              placeholder="Valgfri"
              className="text-xs h-8"
              type={field.field_type === "number" ? "number" : "text"}
            />
          </div>
        </>
      )}
    </div>
  );
}
