import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useJobDetail } from "@/hooks/useJobDetail";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Loader2, ArrowLeft, Info, Users, ClipboardCheck, FileText, Pencil, CalendarDays, ExternalLink, X, Save, ClipboardList } from "lucide-react";
import {
  JOB_STATUS_LABELS, JOB_STATUS_COLORS, JOB_TYPE_LABELS,
  formatDate, formatDateTime,
} from "@/lib/domain-labels";
import { CASE_PRIORITY_LABELS, CASE_PRIORITY_COLOR } from "@/lib/case-labels";
import { DocumentUploadSection } from "@/components/crud/DocumentUploadSection";
import { ChecklistSection } from "@/components/crud/ChecklistSection";
import { ScheduleEventDialog } from "@/components/crud/ScheduleEventDialog";
import { DynamicFormRenderer, type TemplateField } from "@/components/service/DynamicFormRenderer";
import { FormSignoffSection, DEFAULT_SIGNOFF } from "@/components/forms/FormSignoffSection";
import { FormPdfActions } from "@/components/forms/FormPdfActions";
import type { SignoffData } from "@/lib/form-pdf";
import { toast } from "sonner";

/* ─── Form data structure ──────────────────────────────────────── */
interface FormDataPayload {
  schema_version: number;
  template_id: string;
  template_key: string;
  values: Record<string, any>;
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { job, company, contact, site, asset, deal, technicians, checklists, documents } = useJobDetail(id);
  const { tenantId } = useAuth();
  const qc = useQueryClient();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [linkedEvent, setLinkedEvent] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "", status: "planned", job_type: "installation", priority: "normal",
    scheduled_start: "", scheduled_end: "", description: "", notes: "",
  });

  // Form/schema state
  const [formSheetOpen, setFormSheetOpen] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [savingForm, setSavingForm] = useState(false);
  const [markCompleted, setMarkCompleted] = useState(false);
  const [formSignoff, setFormSignoff] = useState<SignoffData>({ ...DEFAULT_SIGNOFF });

  useEffect(() => {
    if (!id || !tenantId) return;
    supabase.from("events").select("id, start_time, end_time, status").eq("job_id", id).is("deleted_at", null).limit(1)
      .then(({ data }) => { if (data && data.length > 0) setLinkedEvent(data[0]); });
  }, [id, tenantId, scheduleOpen]);

  const jobData = job.data;
  const isServiceJob = jobData?.job_type === "service";
  const isInstallationJob = jobData?.job_type === "installation";

  // Fetch linked service_visit for service jobs
  const linkedVisit = useQuery({
    queryKey: ["job-linked-visit", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("service_visits")
        .select("*, agreement:service_agreements(id, agreement_number, service_template_id)")
        .eq("job_id", id!)
        .limit(1);
      return (data as any[])?.[0] || null;
    },
    enabled: !!id && !!tenantId && isServiceJob,
  });

  // Determine the category of templates to fetch
  const templateCategory = isServiceJob ? "service" : "installation";

  // Fetch templates for the relevant category
  const categoryTemplates = useQuery({
    queryKey: ["category-templates", tenantId, templateCategory],
    queryFn: async () => {
      const { data } = await supabase
        .from("service_templates")
        .select("id, name, template_key, category, is_active, is_default, use_context")
        .eq("tenant_id", tenantId!)
        .eq("category", templateCategory)
        .eq("is_active", true)
        .order("name");
      return (data as any[]) || [];
    },
    enabled: !!tenantId && (isServiceJob || isInstallationJob),
  });

  // Determine effective template id
  const existingFormData = jobData?.form_data as unknown as FormDataPayload | null;
  const hasExistingForm = existingFormData && existingFormData.schema_version === 1 && existingFormData.template_id;

  // For service jobs with linked visit, check if visit has report_data
  const visitReportData = linkedVisit.data?.report_data as FormDataPayload | null;
  const visitHasReport = visitReportData && visitReportData.schema_version === 1 && visitReportData.template_id;

  // For service jobs: template comes from agreement → visit → default
  // For installation jobs: template comes from job → default
  const serviceTemplateFromAgreement = linkedVisit.data?.agreement?.service_template_id;

  const effectiveTemplateId = selectedTemplateId
    || (hasExistingForm ? existingFormData.template_id : null)
    || (visitHasReport ? visitReportData.template_id : null)
    || (isServiceJob ? serviceTemplateFromAgreement : null)
    || ((jobData as any)?.installation_template_id || null);

  // Auto-select default template if none set
  useEffect(() => {
    if (!effectiveTemplateId && categoryTemplates.data?.length) {
      const def = categoryTemplates.data.find((t: any) => t.is_default);
      if (def) setSelectedTemplateId(def.id);
    }
  }, [effectiveTemplateId, categoryTemplates.data]);

  // Fetch template fields for the effective template
  const templateFields = useQuery({
    queryKey: ["template-fields", effectiveTemplateId],
    queryFn: async () => {
      const { data } = await supabase
        .from("service_template_fields")
        .select("*")
        .eq("template_id", effectiveTemplateId!)
        .order("sort_order");
      return (data as TemplateField[]) || [];
    },
    enabled: !!effectiveTemplateId,
  });

  // Show Skjema tab for installation, service jobs, or jobs with form_data
  const showFormTab = isInstallationJob || isServiceJob || !!hasExistingForm;

  // For service jobs: form data lives on service_visit.report_data
  // For installation jobs: form data lives on jobs.form_data
  const effectiveFormData = isServiceJob && visitHasReport
    ? visitReportData
    : hasExistingForm ? existingFormData : null;
  const hasEffectiveForm = !!effectiveFormData;

  const openFormSheet = useCallback(() => {
    if (hasEffectiveForm) {
      setFormValues(effectiveFormData!.values || {});
      setFormSignoff((effectiveFormData as any)?.signoff || { ...DEFAULT_SIGNOFF });
    } else {
      setFormValues({});
      setFormSignoff({ ...DEFAULT_SIGNOFF });
    }
    setMarkCompleted(false);
    setFormSheetOpen(true);
  }, [hasEffectiveForm, effectiveFormData]);

  const saveFormData = async () => {
    if (!id || !effectiveTemplateId) return;
    setSavingForm(true);
    const template = categoryTemplates.data?.find((t: any) => t.id === effectiveTemplateId);
    const payload: FormDataPayload = {
      schema_version: 1,
      template_id: effectiveTemplateId,
      template_key: template?.template_key || "",
      values: formValues,
    };

    if (isServiceJob && linkedVisit.data) {
      // Save to service_visit.report_data
      const updatePayload: any = { report_data: payload as any };
      if (markCompleted && linkedVisit.data.status !== "completed") {
        updatePayload.status = "completed";
        updatePayload.completed_at = new Date().toISOString();
      }
      const { error } = await supabase.from("service_visits").update(updatePayload).eq("id", linkedVisit.data.id);
      if (error) { toast.error(error.message); setSavingForm(false); return; }
      toast.success(markCompleted ? "Skjema lagret og besøk fullført" : "Serviceskjema lagret");
      linkedVisit.refetch();
    } else {
      // Save to jobs.form_data
      const { error } = await supabase.from("jobs").update({
        form_data: payload as any,
        installation_template_id: effectiveTemplateId,
      }).eq("id", id);
      if (error) { toast.error(error.message); setSavingForm(false); return; }
      toast.success("Skjema lagret");
      qc.invalidateQueries({ queryKey: ["job", id] });
    }

    setSavingForm(false);
    setFormSheetOpen(false);
  };

  const startEditing = () => {
    if (!jobData) return;
    const j = jobData;
    setEditForm({
      title: j.title || "",
      status: j.status || "planned",
      job_type: j.job_type || "installation",
      priority: j.priority || "normal",
      scheduled_start: j.scheduled_start ? j.scheduled_start.slice(0, 16) : "",
      scheduled_end: j.scheduled_end ? j.scheduled_end.slice(0, 16) : "",
      description: j.description || "",
      notes: j.notes || "",
    });
    setIsEditing(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("jobs").update({
        title: editForm.title,
        status: editForm.status as any,
        job_type: editForm.job_type as any,
        priority: editForm.priority as any,
        scheduled_start: editForm.scheduled_start || null,
        scheduled_end: editForm.scheduled_end || null,
        description: editForm.description || null,
        notes: editForm.notes || null,
      }).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Jobb oppdatert");
      qc.invalidateQueries({ queryKey: ["job", id] });
      setIsEditing(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const setField = (key: string, val: string) => setEditForm(f => ({ ...f, [key]: val }));

  if (job.isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!jobData) {
    return <div className="text-center py-20 text-muted-foreground">Jobb ikke funnet</div>;
  }

  const j = jobData;

  const formTabLabel = isServiceJob ? "Serviceskjema" : "Skjema";
  const formSheetTitle = isServiceJob
    ? (hasEffectiveForm ? "Rediger serviceskjema" : "Fyll ut serviceskjema")
    : (hasEffectiveForm ? "Rediger installasjonsskjema" : "Fyll ut installasjonsskjema");
  const templateLabel = isServiceJob ? "servicemal" : "installasjonsmal";

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{j.job_number}</h1>
            {!isEditing && (
              <>
                <Badge className={JOB_STATUS_COLORS[j.status] || ""}>{JOB_STATUS_LABELS[j.status] || j.status}</Badge>
                <Badge variant="outline">{JOB_TYPE_LABELS[j.job_type] || j.job_type}</Badge>
                <span className={`text-sm font-medium ${CASE_PRIORITY_COLOR[j.priority as keyof typeof CASE_PRIORITY_COLOR] || ""}`}>
                  {CASE_PRIORITY_LABELS[j.priority as keyof typeof CASE_PRIORITY_LABELS] || j.priority}
                </span>
                {/* Form status badge */}
                {showFormTab && (
                  hasEffectiveForm
                    ? <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 gap-1"><ClipboardList className="h-3 w-3" />Skjema utfylt</Badge>
                    : effectiveTemplateId
                      ? <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-200 gap-1"><ClipboardList className="h-3 w-3" />Skjema mangler</Badge>
                      : null
                )}
              </>
            )}
            {isEditing ? (
              <div className="flex gap-2">
                <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !editForm.title} className="gap-1">
                  <Save className="h-3 w-3" />{saveMutation.isPending ? "Lagrer..." : "Lagre"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} className="gap-1">
                  <X className="h-3 w-3" />Avbryt
                </Button>
              </div>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={startEditing}><Pencil className="h-3 w-3 mr-1" />Rediger</Button>
                {linkedEvent ? (
                  <Link to="/tenant/ressursplanlegger">
                    <Button variant="outline" size="sm" className="gap-1"><CalendarDays className="h-3 w-3" />Se i kalender<ExternalLink className="h-3 w-3" /></Button>
                  </Link>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setScheduleOpen(true)} className="gap-1"><CalendarDays className="h-3 w-3" />Planlegg</Button>
                )}
              </>
            )}
          </div>
          {isEditing ? (
            <Input value={editForm.title} onChange={e => setField("title", e.target.value)} className="text-lg mt-1 font-medium" placeholder="Tittel *" />
          ) : (
            <p className="text-lg mt-1">{j.title}</p>
          )}
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-2">
            {company.data && <Link to={`/tenant/crm/companies/${company.data.id}`} className="text-primary hover:underline">{company.data.name}</Link>}
            {contact.data && <span>{contact.data.first_name} {contact.data.last_name || ""}</span>}
            {site.data && <span>{site.data.address}, {site.data.city}</span>}
            {asset.data && <Link to={`/tenant/crm/assets/${asset.data.id}`} className="text-primary hover:underline">{asset.data.manufacturer} {asset.data.model || ""}</Link>}
            {deal.data && <Link to={`/tenant/crm/deals/${deal.data.id}`} className="text-primary hover:underline flex items-center gap-1"><ExternalLink className="h-3 w-3" />Deal: {deal.data.title}</Link>}
            {isServiceJob && linkedVisit.data?.agreement && (
              <Link to={`/tenant/crm/agreements/${linkedVisit.data.agreement.id}`} className="text-primary hover:underline flex items-center gap-1">
                <ClipboardList className="h-3 w-3" />Avtale: {linkedVisit.data.agreement.agreement_number}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Service job without linked visit info */}
      {isServiceJob && !linkedVisit.isLoading && !linkedVisit.data && (
        <Card className="p-4 border-amber-500/30 bg-amber-500/5">
          <p className="text-sm font-medium text-amber-700">Servicejobb uten avtale</p>
          <p className="text-xs text-muted-foreground mt-1">
            Denne servicejobben er ikke koblet til et servicebesøk eller en serviceavtale. Skjemadata lagres direkte på jobben.
          </p>
        </Card>
      )}

      <Tabs defaultValue="info">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="info" className="gap-1.5"><Info className="h-3.5 w-3.5" />Detaljer</TabsTrigger>
          <TabsTrigger value="technicians" className="gap-1.5"><Users className="h-3.5 w-3.5" />Teknikere ({technicians.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="checklists" className="gap-1.5"><ClipboardCheck className="h-3.5 w-3.5" />Sjekklister ({checklists.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="documents" className="gap-1.5"><FileText className="h-3.5 w-3.5" />Dokumenter ({documents.data?.length ?? 0})</TabsTrigger>
          {showFormTab && (
            <TabsTrigger value="form" className="gap-1.5">
              <ClipboardList className="h-3.5 w-3.5" />{formTabLabel}
              {hasEffectiveForm && <Badge variant="secondary" className="text-[9px] ml-1 px-1 py-0">Utfylt</Badge>}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="info" className="mt-4">
          <Card className="p-5">
            {isEditing ? (
              <div className="grid gap-4">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Status</Label>
                    <Select value={editForm.status} onValueChange={v => setField("status", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(JOB_STATUS_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Select value={editForm.job_type} onValueChange={v => setField("job_type", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(JOB_TYPE_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Prioritet</Label>
                    <Select value={editForm.priority} onValueChange={v => setField("priority", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(CASE_PRIORITY_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Planlagt start</Label><Input type="datetime-local" value={editForm.scheduled_start} onChange={e => setField("scheduled_start", e.target.value)} /></div>
                  <div><Label>Planlagt slutt</Label><Input type="datetime-local" value={editForm.scheduled_end} onChange={e => setField("scheduled_end", e.target.value)} /></div>
                </div>
                <div><Label>Beskrivelse</Label><Textarea value={editForm.description} onChange={e => setField("description", e.target.value)} rows={2} /></div>
                <div><Label>Notater</Label><Textarea value={editForm.notes} onChange={e => setField("notes", e.target.value)} rows={2} /></div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <Field label="Planlagt start" value={formatDateTime(j.scheduled_start)} />
                  <Field label="Planlagt slutt" value={formatDateTime(j.scheduled_end)} />
                  <Field label="Faktisk start" value={formatDateTime(j.actual_start)} />
                  <Field label="Faktisk slutt" value={formatDateTime(j.actual_end)} />
                  <Field label="Estimerte timer" value={j.estimated_hours ? `${j.estimated_hours} t` : null} />
                  <Field label="Opprettet" value={formatDate(j.created_at)} />
                </div>
                {j.description && <p className="text-sm mt-4 border-t pt-3">{j.description}</p>}
                {j.notes && <p className="text-sm text-muted-foreground mt-2">{j.notes}</p>}
              </>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="technicians" className="mt-4">
          {!technicians.data?.length ? <Empty text="Ingen teknikere tildelt" /> : (
            <div className="grid gap-3">
              {technicians.data.map(t => (
                <Card key={t.id} className="p-4 flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color || "#3b82f6" }} />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.email} · {t.phone}</p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="checklists" className="mt-4">
          <ChecklistSection checklists={checklists.data} jobId={id!} jobType={j.job_type} />
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <DocumentUploadSection
            documents={documents.data}
            entityType="job"
            entityId={id!}
            queryKey={["job-documents", id!]}
          />
        </TabsContent>

        {showFormTab && (
          <TabsContent value="form" className="mt-4">
            <Card className="p-5">
              {/* Template selector */}
              {!hasEffectiveForm && (categoryTemplates.data?.length ?? 0) > 1 && (
                <div className="mb-4">
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Velg {templateLabel}</Label>
                  <Select
                    value={effectiveTemplateId || ""}
                    onValueChange={(v) => setSelectedTemplateId(v)}
                  >
                    <SelectTrigger className="w-[280px]"><SelectValue placeholder="Velg mal..." /></SelectTrigger>
                    <SelectContent>
                      {(categoryTemplates.data || []).map((t: any) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}{t.is_default ? " ★" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {hasEffectiveForm && templateFields.data ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm font-medium">Utfylt {isServiceJob ? "serviceskjema" : "skjema"}</p>
                      <p className="text-xs text-muted-foreground">
                        Mal: {categoryTemplates.data?.find((t: any) => t.id === effectiveFormData!.template_id)?.name || effectiveFormData!.template_key || "Ukjent"}
                        {isServiceJob && linkedVisit.data && (
                          <span className="ml-2">· Lagret på servicebesøk</span>
                        )}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={openFormSheet} className="gap-1.5">
                      <Pencil className="h-3 w-3" />Rediger
                    </Button>
                  </div>
                  <DynamicFormRenderer
                    fields={templateFields.data}
                    values={effectiveFormData!.values || {}}
                    readonly
                  />
                </>
              ) : effectiveTemplateId ? (
                <div className="text-center py-8">
                  <ClipboardList className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm font-medium mb-1">{isServiceJob ? "Serviceskjema" : "Installasjonsskjema"}</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    {categoryTemplates.data?.find((t: any) => t.id === effectiveTemplateId)?.name || "Valgt mal"}
                  </p>
                  <Button onClick={openFormSheet} className="gap-1.5">
                    <ClipboardList className="h-4 w-4" />Fyll ut {isServiceJob ? "serviceskjema" : "installasjonsskjema"}
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <ClipboardList className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-1">Ingen {templateLabel} tilgjengelig</p>
                  <p className="text-xs text-muted-foreground">
                    Opprett en mal under <Link to="/tenant/templates" className="text-primary hover:underline font-medium">Skjemaer og maler</Link> med kategori "{isServiceJob ? "Service" : "Installasjon"}" for å bruke denne funksjonen.
                  </p>
                </div>
              )}
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <ScheduleEventDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        jobId={j.id}
        jobTitle={`${j.job_number} – ${j.title}`}
        companyName={company.data?.name}
        siteAddress={site.data ? `${site.data.address || ""}, ${site.data.city || ""}` : undefined}
        siteId={j.site_id || undefined}
        scheduledStart={j.scheduled_start}
        scheduledEnd={j.scheduled_end}
      />

      {/* Form fill sheet */}
      <Sheet open={formSheetOpen} onOpenChange={setFormSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{formSheetTitle}</SheetTitle>
          </SheetHeader>
          <div className="py-4">
            {templateFields.data ? (
              <DynamicFormRenderer
                fields={templateFields.data}
                values={formValues}
                onChange={(key, val) => setFormValues(prev => ({ ...prev, [key]: val }))}
              />
            ) : (
              <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            )}
          </div>
          <div className="space-y-3 pt-2 border-t">
            {isServiceJob && linkedVisit.data && linkedVisit.data.status !== "completed" && (
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={markCompleted} onCheckedChange={(c) => setMarkCompleted(!!c)} />
                <span className="text-sm font-medium">Markér servicebesøket som fullført</span>
              </label>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setFormSheetOpen(false)}>Avbryt</Button>
              <Button onClick={saveFormData} disabled={savingForm} className="gap-1.5">
                {savingForm && <Loader2 className="h-4 w-4 animate-spin" />}
                <Save className="h-4 w-4" />Lagre skjema
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
      <p className="mt-0.5">{value || "–"}</p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="text-center py-10 text-sm text-muted-foreground">{text}</div>;
}
