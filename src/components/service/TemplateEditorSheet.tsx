import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Trash2, ArrowUp, ArrowDown, Loader2, GripVertical, ChevronDown, Settings2 } from "lucide-react";

interface TemplateField {
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

const FIELD_TYPE_LABELS: Record<string, string> = {
  section_header: "Seksjonsoverskrift",
  text: "Tekstfelt",
  textarea: "Tekstområde",
  checkbox: "Sjekkpunkt",
  checkbox_list: "Sjekkliste",
  dropdown: "Nedtrekksliste",
  number: "Tallfelt",
  date: "Dato",
  rating: "Vurdering (1–5)",
  measurement: "Målefelt",
  file: "Fil/bilde",
};

const CATEGORY_LABELS: Record<string, string> = {
  service: "Service",
  installation: "Installasjon",
  inspection: "Befaring",
  crm: "Salg og CRM",
  web: "Nettside",
  warranty: "Garanti/reklamasjon",
};

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").substring(0, 40);
}

function emptyField(sortOrder: number): TemplateField {
  return { field_type: "checkbox", field_key: "", label: "", unit: "", help_text: "", is_required: false, default_value: null, options: null, sort_order: sortOrder };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: any | null;
  onSaved: () => void;
}

export default function TemplateEditorSheet({ open, onOpenChange, template, onSaved }: Props) {
  const { tenantId, user } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("service");
  const [templateKey, setTemplateKey] = useState("");
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [saving, setSaving] = useState(false);
  const [expandedField, setExpandedField] = useState<number | null>(null);
  const isEdit = !!template;

  useEffect(() => {
    if (!open) return;
    if (template) {
      setName(template.name || "");
      setDescription(template.description || "");
      setCategory(template.category || "service");
      setTemplateKey(template.template_key || "");
      supabase
        .from("service_template_fields" as any)
        .select("*")
        .eq("template_id", template.id)
        .order("sort_order")
        .then(({ data }) => {
          setFields((data || []).map((f: any) => ({
            id: f.id, field_type: f.field_type, field_key: f.field_key || "",
            label: f.label, unit: f.unit || "", help_text: f.help_text || "",
            is_required: f.is_required || false, default_value: f.default_value,
            options: f.options, sort_order: f.sort_order,
          })));
        });
    } else {
      setName(""); setDescription(""); setCategory("service"); setTemplateKey("");
      setFields([]);
    }
    setExpandedField(null);
  }, [open, template]);

  const addField = () => {
    const f = emptyField(fields.length);
    setFields([...fields, f]);
    setExpandedField(fields.length);
  };

  const updateField = (index: number, updates: Partial<TemplateField>) => {
    setFields(fields.map((f, i) => i === index ? { ...f, ...updates } : f));
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index).map((f, i) => ({ ...f, sort_order: i })));
    setExpandedField(null);
  };

  const moveField = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= fields.length) return;
    const updated = [...fields];
    [updated[index], updated[target]] = [updated[target], updated[index]];
    setFields(updated.map((f, i) => ({ ...f, sort_order: i })));
    setExpandedField(target);
  };

  // Auto-generate field_key from label
  const autoKey = (index: number, label: string) => {
    const field = fields[index];
    if (!field.field_key || field.field_key === slugify(field.label)) {
      updateField(index, { label, field_key: slugify(label) });
    } else {
      updateField(index, { label });
    }
  };

  const handleSave = async () => {
    if (!tenantId || !name.trim()) { toast.error("Malnavn er påkrevd"); return; }
    const nonHeaderFields = fields.filter(f => f.field_type !== "section_header");
    if (nonHeaderFields.some(f => !f.label.trim())) { toast.error("Alle felt må ha en beskrivelse"); return; }
    setSaving(true);

    try {
      let templateId = template?.id;
      const tKey = templateKey.trim() || slugify(name);

      if (isEdit) {
        await supabase.from("service_templates" as any).update({
          name: name.trim(), description: description.trim() || null,
          category, template_key: tKey,
        }).eq("id", templateId);
        await supabase.from("service_template_fields" as any).delete().eq("template_id", templateId);
      } else {
        const { data, error } = await (supabase
          .from("service_templates" as any)
          .insert({ tenant_id: tenantId, name: name.trim(), description: description.trim() || null, category, template_key: tKey, created_by: user?.id })
          .select("id")
          .single() as any);
        if (error) throw error;
        templateId = data.id;
      }

      if (fields.length > 0) {
        const fieldRows = fields.map((f, i) => ({
          template_id: templateId, tenant_id: tenantId,
          field_type: f.field_type, field_key: f.field_key.trim() || slugify(f.label),
          label: f.label.trim(), unit: f.unit.trim() || null,
          help_text: f.help_text.trim() || null, is_required: f.is_required,
          default_value: f.default_value, options: f.options,
          sort_order: i,
        }));
        const { error } = await supabase.from("service_template_fields" as any).insert(fieldRows);
        if (error) throw error;
      }

      toast.success(isEdit ? "Mal oppdatert" : "Mal opprettet");
      onOpenChange(false);
      onSaved();
    } catch {
      toast.error("Kunne ikke lagre mal");
    } finally {
      setSaving(false);
    }
  };

  // Options editor for dropdown/checkbox_list
  const renderOptionsEditor = (index: number, field: TemplateField) => {
    const opts: string[] = field.options?.choices || [];
    return (
      <div className="space-y-2">
        <Label className="text-xs">Valg (ett per linje)</Label>
        <Textarea
          value={opts.join("\n")}
          onChange={e => {
            const choices = e.target.value.split("\n");
            updateField(index, { options: { ...field.options, choices } });
          }}
          placeholder={"Valg 1\nValg 2\nValg 3"}
          rows={3}
          className="text-xs"
        />
      </div>
    );
  };

  // Measurement config
  const renderMeasurementConfig = (index: number, field: TemplateField) => {
    const cfg = field.options || {};
    return (
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px]">Enhet</Label>
          <Input value={field.unit} onChange={e => updateField(index, { unit: e.target.value })} placeholder="°C, bar..." className="h-7 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]">Min</Label>
          <Input type="number" value={cfg.min ?? ""} onChange={e => updateField(index, { options: { ...cfg, min: e.target.value ? Number(e.target.value) : undefined } })} className="h-7 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]">Maks</Label>
          <Input type="number" value={cfg.max ?? ""} onChange={e => updateField(index, { options: { ...cfg, max: e.target.value ? Number(e.target.value) : undefined } })} className="h-7 text-xs" />
        </div>
      </div>
    );
  };

  const renderFieldEditor = (field: TemplateField, index: number) => {
    const isExpanded = expandedField === index;
    const typeLabel = FIELD_TYPE_LABELS[field.field_type] || field.field_type;

    return (
      <div key={index} className="border rounded-lg bg-card">
        {/* Collapsed header */}
        <div className="flex items-center gap-2 px-3 py-2">
          <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
          <button onClick={() => setExpandedField(isExpanded ? null : index)} className="flex-1 text-left flex items-center gap-2 min-w-0">
            <span className="text-sm font-medium truncate">{field.label || "(uten navn)"}</span>
            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">{typeLabel}</span>
            {field.is_required && <span className="text-[10px] text-destructive">*</span>}
            <ChevronDown className={`h-3 w-3 text-muted-foreground ml-auto transition-transform shrink-0 ${isExpanded ? "rotate-180" : ""}`} />
          </button>
          <div className="flex gap-0.5 shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveField(index, -1)} disabled={index === 0}>
              <ArrowUp className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveField(index, 1)} disabled={index === fields.length - 1}>
              <ArrowDown className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/70 hover:text-destructive" onClick={() => removeField(index)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Expanded details */}
        {isExpanded && (
          <div className="px-3 pb-3 space-y-3 border-t pt-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Felttype</Label>
                <Select value={field.field_type} onValueChange={v => updateField(index, { field_type: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(FIELD_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Feltnøkkel</Label>
                <Input value={field.field_key} onChange={e => updateField(index, { field_key: e.target.value })} placeholder="auto" className="h-8 text-xs font-mono" />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Label / beskrivelse</Label>
              <Input value={field.label} onChange={e => autoKey(index, e.target.value)} placeholder="Beskrivelse av felt" className="h-8 text-sm" />
            </div>

            {field.field_type !== "section_header" && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs">Hjelpetekst</Label>
                  <Input value={field.help_text} onChange={e => updateField(index, { help_text: e.target.value })} placeholder="Valgfri veiledning for utfyller" className="h-8 text-xs" />
                </div>

                <div className="flex items-center gap-3">
                  <Switch checked={field.is_required} onCheckedChange={v => updateField(index, { is_required: v })} />
                  <Label className="text-xs">Obligatorisk felt</Label>
                </div>
              </>
            )}

            {(field.field_type === "dropdown" || field.field_type === "checkbox_list") && renderOptionsEditor(index, field)}

            {field.field_type === "measurement" && renderMeasurementConfig(index, field)}

            {(field.field_type === "text" || field.field_type === "textarea" || field.field_type === "number") && (
              <div className="space-y-1">
                <Label className="text-xs">Standardverdi</Label>
                <Input
                  value={field.default_value != null ? String(field.default_value) : ""}
                  onChange={e => {
                    const v = e.target.value;
                    updateField(index, { default_value: field.field_type === "number" && v ? Number(v) : v || null });
                  }}
                  placeholder="Valgfri standardverdi"
                  className="h-8 text-xs"
                  type={field.field_type === "number" ? "number" : "text"}
                />
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-xl w-full overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Rediger mal" : "Ny mal"}</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 mt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Malnavn *</Label>
              <Input value={name} onChange={e => { setName(e.target.value); if (!templateKey) setTemplateKey(slugify(e.target.value)); }} placeholder="f.eks. Standard varmepumpeservice" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Kategori</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Beskrivelse</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Kort beskrivelse av hva malen dekker" rows={2} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Malnøkkel (intern)</Label>
            <Input value={templateKey} onChange={e => setTemplateKey(e.target.value)} placeholder="auto-generert" className="font-mono text-xs" />
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Felt og sjekkpunkter</h3>
              <Button variant="outline" size="sm" onClick={addField}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Legg til felt
              </Button>
            </div>

            {fields.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6 border rounded-lg border-dashed">
                Ingen felt ennå. Legg til sjekkpunkter, målinger, tekstfelt eller andre felttyper.
              </p>
            )}

            <div className="space-y-2">
              {fields.map((field, index) => renderFieldEditor(field, index))}
            </div>
          </div>

          <Separator />

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Avbryt</Button>
            <Button onClick={handleSave} disabled={saving || !name.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEdit ? "Lagre endringer" : "Opprett mal"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
