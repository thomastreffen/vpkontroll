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
import { Plus, Trash2, ArrowUp, ArrowDown, Loader2, GripVertical } from "lucide-react";

interface TemplateField {
  id?: string;
  field_type: string;
  label: string;
  unit: string;
  sort_order: number;
}

const FIELD_TYPE_LABELS: Record<string, string> = {
  checkbox: "Sjekkpunkt",
  measurement: "Måling",
  rating: "Vurdering (1–5)",
  text: "Fritekst",
};

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
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [saving, setSaving] = useState(false);
  const isEdit = !!template;

  useEffect(() => {
    if (!open) return;
    if (template) {
      setName(template.name || "");
      setDescription(template.description || "");
      // Load fields
      supabase
        .from("service_template_fields" as any)
        .select("*")
        .eq("template_id", template.id)
        .order("sort_order")
        .then(({ data }) => {
          setFields((data || []).map((f: any) => ({
            id: f.id,
            field_type: f.field_type,
            label: f.label,
            unit: f.unit || "",
            sort_order: f.sort_order,
          })));
        });
    } else {
      setName("");
      setDescription("");
      setFields([]);
    }
  }, [open, template]);

  const addField = () => {
    setFields([...fields, { field_type: "checkbox", label: "", unit: "", sort_order: fields.length }]);
  };

  const updateField = (index: number, updates: Partial<TemplateField>) => {
    setFields(fields.map((f, i) => i === index ? { ...f, ...updates } : f));
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index).map((f, i) => ({ ...f, sort_order: i })));
  };

  const moveField = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= fields.length) return;
    const updated = [...fields];
    [updated[index], updated[target]] = [updated[target], updated[index]];
    setFields(updated.map((f, i) => ({ ...f, sort_order: i })));
  };

  const handleSave = async () => {
    if (!tenantId || !name.trim()) { toast.error("Malnavn er påkrevd"); return; }
    if (fields.some(f => !f.label.trim())) { toast.error("Alle felt må ha en beskrivelse"); return; }
    setSaving(true);

    try {
      let templateId = template?.id;

      if (isEdit) {
        await supabase.from("service_templates" as any).update({ name: name.trim(), description: description.trim() || null }).eq("id", templateId);
        // Delete existing fields and re-insert
        await supabase.from("service_template_fields" as any).delete().eq("template_id", templateId);
      } else {
        const { data, error } = await (supabase
          .from("service_templates" as any)
          .insert({ tenant_id: tenantId, name: name.trim(), description: description.trim() || null, created_by: user?.id })
          .select("id")
          .single() as any);
        if (error) throw error;
        templateId = data.id;
      }

      // Insert fields
      if (fields.length > 0) {
        const fieldRows = fields.map((f, i) => ({
          template_id: templateId,
          tenant_id: tenantId,
          field_type: f.field_type,
          label: f.label.trim(),
          unit: f.unit.trim() || null,
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-lg w-full overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Rediger servicemal" : "Ny servicemal"}</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 mt-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Malnavn *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="f.eks. Standard varmepumpeservice" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Beskrivelse</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Kort beskrivelse av hva malen dekker" rows={2} />
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Servicepunkter</h3>
              <Button variant="outline" size="sm" onClick={addField}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Legg til
              </Button>
            </div>

            {fields.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6 border rounded-lg border-dashed">
                Ingen servicepunkter ennå. Legg til sjekkpunkter, målinger eller vurderinger.
              </p>
            )}

            <div className="space-y-2">
              {fields.map((field, index) => (
                <div key={index} className="border rounded-lg p-3 space-y-2 bg-card">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                    <Input
                      value={field.label}
                      onChange={e => updateField(index, { label: e.target.value })}
                      placeholder="Beskrivelse av servicepunkt"
                      className="flex-1 h-8 text-sm"
                    />
                    <div className="flex gap-0.5">
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
                  <div className="flex gap-2 pl-6">
                    <Select value={field.field_type} onValueChange={v => updateField(index, { field_type: v })}>
                      <SelectTrigger className="h-7 text-xs w-[140px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(FIELD_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {field.field_type === "measurement" && (
                      <Input
                        value={field.unit}
                        onChange={e => updateField(index, { unit: e.target.value })}
                        placeholder="Enhet (°C, bar, kW...)"
                        className="h-7 text-xs w-32"
                      />
                    )}
                  </div>
                </div>
              ))}
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
