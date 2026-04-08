import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import TemplateBuilderHeader from "@/components/templates/TemplateBuilderHeader";
import FieldPalette from "@/components/templates/FieldPalette";
import FieldCanvas, { type TemplateField } from "@/components/templates/FieldCanvas";
import FieldSettingsPanel from "@/components/templates/FieldSettingsPanel";

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").substring(0, 40);
}

function emptyField(type: string, sortOrder: number): TemplateField {
  return {
    field_type: type,
    field_key: "",
    label: "",
    unit: "",
    help_text: "",
    is_required: false,
    default_value: null,
    options: null,
    sort_order: sortOrder,
  };
}

export default function TemplateBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tenantId, user } = useAuth();
  const isEdit = !!id;

  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("service");
  const [templateKey, setTemplateKey] = useState("");
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Load existing template
  useEffect(() => {
    if (!id || !tenantId) return;
    (async () => {
      const { data: tmpl } = await supabase
        .from("service_templates" as any)
        .select("*")
        .eq("id", id)
        .single();
      if (!tmpl) { navigate("/tenant/templates"); return; }
      setName((tmpl as any).name || "");
      setDescription((tmpl as any).description || "");
      setCategory((tmpl as any).category || "service");
      setTemplateKey((tmpl as any).template_key || "");

      const { data: fieldData } = await supabase
        .from("service_template_fields" as any)
        .select("*")
        .eq("template_id", id)
        .order("sort_order");
      setFields((fieldData || []).map((f: any) => ({
        id: f.id, field_type: f.field_type, field_key: f.field_key || "",
        label: f.label, unit: f.unit || "", help_text: f.help_text || "",
        is_required: f.is_required || false, default_value: f.default_value,
        options: f.options, sort_order: f.sort_order,
      })));
      setLoading(false);
    })();
  }, [id, tenantId, navigate]);

  // Start with category selection for new templates
  useEffect(() => {
    if (!id) setLoading(false);
  }, [id]);

  const addField = useCallback((type: string) => {
    const f = emptyField(type, fields.length);
    setFields(prev => [...prev, f]);
    setSelectedIndex(fields.length);
  }, [fields.length]);

  const updateField = useCallback((index: number, updates: Partial<TemplateField>) => {
    setFields(prev => prev.map((f, i) => i === index ? { ...f, ...updates } : f));
  }, []);

  const removeField = useCallback((index: number) => {
    setFields(prev => prev.filter((_, i) => i !== index).map((f, i) => ({ ...f, sort_order: i })));
    setSelectedIndex(null);
  }, []);

  const moveField = useCallback((index: number, direction: -1 | 1) => {
    const target = index + direction;
    setFields(prev => {
      if (target < 0 || target >= prev.length) return prev;
      const updated = [...prev];
      [updated[index], updated[target]] = [updated[target], updated[index]];
      return updated.map((f, i) => ({ ...f, sort_order: i }));
    });
    setSelectedIndex(index + direction);
  }, []);

  const duplicateField = useCallback((index: number) => {
    setFields(prev => {
      const copy = { ...prev[index], id: undefined, sort_order: index + 1, field_key: prev[index].field_key + "_copy" };
      const updated = [...prev.slice(0, index + 1), copy, ...prev.slice(index + 1)];
      return updated.map((f, i) => ({ ...f, sort_order: i }));
    });
    setSelectedIndex(index + 1);
  }, []);

  const handleSave = async () => {
    if (!tenantId || !name.trim()) { toast.error("Malnavn er påkrevd"); return; }
    const nonHeaders = fields.filter(f => f.field_type !== "section_header");
    if (nonHeaders.some(f => !f.label.trim())) { toast.error("Alle felt må ha en label"); return; }
    setSaving(true);

    try {
      let templateId = id;
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
      navigate("/tenant/templates");
    } catch {
      toast.error("Kunne ikke lagre mal");
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async () => {
    if (!tenantId || !id) return;
    setSaving(true);
    try {
      const { data, error } = await (supabase
        .from("service_templates" as any)
        .insert({
          tenant_id: tenantId, name: name.trim() + " (kopi)",
          description: description.trim() || null, category,
          template_key: slugify(name) + "_copy", created_by: user?.id,
        })
        .select("id").single() as any);
      if (error) throw error;
      if (fields.length > 0) {
        const fieldRows = fields.map((f, i) => ({
          template_id: data.id, tenant_id: tenantId,
          field_type: f.field_type, field_key: f.field_key.trim() || slugify(f.label),
          label: f.label.trim(), unit: f.unit.trim() || null,
          help_text: f.help_text.trim() || null, is_required: f.is_required,
          default_value: f.default_value, options: f.options, sort_order: i,
        }));
        await supabase.from("service_template_fields" as any).insert(fieldRows);
      }
      toast.success("Mal duplisert");
      navigate(`/tenant/templates/${data.id}`);
    } catch {
      toast.error("Kunne ikke duplisere");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const selectedField = selectedIndex !== null ? fields[selectedIndex] : null;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      <TemplateBuilderHeader
        name={name}
        category={category}
        onNameChange={v => { setName(v); if (!templateKey || templateKey === slugify(name)) setTemplateKey(slugify(v)); }}
        onCategoryChange={setCategory}
        onSave={handleSave}
        onDuplicate={isEdit ? handleDuplicate : undefined}
        saving={saving}
        isEdit={isEdit}
      />

      <div className="flex flex-1 min-h-0">
        {/* Left: Palette */}
        <aside className="w-52 border-r border-border bg-card shrink-0">
          <ScrollArea className="h-full">
            <div className="p-3">
              <FieldPalette onAddField={addField} />
            </div>
          </ScrollArea>
        </aside>

        {/* Center: Canvas */}
        <div className="flex-1 bg-muted/30 overflow-auto">
          <div className="max-w-2xl mx-auto py-6 px-4">
            {/* Template meta top area */}
            <div className="mb-6 space-y-3 bg-card rounded-lg border border-border p-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Beskrivelse</Label>
                <Textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Hva dekker denne malen?"
                  rows={2}
                  className="text-sm resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Malnøkkel</Label>
                <Input
                  value={templateKey}
                  onChange={e => setTemplateKey(e.target.value)}
                  placeholder="auto-generert"
                  className="text-xs font-mono h-8"
                />
              </div>
            </div>

            {/* Canvas */}
            <div className="bg-card rounded-lg border border-border p-4 min-h-[300px]">
              <FieldCanvas
                fields={fields}
                selectedIndex={selectedIndex}
                onSelect={setSelectedIndex}
                onMove={moveField}
                onRemove={removeField}
                onDuplicate={duplicateField}
                onAddField={addField}
              />
            </div>
          </div>
        </div>

        {/* Right: Settings */}
        <aside className="w-64 border-l border-border bg-card shrink-0">
          <ScrollArea className="h-full">
            <div className="p-4">
              {selectedField ? (
                <FieldSettingsPanel
                  field={selectedField}
                  onChange={updates => updateField(selectedIndex!, updates)}
                />
              ) : (
                <div className="text-center py-12">
                  <p className="text-xs text-muted-foreground">
                    Velg et felt i skjemaet for å se innstillinger
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </aside>
      </div>
    </div>
  );
}
