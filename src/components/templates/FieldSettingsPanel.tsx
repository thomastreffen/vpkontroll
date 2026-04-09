import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { FIELD_TYPE_META } from "./FieldPalette";
import type { TemplateField } from "./FieldCanvas";

interface Props {
  field: TemplateField;
  onChange: (updates: Partial<TemplateField>) => void;
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").substring(0, 40);
}

const RATING_LABELS = ["Svært dårlig", "Dårlig", "Middels", "God", "Svært god"];

export default function FieldSettingsPanel({ field, onChange }: Props) {
  const meta = FIELD_TYPE_META[field.field_type];
  const isSection = field.field_type === "section_header";
  const hasOptions = field.field_type === "dropdown" || field.field_type === "checkbox_list";

  const autoKey = (label: string) => {
    if (!field.field_key || field.field_key === slugify(field.label)) {
      onChange({ label, field_key: slugify(label) });
    } else {
      onChange({ label });
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-border">
        {meta && <meta.icon className="h-4 w-4 text-muted-foreground" />}
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {isSection ? "Seksjon" : meta?.label || field.field_type}
        </p>
      </div>

      {/* ── Generelt ── */}
      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Generelt</p>

        {!isSection && (
          <div className="space-y-1.5">
            <Label className="text-xs">Feltnøkkel (intern)</Label>
            <Input
              value={field.field_key}
              onChange={e => onChange({ field_key: e.target.value })}
              placeholder="auto-generert"
              className="text-xs font-mono"
            />
            <p className="text-[10px] text-muted-foreground">Brukes som lagringsnøkkel i utfylt data</p>
          </div>
        )}

        {/* Help text / subtitle */}
        <div className="space-y-1.5">
          <Label className="text-xs">{isSection ? "Undertekst (valgfri)" : "Hjelpetekst"}</Label>
          <Input
            value={field.help_text}
            onChange={e => onChange({ help_text: e.target.value })}
            placeholder={isSection ? "Kort beskrivelse av seksjonen" : "Veiledning for utfyller"}
            className="text-xs"
          />
        </div>

        {!isSection && (
          <div className="flex items-center justify-between py-1">
            <Label className="text-xs">Obligatorisk felt</Label>
            <Switch checked={field.is_required} onCheckedChange={v => onChange({ is_required: v })} />
          </div>
        )}
      </div>

      {/* ── Felttype ── */}
      <div className="space-y-3">
        <Separator />
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Felttype</p>
        <Select value={field.field_type} onValueChange={v => onChange({ field_type: v })}>
          <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(FIELD_TYPE_META).map(([k, m]) => (
              <SelectItem key={k} value={k}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Type-specific settings ── */}

      {/* Measurement */}
      {field.field_type === "measurement" && (
        <div className="space-y-3">
          <Separator />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Måleinnstillinger</p>
          <div className="space-y-1.5">
            <Label className="text-xs">Enhet</Label>
            <Input value={field.unit} onChange={e => onChange({ unit: e.target.value })} placeholder="°C, bar, kW..." className="text-xs" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px]">Min</Label>
              <Input
                type="number"
                value={field.options?.min ?? ""}
                onChange={e => onChange({ options: { ...field.options, min: e.target.value ? Number(e.target.value) : undefined } })}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Maks</Label>
              <Input
                type="number"
                value={field.options?.max ?? ""}
                onChange={e => onChange({ options: { ...field.options, max: e.target.value ? Number(e.target.value) : undefined } })}
                className="h-8 text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {/* Rating */}
      {field.field_type === "rating" && (
        <div className="space-y-3">
          <Separator />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Vurderingsinnstillinger</p>
          <div className="space-y-1">
            {RATING_LABELS.map((l, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-4 text-right font-medium">{i + 1}</span>
                <span>= {l}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">Skalaen 1–5 er fast og vises med labels ved utfylling.</p>
        </div>
      )}

      {/* Dropdown / checkbox_list — secondary note since inline is primary */}
      {hasOptions && (
        <div className="space-y-3">
          <Separator />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {field.field_type === "dropdown" ? "Nedtrekksvalg" : "Listevalg"}
          </p>
          <p className="text-[10px] text-muted-foreground">
            Rediger alternativene direkte i skjemaet til venstre, eller lim inn her (ett per linje):
          </p>
          <Textarea
            value={(field.options?.choices || []).join("\n")}
            onChange={e => {
              const choices = e.target.value.split("\n");
              onChange({ options: { ...field.options, choices } });
            }}
            placeholder={"Valg 1\nValg 2\nValg 3"}
            rows={4}
            className="text-xs font-mono"
          />
        </div>
      )}

      {/* File */}
      {field.field_type === "file" && (
        <div className="space-y-3">
          <Separator />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Filinnstillinger</p>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Kun bilder</Label>
            <Switch
              checked={field.options?.images_only || false}
              onCheckedChange={v => onChange({ options: { ...field.options, images_only: v } })}
            />
          </div>
          <p className="text-[10px] text-muted-foreground">Begrens til bildefiler (jpg, png, heic)</p>
        </div>
      )}

      {/* ── Standardverdi ── */}
      {(field.field_type === "text" || field.field_type === "textarea" || field.field_type === "number") && (
        <div className="space-y-3">
          <Separator />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Standardverdi</p>
          <Input
            value={field.default_value != null ? String(field.default_value) : ""}
            onChange={e => {
              const v = e.target.value;
              onChange({ default_value: field.field_type === "number" && v ? Number(v) : v || null });
            }}
            placeholder="Valgfri"
            className="text-xs"
            type={field.field_type === "number" ? "number" : "text"}
          />
        </div>
      )}
    </div>
  );
}
