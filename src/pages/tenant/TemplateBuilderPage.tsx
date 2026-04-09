import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import TemplateAiAssist from "@/components/templates/TemplateAiAssist";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import TemplateBuilderHeader from "@/components/templates/TemplateBuilderHeader";
import WebFormPublishPanel from "@/components/templates/WebFormPublishPanel";
import FieldPalette from "@/components/templates/FieldPalette";
import SuggestedFields from "@/components/templates/SuggestedFields";
import FieldCanvas, { type TemplateField } from "@/components/templates/FieldCanvas";
import FieldSettingsPanel, { FieldSettingsEmpty } from "@/components/templates/FieldSettingsPanel";
import { buildFullPreset, getSuggestedFields, CATEGORY_TO_CONTEXT, type PresetField } from "@/lib/template-presets";
import { setAsDefault, clearDefault } from "@/hooks/useDefaultTemplate";

const WEB_FORM_TYPES = [
  { value: "contact", label: "Kontaktskjema" },
  { value: "service", label: "Bestill service" },
  { value: "quote", label: "Be om pris" },
  { value: "site_visit", label: "Bestill befaring" },
  { value: "general", label: "Generell henvendelse" },
];

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").substring(0, 40);
}

function generatePublishKey(): string {
  return crypto.randomUUID().replace(/-/g, "").substring(0, 16);
}

function emptyField(type: string, sortOrder: number): TemplateField {
  return {
    field_type: type, field_key: "", label: "", unit: "",
    help_text: "", is_required: false, default_value: null,
    options: null, sort_order: sortOrder,
  };
}

export default function TemplateBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tenantId, user } = useAuth();
  const isEdit = !!id;

  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"unsaved" | "saving" | "saved">("unsaved");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("service");
  const [templateKey, setTemplateKey] = useState("");
  const [useContext, setUseContext] = useState("");
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [hasAppliedPreset, setHasAppliedPreset] = useState(false);
  const [isDefault, setIsDefault] = useState(false);
  
  // Publish state
  const [isPublished, setIsPublished] = useState(false);
  const [publishKey, setPublishKey] = useState<string | null>(null);
  const [webFormType, setWebFormType] = useState("contact");
  const [successMessage, setSuccessMessage] = useState("Takk for din henvendelse! Vi tar kontakt så snart som mulig.");
  const [copiedEmbed, setCopiedEmbed] = useState(false);

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
      const t = tmpl as any;
      setName(t.name || "");
      setDescription(t.description || "");
      setCategory(t.category || "service");
      setTemplateKey(t.template_key || "");
      setUseContext(t.use_context || "");
      setIsDefault(t.is_default || false);
      setIsPublished(t.is_published || false);
      setPublishKey(t.publish_key || null);
      setWebFormType(t.web_form_type || "contact");
      setSuccessMessage(t.success_message || "Takk for din henvendelse! Vi tar kontakt så snart som mulig.");
      setHasAppliedPreset(true);

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
      setSaveStatus("saved");
    })();
  }, [id, tenantId, navigate]);

  useEffect(() => {
    if (!id) setLoading(false);
  }, [id]);

  const handleCategoryChange = useCallback((newCategory: string) => {
    setCategory(newCategory);
    setSaveStatus("unsaved");
    const ctx = CATEGORY_TO_CONTEXT[newCategory] || "";
    setUseContext(ctx);
    // Apply full preset for new templates or when no content yet
    if (!isEdit && fields.length <= 1) {
      setFields(buildFullPreset(newCategory));
      setSelectedIndex(null);
      setHasAppliedPreset(true);
    }
  }, [isEdit, fields.length]);

  // Apply initial preset for new templates
  useEffect(() => {
    if (!isEdit && !hasAppliedPreset && fields.length === 0) {
      setFields(buildFullPreset(category));
      setUseContext(CATEGORY_TO_CONTEXT[category] || "");
      setHasAppliedPreset(true);
    }
  }, [isEdit, hasAppliedPreset, fields.length, category]);

  const markUnsaved = useCallback(() => setSaveStatus("unsaved"), []);

  const addField = useCallback((type: string) => {
    const f = emptyField(type, fields.length);
    setFields(prev => [...prev, f]);
    setSelectedIndex(fields.length);
    markUnsaved();
  }, [fields.length, markUnsaved]);

  const insertAt = useCallback((type: string, afterIndex: number) => {
    const f = emptyField(type, afterIndex);
    setFields(prev => {
      const updated = [...prev.slice(0, afterIndex), f, ...prev.slice(afterIndex)];
      return updated.map((ff, i) => ({ ...ff, sort_order: i }));
    });
    setSelectedIndex(afterIndex);
    markUnsaved();
  }, [markUnsaved]);

  const addSuggestedField = useCallback((preset: PresetField) => {
    // Find the section this field belongs to, insert after last field in that section
    const sectionIdx = fields.findIndex(f => f.field_type === "section_header" && f.label === preset.section);
    let insertIdx = fields.length;
    if (sectionIdx >= 0) {
      // Find last field in this section
      insertIdx = sectionIdx + 1;
      for (let i = sectionIdx + 1; i < fields.length; i++) {
        if (fields[i].field_type === "section_header") break;
        insertIdx = i + 1;
      }
    }
    const newField: TemplateField = {
      field_type: preset.field_type,
      field_key: slugify(preset.label),
      label: preset.label,
      unit: preset.unit || "",
      help_text: preset.help_text || "",
      is_required: preset.is_required || false,
      default_value: null,
      options: preset.options || null,
      sort_order: insertIdx,
    };
    setFields(prev => {
      const updated = [...prev.slice(0, insertIdx), newField, ...prev.slice(insertIdx)];
      return updated.map((ff, i) => ({ ...ff, sort_order: i }));
    });
    setSelectedIndex(insertIdx);
    markUnsaved();
    toast.success(`"${preset.label}" lagt til`);
  }, [fields, markUnsaved]);

  const applyFullPreset = useCallback(() => {
    // Merge: add missing suggested fields into existing structure
    const existingLabels = fields.map(f => f.label);
    const missing = getSuggestedFields(category, existingLabels);
    if (missing.length === 0) {
      toast.info("Alle anbefalte felt er allerede lagt til");
      return;
    }
    let updated = [...fields];
    for (const pf of missing) {
      const sectionIdx = updated.findIndex(f => f.field_type === "section_header" && f.label === pf.section);
      let insertIdx = updated.length;
      if (sectionIdx >= 0) {
        insertIdx = sectionIdx + 1;
        for (let i = sectionIdx + 1; i < updated.length; i++) {
          if (updated[i].field_type === "section_header") break;
          insertIdx = i + 1;
        }
      }
      updated = [
        ...updated.slice(0, insertIdx),
        {
          field_type: pf.field_type,
          field_key: slugify(pf.label),
          label: pf.label,
          unit: pf.unit || "",
          help_text: pf.help_text || "",
          is_required: pf.is_required || false,
          default_value: null,
          options: pf.options || null,
          sort_order: 0,
        },
        ...updated.slice(insertIdx),
      ];
    }
    setFields(updated.map((f, i) => ({ ...f, sort_order: i })));
    markUnsaved();
    toast.success(`${missing.length} felt lagt til`);
  }, [fields, category, markUnsaved]);

  const handleAiApply = useCallback((aiFields: TemplateField[], mode: "replace" | "merge") => {
    if (mode === "replace") {
      setFields(aiFields.map((f, i) => ({ ...f, sort_order: i })));
    } else {
      setFields(prev => [...prev, ...aiFields].map((f, i) => ({ ...f, sort_order: i })));
    }
    setSelectedIndex(null);
    markUnsaved();
  }, [markUnsaved]);

  const updateField = useCallback((index: number, updates: Partial<TemplateField>) => {
    setFields(prev => prev.map((f, i) => i === index ? { ...f, ...updates } : f));
    markUnsaved();
  }, [markUnsaved]);

  const removeField = useCallback((index: number) => {
    setFields(prev => prev.filter((_, i) => i !== index).map((f, i) => ({ ...f, sort_order: i })));
    setSelectedIndex(null);
    markUnsaved();
  }, [markUnsaved]);

  const moveField = useCallback((index: number, direction: -1 | 1) => {
    const target = index + direction;
    setFields(prev => {
      if (target < 0 || target >= prev.length) return prev;
      const updated = [...prev];
      [updated[index], updated[target]] = [updated[target], updated[index]];
      return updated.map((f, i) => ({ ...f, sort_order: i }));
    });
    setSelectedIndex(index + direction);
    markUnsaved();
  }, [markUnsaved]);

  const duplicateField = useCallback((index: number) => {
    setFields(prev => {
      const copy = { ...prev[index], id: undefined, sort_order: index + 1, field_key: prev[index].field_key + "_copy" };
      const updated = [...prev.slice(0, index + 1), copy, ...prev.slice(index + 1)];
      return updated.map((f, i) => ({ ...f, sort_order: i }));
    });
    setSelectedIndex(index + 1);
    markUnsaved();
  }, [markUnsaved]);

  const handleSave = async () => {
    if (!tenantId || !name.trim()) { toast.error("Malnavn er påkrevd"); return; }
    const nonHeaders = fields.filter(f => f.field_type !== "section_header");
    if (nonHeaders.some(f => !f.label.trim())) { toast.error("Alle felt må ha en label"); return; }
    setSaving(true);
    setSaveStatus("saving");

    try {
      let templateId = id;
      const tKey = templateKey.trim() || slugify(name);

      const publishFields = category === "web" ? {
        is_published: isPublished,
        publish_key: publishKey || (isPublished ? generatePublishKey() : null),
        web_form_type: webFormType,
        success_message: successMessage.trim() || null,
      } : {};

      if (isEdit) {
        await supabase.from("service_templates" as any).update({
          name: name.trim(), description: description.trim() || null,
          category, template_key: tKey, use_context: useContext || null,
          ...publishFields,
        }).eq("id", templateId);
        // If we just generated a publish_key, store it locally
        if (publishFields.publish_key && !publishKey) {
          setPublishKey(publishFields.publish_key);
        }
        await supabase.from("service_template_fields" as any).delete().eq("template_id", templateId);
      } else {
        const { data, error } = await (supabase
          .from("service_templates" as any)
          .insert({
            tenant_id: tenantId, name: name.trim(), description: description.trim() || null,
            category, template_key: tKey, created_by: user?.id,
            use_context: useContext || null,
            ...publishFields,
          })
          .select("id")
          .single() as any);
        if (error) throw error;
        templateId = data.id;
        if (publishFields.publish_key) setPublishKey(publishFields.publish_key);
      }

      if (fields.length > 0) {
        const fieldRows = fields.map((f, i) => ({
          template_id: templateId, tenant_id: tenantId,
          field_type: f.field_type, field_key: f.field_key.trim() || slugify(f.label),
          label: f.label.trim(), unit: f.unit.trim() || null,
          help_text: f.help_text.trim() || null, is_required: f.is_required,
          default_value: f.default_value, options: f.options, sort_order: i,
        }));
        const { error } = await supabase.from("service_template_fields" as any).insert(fieldRows);
        if (error) throw error;
      }

      toast.success(isEdit ? "Mal oppdatert" : "Mal opprettet");
      setSaveStatus("saved");
      if (!isEdit) navigate(`/tenant/templates/${templateId}`);
    } catch {
      toast.error("Kunne ikke lagre mal");
      setSaveStatus("unsaved");
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
          use_context: useContext || null,
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

  const handleToggleDefault = async () => {
    if (!tenantId || !id || !useContext) return;
    if (isDefault) {
      await clearDefault(id);
      setIsDefault(false);
      toast.success("Standardmal fjernet");
    } else {
      await setAsDefault(id, useContext, tenantId);
      setIsDefault(true);
      toast.success("Satt som standard");
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
  const existingLabels = fields.map(f => f.label);

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      <TemplateBuilderHeader
        name={name}
        category={category}
        useContext={useContext}
        saveStatus={saveStatus}
        onNameChange={v => { setName(v); markUnsaved(); if (!templateKey || templateKey === slugify(name)) setTemplateKey(slugify(v)); }}
        onCategoryChange={handleCategoryChange}
        onUseContextChange={v => { setUseContext(v); markUnsaved(); }}
        onSave={handleSave}
        onDuplicate={isEdit ? handleDuplicate : undefined}
        saving={saving}
        isEdit={isEdit}
        previewMode={previewMode}
        onTogglePreview={() => { setPreviewMode(p => !p); setSelectedIndex(null); }}
        isDefault={isDefault}
        onToggleDefault={isEdit ? handleToggleDefault : undefined}
      />

      <div className="flex flex-1 min-h-0">
        {/* Left: Palette + Suggested — hidden in preview */}
        {!previewMode && (
          <aside className="w-52 border-r border-border bg-card shrink-0">
            <ScrollArea className="h-full">
              <div className="p-3 space-y-6">
                <FieldPalette onAddField={addField} />
                <SuggestedFields
                  category={category}
                  existingLabels={existingLabels}
                  onAddSuggested={addSuggestedField}
                  onApplyFullPreset={applyFullPreset}
                  hasContent={fields.length > 0}
                />
              </div>
            </ScrollArea>
          </aside>
        )}

        {/* Center: Canvas */}
        <div className="flex-1 bg-muted/30 overflow-auto">
          <div className={`max-w-2xl mx-auto py-6 px-4 ${previewMode ? "max-w-xl" : ""}`}>
            {!previewMode && (
              <>
              <div className="mb-6 space-y-3 bg-card rounded-lg border border-border p-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Beskrivelse</Label>
                  <Textarea
                    value={description}
                    onChange={e => { setDescription(e.target.value); markUnsaved(); }}
                    placeholder="Hva dekker denne malen?"
                    rows={2}
                    className="text-sm resize-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Malnøkkel</Label>
                  <Input
                    value={templateKey}
                    onChange={e => { setTemplateKey(e.target.value); markUnsaved(); }}
                    placeholder="auto-generert"
                    className="text-xs font-mono h-8"
                  />
                </div>
              </div>

              {/* Web form publish section */}
              {category === "web" && (
                <WebFormPublishPanel
                  isPublished={isPublished}
                  publishKey={publishKey}
                  webFormType={webFormType}
                  successMessage={successMessage}
                  onTogglePublish={(v) => { setIsPublished(v); if (v && !publishKey) setPublishKey(generatePublishKey()); markUnsaved(); }}
                  onFormTypeChange={(v) => { setWebFormType(v); markUnsaved(); }}
                  onSuccessMessageChange={(v) => { setSuccessMessage(v); markUnsaved(); }}
                  isEdit={isEdit}
                  isSaved={saveStatus === "saved"}
                />
              )}
              </>
            )}

            {/* AI Assist */}
            {!previewMode && (
              <div className="mb-4">
                <TemplateAiAssist
                  category={category}
                  fields={fields}
                  onApplyFields={handleAiApply}
                />
              </div>
            )}
            {previewMode && (
              <div className="mb-6 text-center">
                <h2 className="text-lg font-semibold">{name || "Uten navn"}</h2>
                {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
              </div>
            )}

            <div className={`bg-card rounded-lg border border-border p-5 min-h-[300px] ${previewMode ? "shadow-sm" : ""}`}>
              <FieldCanvas
                fields={fields}
                selectedIndex={previewMode ? null : selectedIndex}
                onSelect={previewMode ? () => {} : setSelectedIndex}
                onMove={moveField}
                onRemove={removeField}
                onDuplicate={duplicateField}
                onAddField={addField}
                onInsertAt={insertAt}
                onUpdateField={updateField}
                previewMode={previewMode}
              />
            </div>
          </div>
        </div>

        {/* Right: Settings — hidden in preview */}
        {!previewMode && (
          <aside className="w-64 border-l border-border bg-card shrink-0">
            <ScrollArea className="h-full">
              <div className="p-4">
                {selectedField ? (
                  <FieldSettingsPanel
                    field={selectedField}
                    onChange={updates => updateField(selectedIndex!, updates)}
                  />
                ) : (
                  <FieldSettingsEmpty />
                )}
              </div>
            </ScrollArea>
          </aside>
        )}
      </div>
    </div>
  );
}

/* ─── Web Form Publish Section ─── */
function WebFormPublishSection({
  isPublished, publishKey, webFormType, successMessage,
  onTogglePublish, onFormTypeChange, onSuccessMessageChange,
  isEdit, copiedEmbed, onCopyEmbed,
}: {
  isPublished: boolean;
  publishKey: string | null;
  webFormType: string;
  successMessage: string;
  onTogglePublish: (v: boolean) => void;
  onFormTypeChange: (v: string) => void;
  onSuccessMessageChange: (v: string) => void;
  isEdit: boolean;
  copiedEmbed: boolean;
  onCopyEmbed: () => void;
}) {
  const publicUrl = publishKey ? `${window.location.origin}/forms/${publishKey}` : null;
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "";
  const embedCode = publicUrl
    ? `<iframe src="${publicUrl}" width="100%" height="600" frameborder="0" style="border:none; max-width:600px;"></iframe>`
    : "";

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    onCopyEmbed();
  };

  return (
    <Card className="mb-6 p-4 space-y-4 border-primary/20 bg-primary/5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Nettskjema</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{isPublished ? "Publisert" : "Ikke publisert"}</span>
          <Switch checked={isPublished} onCheckedChange={onTogglePublish} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Skjematype</Label>
        <Select value={webFormType} onValueChange={onFormTypeChange}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WEB_FORM_TYPES.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[10px] text-muted-foreground">
          {webFormType === "contact" && "Oppretter sak i Postkontoret"}
          {webFormType === "service" && "Oppretter serviceforespørsel i Postkontoret"}
          {webFormType === "quote" && "Oppretter ny lead/deal i CRM"}
          {webFormType === "site_visit" && "Oppretter befaringsforespørsel i CRM"}
          {webFormType === "general" && "Oppretter generell sak i Postkontoret"}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Suksessmelding</Label>
        <Textarea
          value={successMessage}
          onChange={e => onSuccessMessageChange(e.target.value)}
          rows={2}
          className="text-xs resize-none"
        />
      </div>

      {isPublished && publishKey && (
        <div className="space-y-3 pt-2 border-t border-border">
          <div className="space-y-1.5">
            <Label className="text-xs">Direkte lenke</Label>
            <div className="flex gap-1.5">
              <Input value={publicUrl || ""} readOnly className="text-xs font-mono h-8 flex-1" />
              <Button variant="outline" size="sm" className="h-8 shrink-0" onClick={() => handleCopy(publicUrl!)}>
                {copiedEmbed ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </Button>
              <Button variant="outline" size="sm" className="h-8 shrink-0" asChild>
                <a href={publicUrl!} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3" /></a>
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              <Code className="h-3 w-3" /> Embed-kode
            </Label>
            <div className="relative">
              <Textarea value={embedCode} readOnly rows={3} className="text-[10px] font-mono resize-none" />
              <Button
                variant="outline"
                size="sm"
                className="absolute top-1.5 right-1.5 h-6 text-[10px]"
                onClick={() => handleCopy(embedCode)}
              >
                {copiedEmbed ? "Kopiert!" : "Kopier"}
              </Button>
            </div>
          </div>

          {!isEdit && (
            <p className="text-[10px] text-amber-600">
              Lagre malen først for å aktivere publisering.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
