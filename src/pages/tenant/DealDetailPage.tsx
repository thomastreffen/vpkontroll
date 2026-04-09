import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Loader2, ArrowLeft, Building2, Contact, MapPin, Zap, Calendar, FileText,
  TrendingUp, Pencil, MessageSquare, Briefcase, Plus, ArrowRight, CheckCircle2,
  XCircle, Eye, Send, ChevronRight, ClipboardList, Phone, Mail, ScrollText, Search, Save,
} from "lucide-react";
import {
  DEAL_STAGE_LABELS, DEAL_STAGE_COLORS, DEAL_STAGE_ORDER, DEAL_STAGE_BG,
  PIPELINE_STAGES, formatCurrency, type DealStage, ACTIVITY_TYPE_LABELS,
  QUOTE_STATUS_LABELS, QUOTE_STATUS_COLORS,
} from "@/lib/crm-labels";
import { ENERGY_SOURCE_LABELS, JOB_TYPE_LABELS, AGREEMENT_INTERVAL_LABELS, SITE_TYPE_LABELS, formatDate, formatDateTime } from "@/lib/domain-labels";
import { EntityPickerDialog } from "@/components/postkontoret/EntityPickerDialog";
import { DynamicFormRenderer, type TemplateField } from "@/components/service/DynamicFormRenderer";
import { FormSignoffSection, DEFAULT_SIGNOFF } from "@/components/forms/FormSignoffSection";
import { FormPdfActions } from "@/components/forms/FormPdfActions";
import { QuoteSection } from "@/components/crm/QuoteSection";
import { SendDocumentSheet, type SendDocumentContext } from "@/components/communication/SendDocumentSheet";
import type { SignoffData } from "@/lib/form-pdf";

const JOB_TYPES = ["installation", "service", "repair", "warranty", "inspection", "decommission"];

/* ─── Stage progression config ────────────────────────────────── */
const STAGE_NEXT: Partial<Record<DealStage, { label: string; next: DealStage }>> = {
  lead: { label: "Kvalifiser", next: "qualified" },
  qualified: { label: "Planlegg befaring", next: "site_visit" },
  site_visit: { label: "Opprett tilbud", next: "quote_sent" },
  quote_sent: { label: "Til forhandling", next: "negotiation" },
  negotiation: { label: "Marker vunnet", next: "won" },
};

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { tenantId, user } = useAuth();
  const navigate = useNavigate();

  const [deal, setDeal] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [contact, setContact] = useState<any>(null);
  const [site, setSite] = useState<any>(null);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [linkedJob, setLinkedJob] = useState<any>(null);
  const [linkedAgreement, setLinkedAgreement] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Edit deal sheet
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [form, setForm] = useState({
    title: "", stage: "lead" as DealStage, value: "", company_id: "", contact_id: "",
    site_id: "", expected_close_date: "", description: "", energy_source: "",
    estimated_kw: "", site_visit_date: "", site_visit_notes: "",
  });

  // Create job sheet
  const [jobSheetOpen, setJobSheetOpen] = useState(false);
  const [creatingJob, setCreatingJob] = useState(false);
  const [jobForm, setJobForm] = useState({
    title: "", job_type: "installation", description: "", priority: "normal",
  });

  // (Quote state handled by QuoteSection)

  // Add note
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteBody, setNoteBody] = useState("");
  const [noteType, setNoteType] = useState<string>("note");

  // Create agreement sheet
  const [agreementSheetOpen, setAgreementSheetOpen] = useState(false);
  const [creatingAgreement, setCreatingAgreement] = useState(false);
  const [agreementForm, setAgreementForm] = useState({
    interval: "annual", start_date: "", annual_price: "", scope_description: "",
    custom_interval_months: "12",
  });

  // Assets for agreement
  const [dealAssets, setDealAssets] = useState<any[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState("");

  // Entity pickers for deal linking
  const [pickerOpen, setPickerOpen] = useState<{ type: "company" | "contact" | "site"; open: boolean }>({ type: "company", open: false });
  const [createCompanyOpen, setCreateCompanyOpen] = useState(false);
  const [createContactOpen, setCreateContactOpen] = useState(false);
  const [createSiteOpen, setCreateSiteOpen] = useState(false);
  const [newCompanyForm, setNewCompanyForm] = useState({ name: "", customer_type: "private", phone: "", email: "" });
  const [newContactForm, setNewContactForm] = useState({ first_name: "", last_name: "", email: "", phone: "" });
  const [newSiteForm, setNewSiteForm] = useState({ name: "", address: "", postal_code: "", city: "", site_type: "residential" });
  const [linkSaving, setLinkSaving] = useState(false);

  // Inspection form state
  const [inspectionFormOpen, setInspectionFormOpen] = useState(false);
  const [inspectionFormValues, setInspectionFormValues] = useState<Record<string, any>>({});
  const [inspectionSignoff, setInspectionSignoff] = useState<SignoffData>(DEFAULT_SIGNOFF);
  const [savingInspection, setSavingInspection] = useState(false);
  const [sendInspectionOpen, setSendInspectionOpen] = useState(false);

  // Fetch site_visit templates
  const siteVisitTemplates = useQuery({
    queryKey: ["site-visit-templates", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("service_templates")
        .select("id, name, template_key, is_default, use_context")
        .eq("tenant_id", tenantId!)
        .eq("is_active", true)
        .or("use_context.eq.site_visit,category.eq.befaring")
        .order("name");
      return (data as any[]) || [];
    },
    enabled: !!tenantId,
  });

  // Determine effective inspection template
  const dealTemplateId = deal?.site_visit_template_id;
  const defaultSiteVisitTemplate = siteVisitTemplates.data?.find((t: any) => t.is_default);
  const effectiveInspectionTemplateId = dealTemplateId || defaultSiteVisitTemplate?.id || null;

  // Fetch fields for the inspection template
  const inspectionFields = useQuery({
    queryKey: ["template-fields", effectiveInspectionTemplateId],
    queryFn: async () => {
      const { data } = await supabase
        .from("service_template_fields")
        .select("*")
        .eq("template_id", effectiveInspectionTemplateId!)
        .order("sort_order");
      return (data as TemplateField[]) || [];
    },
    enabled: !!effectiveInspectionTemplateId,
  });

  // Inspection form data from deal
  const inspectionData = deal?.site_visit_data as any;
  const hasInspectionForm = inspectionData?.schema_version === 1 && inspectionData?.template_id;
  const inspectionSignoffData = inspectionData?.signoff as SignoffData | undefined;
  const inspectionFormStatus = !effectiveInspectionTemplateId
    ? "no_template"
    : hasInspectionForm
      ? (Object.keys(inspectionData?.values || {}).length > 0 ? "filled" : "started")
      : "not_started";

  // Fetch existing PDF document for this deal
  const dealPdfDoc = useQuery({
    queryKey: ["deal-pdf", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("documents")
        .select("id, file_path, created_at")
        .eq("deal_id", id!)
        .eq("mime_type", "application/pdf")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1);
      return data?.[0] || null;
    },
    enabled: !!id,
  });

  /* ─── Data fetching ─────────────────────────────────────────── */
  const fetchDeal = useCallback(async () => {
    if (!id || !tenantId) return;
    setLoading(true);
    const { data: d } = await supabase.from("crm_deals").select("*").eq("id", id).single();
    if (!d) { setLoading(false); return; }
    setDeal(d);

    const fetches: (() => Promise<void>)[] = [];
    if (d.company_id) fetches.push(async () => { const { data } = await supabase.from("crm_companies").select("*").eq("id", d.company_id!).single(); setCompany(data); });
    else setCompany(null);
    if (d.contact_id) fetches.push(async () => { const { data } = await supabase.from("crm_contacts").select("*").eq("id", d.contact_id!).single(); setContact(data); });
    else setContact(null);
    if (d.site_id) fetches.push(async () => { const { data } = await supabase.from("customer_sites").select("*").eq("id", d.site_id!).single(); setSite(data); });
    else setSite(null);

    fetches.push(
      async () => { const { data } = await supabase.from("quotes").select("*").eq("deal_id", id!).is("deleted_at", null).order("version", { ascending: false }); setQuotes(data || []); },
      async () => { const { data } = await supabase.from("crm_activities").select("*").eq("deal_id", id!).order("created_at", { ascending: false }); setActivities(data || []); },
      async () => { const { data } = await (supabase.from("jobs").select("*") as any).eq("deal_id", id!).is("deleted_at", null).limit(1); setLinkedJob(data?.[0] || null); },
      async () => {
        // Check if agreement exists linked via job from this deal
        const { data: jobs } = await (supabase.from("jobs").select("id") as any).eq("deal_id", id!).is("deleted_at", null);
        if (jobs && jobs.length > 0) {
          const { data: ag } = await supabase.from("service_agreements").select("id, agreement_number, status").eq("company_id", d.company_id!).is("deleted_at", null).limit(1);
          setLinkedAgreement(ag?.[0] || null);
        } else {
          // Also check direct company match
          if (d.company_id) {
            const { data: ag } = await supabase.from("service_agreements").select("id, agreement_number, status").eq("company_id", d.company_id).is("deleted_at", null).limit(1);
            setLinkedAgreement(ag?.[0] || null);
          } else {
            setLinkedAgreement(null);
          }
        }
      },
    );

    await Promise.all(fetches.map(f => f()));
    setLoading(false);
  }, [id, tenantId]);

  useEffect(() => { fetchDeal(); }, [fetchDeal]);

  /* ─── Stage change with activity logging ────────────────────── */
  const changeStage = async (newStage: DealStage) => {
    if (!deal || !tenantId) return;
    const oldStage = deal.stage;
    const { error } = await supabase.from("crm_deals").update({
      stage: newStage,
      closed_at: (newStage === "won" || newStage === "lost") ? new Date().toISOString() : null,
    } as any).eq("id", deal.id);
    if (error) { toast.error("Kunne ikke endre fase"); return; }
    // Log stage change as activity
    await supabase.from("crm_activities").insert({
      tenant_id: tenantId,
      deal_id: deal.id,
      company_id: deal.company_id,
      type: "status_change",
      subject: `Fase endret: ${DEAL_STAGE_LABELS[oldStage as DealStage] || oldStage} → ${DEAL_STAGE_LABELS[newStage]}`,
      created_by: user?.id,
    } as any);
    toast.success(`Fase endret til ${DEAL_STAGE_LABELS[newStage]}`);
    fetchDeal();
  };

  /* ─── Link entity to deal ───────────────────────────────────── */
  const linkEntityToDeal = async (field: string, value: string) => {
    if (!deal) return;
    setLinkSaving(true);
    const { error } = await supabase.from("crm_deals").update({ [field]: value } as any).eq("id", deal.id);
    setLinkSaving(false);
    if (error) { toast.error("Kunne ikke koble til deal"); return; }
    toast.success("Tilknyttet deal");
    fetchDeal();
  };

  const handlePickerSelect = (type: "company" | "contact" | "site", entityId: string) => {
    const fieldMap = { company: "company_id", contact: "contact_id", site: "site_id" };
    linkEntityToDeal(fieldMap[type], entityId);
  };

  const createAndLinkCompany = async () => {
    if (!tenantId || !newCompanyForm.name.trim()) return;
    setLinkSaving(true);
    const { data, error } = await supabase.from("crm_companies").insert({
      tenant_id: tenantId, name: newCompanyForm.name.trim(),
      customer_type: newCompanyForm.customer_type as any,
      phone: newCompanyForm.phone || null, email: newCompanyForm.email || null,
      created_by: user?.id,
    }).select("id").single();
    if (error || !data) { setLinkSaving(false); toast.error("Kunne ikke opprette kunde"); return; }
    await linkEntityToDeal("company_id", data.id);
    setCreateCompanyOpen(false);
    setNewCompanyForm({ name: "", customer_type: "private", phone: "", email: "" });
  };

  const createAndLinkContact = async () => {
    if (!tenantId || !newContactForm.first_name.trim()) return;
    setLinkSaving(true);
    const { data, error } = await supabase.from("crm_contacts").insert({
      tenant_id: tenantId, first_name: newContactForm.first_name.trim(),
      last_name: newContactForm.last_name || null,
      email: newContactForm.email || null, phone: newContactForm.phone || null,
      company_id: deal?.company_id || null, created_by: user?.id,
    }).select("id").single();
    if (error || !data) { setLinkSaving(false); toast.error("Kunne ikke opprette kontakt"); return; }
    await linkEntityToDeal("contact_id", data.id);
    setCreateContactOpen(false);
    setNewContactForm({ first_name: "", last_name: "", email: "", phone: "" });
  };

  const createAndLinkSite = async () => {
    if (!tenantId || !deal?.company_id || !newSiteForm.address.trim()) return;
    setLinkSaving(true);
    const { data, error } = await supabase.from("customer_sites").insert({
      tenant_id: tenantId, company_id: deal.company_id,
      name: newSiteForm.name || null, address: newSiteForm.address.trim(),
      postal_code: newSiteForm.postal_code || null, city: newSiteForm.city || null,
      site_type: newSiteForm.site_type as any, created_by: user?.id,
    }).select("id").single();
    if (error || !data) { setLinkSaving(false); toast.error("Kunne ikke opprette anleggssted"); return; }
    await linkEntityToDeal("site_id", data.id);
    setCreateSiteOpen(false);
    setNewSiteForm({ name: "", address: "", postal_code: "", city: "", site_type: "residential" });
  };

  /* ─── Edit deal ─────────────────────────────────────────────── */
  const openEdit = async () => {
    if (!deal) return;
    const [{ data: cos }, { data: cts }, { data: sts }] = await Promise.all([
      supabase.from("crm_companies").select("id, name").eq("tenant_id", deal.tenant_id).is("deleted_at", null).order("name"),
      supabase.from("crm_contacts").select("id, first_name, last_name").eq("tenant_id", deal.tenant_id).is("deleted_at", null).order("first_name"),
      supabase.from("customer_sites").select("id, name, address").eq("tenant_id", deal.tenant_id).is("deleted_at", null).order("name"),
    ]);
    setCompanies(cos || []); setContacts(cts || []); setSites(sts || []);
    setForm({
      title: deal.title, stage: deal.stage, value: deal.value?.toString() || "",
      company_id: deal.company_id || "", contact_id: deal.contact_id || "",
      site_id: deal.site_id || "", expected_close_date: deal.expected_close_date || "",
      description: deal.description || "", energy_source: deal.energy_source || "",
      estimated_kw: deal.estimated_kw?.toString() || "",
      site_visit_date: deal.site_visit_date || "", site_visit_notes: deal.site_visit_notes || "",
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!deal || !form.title.trim()) return;
    setSaving(true);
    const oldStage = deal.stage;
    const { error } = await supabase.from("crm_deals").update({
      title: form.title.trim(), stage: form.stage,
      value: form.value ? parseFloat(form.value) : null,
      company_id: form.company_id || null, contact_id: form.contact_id || null,
      site_id: form.site_id || null,
      expected_close_date: form.expected_close_date || null,
      description: form.description || null,
      energy_source: form.energy_source || null,
      estimated_kw: form.estimated_kw ? parseFloat(form.estimated_kw) : null,
      site_visit_date: form.site_visit_date || null,
      site_visit_notes: form.site_visit_notes || null,
      closed_at: (form.stage === "won" || form.stage === "lost") ? new Date().toISOString() : null,
    } as any).eq("id", deal.id);
    setSaving(false);
    if (error) { toast.error("Kunne ikke lagre"); return; }
    // Log stage change if changed via edit
    if (form.stage !== oldStage && tenantId) {
      await supabase.from("crm_activities").insert({
        tenant_id: tenantId, deal_id: deal.id, company_id: form.company_id || null,
        type: "status_change",
        subject: `Fase endret: ${DEAL_STAGE_LABELS[oldStage as DealStage] || oldStage} → ${DEAL_STAGE_LABELS[form.stage]}`,
        created_by: user?.id,
      } as any);
    }
    toast.success("Deal oppdatert");
    setEditOpen(false);
    fetchDeal();
  };

  /* ─── Create job from deal ──────────────────────────────────── */
  const openCreateJob = () => {
    if (!deal) return;
    const descParts: string[] = [];
    if (deal.description) descParts.push(deal.description);
    if (deal.energy_source) descParts.push(`Energikilde: ${ENERGY_SOURCE_LABELS[deal.energy_source] || deal.energy_source}`);
    if (deal.estimated_kw) descParts.push(`Estimert kapasitet: ${deal.estimated_kw} kW`);
    if (deal.site_visit_notes) descParts.push(`Befaringsnotater: ${deal.site_visit_notes}`);

    setJobForm({
      title: `Installasjon – ${deal.title}`,
      job_type: "installation",
      description: descParts.join("\n"),
      priority: "normal",
    });
    setJobSheetOpen(true);
  };

  const createJob = async () => {
    if (!deal || !tenantId || !jobForm.title.trim()) return;
    setCreatingJob(true);
    const { data, error } = await supabase.from("jobs").insert({
      tenant_id: tenantId, title: jobForm.title.trim(), job_type: jobForm.job_type,
      description: jobForm.description || null, priority: jobForm.priority,
      company_id: deal.company_id || null, contact_id: deal.contact_id || null,
      site_id: deal.site_id || null, deal_id: deal.id, created_by: user?.id,
      job_number: "TEMP",
    } as any).select().single();
    setCreatingJob(false);
    if (error) { toast.error("Kunne ikke opprette jobb: " + error.message); return; }
    // Log activity
    await supabase.from("crm_activities").insert({
      tenant_id: tenantId, deal_id: deal.id, company_id: deal.company_id,
      type: "task", subject: `Jobb ${data.job_number} opprettet fra deal`, created_by: user?.id,
    } as any);
    toast.success(`Jobb ${data.job_number} opprettet`, {
      action: { label: "Gå til jobb", onClick: () => navigate(`/tenant/crm/jobs/${data.id}`) },
    });
    setJobSheetOpen(false);
    setLinkedJob(data);
    fetchDeal();
  };

  // (Quote create/update logic now in QuoteSection component)

  /* ─── Add activity note ─────────────────────────────────────── */
  const saveNote = async () => {
    if (!deal || !tenantId || !noteBody.trim()) return;
    await supabase.from("crm_activities").insert({
      tenant_id: tenantId, deal_id: deal.id, company_id: deal.company_id,
      type: noteType, body: noteBody.trim(),
      subject: noteType === "note" ? "Notat" : noteType === "call" ? "Samtalelogg" : noteType === "meeting" ? "Møtenotat" : "Aktivitet",
      created_by: user?.id,
    } as any);
    toast.success("Aktivitet lagt til");
    setNoteOpen(false);
    setNoteBody("");
    fetchDeal();
  };

  /* ─── Create agreement from deal ────────────────────────────── */
  const openCreateAgreement = async () => {
    if (!deal) return;
    // Fetch assets for the site if available
    if (deal.site_id && tenantId) {
      const { data } = await supabase.from("hvac_assets").select("id, manufacturer, model, serial_number").eq("site_id", deal.site_id).eq("tenant_id", tenantId).is("deleted_at", null);
      setDealAssets(data || []);
    } else {
      setDealAssets([]);
    }
    setSelectedAssetId("");
    const today = new Date().toISOString().slice(0, 10);
    setAgreementForm({
      interval: "annual",
      start_date: today,
      annual_price: "",
      scope_description: deal.energy_source ? `Serviceavtale for ${ENERGY_SOURCE_LABELS[deal.energy_source] || deal.energy_source}${deal.estimated_kw ? ` (${deal.estimated_kw} kW)` : ""}` : "",
      custom_interval_months: "12",
    });
    setAgreementSheetOpen(true);
  };

  const createAgreement = async () => {
    if (!deal || !tenantId || !agreementForm.start_date) return;
    if (!deal.company_id) { toast.error("Deal mangler kunde – kan ikke opprette avtale"); return; }
    setCreatingAgreement(true);
    const { data, error } = await supabase.from("service_agreements").insert({
      tenant_id: tenantId,
      company_id: deal.company_id,
      site_id: deal.site_id || null,
      asset_id: selectedAssetId || null,
      agreement_number: "TEMP",
      interval: agreementForm.interval,
      start_date: agreementForm.start_date,
      annual_price: agreementForm.annual_price ? parseFloat(agreementForm.annual_price) : null,
      scope_description: agreementForm.scope_description || null,
      next_visit_due: agreementForm.start_date,
      created_by: user?.id,
      custom_interval_months: agreementForm.interval === "custom" ? parseInt(agreementForm.custom_interval_months) || null : null,
    } as any).select().single();
    setCreatingAgreement(false);
    if (error) { toast.error("Kunne ikke opprette avtale: " + error.message); return; }
    // Log activity
    await supabase.from("crm_activities").insert({
      tenant_id: tenantId, deal_id: deal.id, company_id: deal.company_id,
      type: "task", subject: `Serviceavtale ${data.agreement_number} opprettet`,
      created_by: user?.id,
    } as any);
    toast.success(`Serviceavtale ${data.agreement_number} opprettet`, {
      action: { label: "Gå til avtale", onClick: () => navigate(`/tenant/crm/agreements/${data.id}`) },
    });
    setAgreementSheetOpen(false);
    setLinkedAgreement(data);
    fetchDeal();
  };

  /* ─── Render ────────────────────────────────────────────────── */
  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!deal) return <div className="text-center py-20 text-muted-foreground">Deal ikke funnet</div>;

  const stageColor = DEAL_STAGE_COLORS[deal.stage as DealStage] || "";
  const stageNext = STAGE_NEXT[deal.stage as DealStage];
  const isWon = deal.stage === "won";
  const isLost = deal.stage === "lost";
  const isClosed = isWon || isLost;

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/tenant/crm/deals"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold truncate">{deal.title}</h1>
            <Badge className={`text-xs ${stageColor}`}>{DEAL_STAGE_LABELS[deal.stage as DealStage] || deal.stage}</Badge>
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
            <span className="font-semibold text-foreground text-lg">{formatCurrency(deal.value as number | null)}</span>
            {deal.expected_close_date && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Forventet: {formatDate(deal.expected_close_date)}</span>}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={openEdit} className="gap-1.5">
          <Pencil className="h-3.5 w-3.5" />Rediger
        </Button>
      </div>

      {/* ── Stage progress bar ──────────────────────────────────── */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {PIPELINE_STAGES.map((s, i) => {
          const isActive = s === deal.stage;
          const isPast = DEAL_STAGE_ORDER.indexOf(s) < DEAL_STAGE_ORDER.indexOf(deal.stage as DealStage);
          return (
            <div key={s} className="flex items-center gap-1 flex-shrink-0">
              {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/40" />}
              <button
                onClick={() => !isClosed && changeStage(s)}
                disabled={isClosed}
                className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${
                  isActive ? "text-primary-foreground" : isPast ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
                style={isActive ? { backgroundColor: DEAL_STAGE_BG[s] } : undefined}
              >
                {DEAL_STAGE_LABELS[s]}
              </button>
            </div>
          );
        })}
        {isWon && <Badge className="ml-2 bg-emerald-500/10 text-emerald-600">✓ Vunnet</Badge>}
        {isLost && <Badge className="ml-2 bg-destructive/10 text-destructive">✕ Tapt</Badge>}
      </div>

      {/* ── Stage-aware action bar ──────────────────────────────── */}
      <Card className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          {!isClosed && stageNext && (
            <Button size="sm" onClick={() => {
              if (stageNext.next === "quote_sent") { changeStage("quote_sent"); return; }
              changeStage(stageNext.next);
            }} className="gap-1.5">
              <ArrowRight className="h-3.5 w-3.5" />{stageNext.label}
            </Button>
          )}
          {/* Stage-specific befaring CTA */}
          {!isClosed && (deal.stage === "site_visit" || deal.stage === "qualified") && effectiveInspectionTemplateId && !hasInspectionForm && (
            <Button size="sm" variant="default" className="gap-1.5" onClick={() => {
              setInspectionFormValues({});
              setInspectionFormOpen(true);
            }}>
              <ClipboardList className="h-3.5 w-3.5" />Fyll ut befaringsskjema
            </Button>
          )}
          {!isClosed && (
            <>
              <Button variant="outline" size="sm" onClick={() => { setNoteType("note"); setNoteBody(""); setNoteOpen(true); }} className="gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" />Legg til notat
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setNoteType("note"); setNoteBody(""); setNoteOpen(true); }} className="gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" />Legg til notat
              </Button>
              {!linkedJob && (
                <Button variant="outline" size="sm" onClick={openCreateJob} className="gap-1.5">
                  <Briefcase className="h-3.5 w-3.5" />Opprett jobb
                </Button>
              )}
            </>
          )}

          {/* Serviceavtale – alltid synlig, disabled med forklaring hvis krav ikke er oppfylt */}
          {(() => {
            const canCreate = isWon && deal.company_id && deal.site_id;
            const reasons: string[] = [];
            if (!isWon) reasons.push("deal må være vunnet");
            if (!deal.company_id) reasons.push("kunde må være tilknyttet");
            if (!deal.site_id) reasons.push("anleggssted må være tilknyttet");
            return (
              <div className="relative group">
                <Button
                  variant={canCreate ? "default" : "outline"}
                  size="sm"
                  onClick={canCreate ? openCreateAgreement : undefined}
                  disabled={!canCreate}
                  className={`gap-1.5 ${!canCreate ? "opacity-60" : ""}`}
                >
                  <ScrollText className="h-3.5 w-3.5" />Opprett serviceavtale
                </Button>
                {!canCreate && (
                  <div className="absolute bottom-full left-0 mb-1.5 hidden group-hover:block z-50">
                    <div className="bg-popover text-popover-foreground border rounded-md shadow-md px-3 py-2 text-xs max-w-[220px]">
                      <p className="font-medium mb-1">Krever:</p>
                      <ul className="list-disc pl-3.5 space-y-0.5">
                        {reasons.map(r => <li key={r}>{r}</li>)}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {!isClosed && deal.stage !== "lost" && (
            <Button variant="ghost" size="sm" onClick={() => changeStage("lost")} className="gap-1.5 text-destructive hover:text-destructive ml-auto">
              <XCircle className="h-3.5 w-3.5" />Marker tapt
            </Button>
          )}
          {isLost && (
            <Button variant="outline" size="sm" onClick={() => changeStage("lead")} className="gap-1.5">
              Gjenåpne deal
            </Button>
          )}
          {isWon && !linkedJob && (
            <Button size="sm" onClick={openCreateJob} className="gap-1.5">
              <Briefcase className="h-3.5 w-3.5" />Opprett jobb
            </Button>
          )}
        </div>
      </Card>

      {/* ── Linked job banner ───────────────────────────────────── */}
      {linkedJob && (
        <Card className="p-4 border-primary/30 bg-primary/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Briefcase className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Jobb: {linkedJob.job_number}</p>
                <p className="text-xs text-muted-foreground">{linkedJob.title}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild className="gap-1.5">
              <Link to={`/tenant/crm/jobs/${linkedJob.id}`}>Se jobb <ArrowRight className="h-3.5 w-3.5" /></Link>
            </Button>
          </div>
        </Card>
      )}

      {/* ── Linked agreement banner ─────────────────────────────── */}
      {linkedAgreement && (
        <Card className="p-4 border-emerald-500/30 bg-emerald-500/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ScrollText className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-sm font-medium">Serviceavtale: {linkedAgreement.agreement_number}</p>
                <p className="text-xs text-muted-foreground">Status: {linkedAgreement.status}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild className="gap-1.5">
              <Link to={`/tenant/crm/agreements/${linkedAgreement.id}`}>Se avtale <ArrowRight className="h-3.5 w-3.5" /></Link>
            </Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Kunde */}
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />Kunde</p>
          {company ? (
            <div className="flex items-center justify-between">
              <Link to={`/tenant/crm/companies/${company.id}`} className="text-sm font-medium hover:underline">{company.name}</Link>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => setPickerOpen({ type: "company", open: true })}>Bytt</Button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground italic">Ikke tilknyttet</p>
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setPickerOpen({ type: "company", open: true })}>
                  <Search className="h-3 w-3" />Velg
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => { setNewCompanyForm({ name: "", customer_type: "private", phone: "", email: "" }); setCreateCompanyOpen(true); }}>
                  <Plus className="h-3 w-3" />Ny
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Kontaktperson */}
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5"><Contact className="h-3.5 w-3.5" />Kontaktperson</p>
          {contact ? (
            <div>
              <div className="flex items-center justify-between">
                <Link to={`/tenant/crm/contacts/${contact.id}`} className="text-sm font-medium hover:underline">{contact.first_name} {contact.last_name || ""}</Link>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => setPickerOpen({ type: "contact", open: true })}>Bytt</Button>
              </div>
              {contact.email && <p className="text-xs text-muted-foreground mt-0.5">{contact.email}</p>}
              {contact.phone && <p className="text-xs text-muted-foreground">{contact.phone}</p>}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground italic">Ikke tilknyttet</p>
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setPickerOpen({ type: "contact", open: true })}>
                  <Search className="h-3 w-3" />Velg
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => { setNewContactForm({ first_name: "", last_name: "", email: "", phone: "" }); setCreateContactOpen(true); }}>
                  <Plus className="h-3 w-3" />Ny
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Anleggssted */}
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />Anleggssted</p>
          {site ? (
            <div>
              <div className="flex items-center justify-between">
                <Link to={`/tenant/crm/sites/${site.id}`} className="text-sm font-medium hover:underline">{site.name || site.address}</Link>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => setPickerOpen({ type: "site", open: true })}>Bytt</Button>
              </div>
              {site.address && <p className="text-xs text-muted-foreground mt-0.5">{site.address}, {site.postal_code} {site.city}</p>}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground italic">Ikke tilknyttet</p>
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setPickerOpen({ type: "site", open: true })}>
                  <Search className="h-3 w-3" />Velg
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => { setNewSiteForm({ name: "", address: "", postal_code: "", city: "", site_type: "residential" }); setCreateSiteOpen(true); }}
                  disabled={!deal.company_id}
                  title={!deal.company_id ? "Koble en kunde først" : undefined}
                >
                  <Plus className="h-3 w-3" />Ny
                </Button>
              </div>
              {!deal.company_id && <p className="text-[10px] text-muted-foreground/70">Koble en kunde først for å opprette sted</p>}
            </div>
          )}
        </Card>
      </div>

      {/* ── Technical + Site visit section ───────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1.5"><Zap className="h-3.5 w-3.5" />Teknisk informasjon</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Energikilde</span>
              <span>{deal.energy_source ? ENERGY_SOURCE_LABELS[deal.energy_source] || deal.energy_source : "–"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estimert kapasitet</span>
              <span>{deal.estimated_kw ? `${deal.estimated_kw} kW` : "–"}</span>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><Eye className="h-3.5 w-3.5" />Befaring</p>
            {inspectionFormStatus === "filled" && (
              <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600">Skjema utfylt</Badge>
            )}
            {inspectionFormStatus === "started" && (
              <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-600">Påbegynt</Badge>
            )}
          </div>

          {/* Date + notes */}
          {(deal.site_visit_date || deal.site_visit_notes) && (
            <div className="space-y-2 text-sm mb-3">
              {deal.site_visit_date && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Befaringsdato</span>
                  <span>{formatDate(deal.site_visit_date)}</span>
                </div>
              )}
              {deal.site_visit_notes && (
                <div className="border-t pt-2">
                  <p className="text-xs text-muted-foreground font-medium mb-1">Notater</p>
                  <p className="text-sm whitespace-pre-wrap">{deal.site_visit_notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Template + form actions */}
          {effectiveInspectionTemplateId ? (
            <div className="space-y-2">
              {hasInspectionForm ? (
                <div className="space-y-3">
                  <DynamicFormRenderer
                    fields={inspectionFields.data || []}
                    values={inspectionData?.values || {}}
                    readonly
                  />
                  {inspectionSignoffData && (
                    <FormSignoffSection signoff={inspectionSignoffData} onChange={() => {}} readonly />
                  )}
                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => {
                      setInspectionFormValues(inspectionData?.values || {});
                      setInspectionSignoff(inspectionSignoffData || DEFAULT_SIGNOFF);
                      setInspectionFormOpen(true);
                    }}>
                      <Pencil className="h-3 w-3" />Rediger skjema
                    </Button>
                    <FormPdfActions
                      fields={inspectionFields.data || []}
                      values={inspectionData?.values || {}}
                      context={{
                        title: "Befaringsrapport",
                        templateName: (siteVisitTemplates.data || []).find((t: any) => t.id === effectiveInspectionTemplateId)?.name || "Befaring",
                        customerName: company?.name,
                        address: site ? `${site.address || ""}, ${site.postal_code || ""} ${site.city || ""}` : undefined,
                        siteName: site?.name,
                        date: deal.site_visit_date || new Date().toISOString().slice(0, 10),
                        dealTitle: deal.title,
                      }}
                      signoff={inspectionSignoffData}
                      entityType="deal"
                      entityId={deal.id}
                      categoryLabel="Befaringsrapport PDF"
                      existingPdf={dealPdfDoc.data}
                      onPdfGenerated={() => dealPdfDoc.refetch()}
                    />
                    {dealPdfDoc.data && (
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setSendInspectionOpen(true)}>
                        <Mail className="h-3 w-3" />Send rapport
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <Button size="sm" className="gap-1.5 w-full" onClick={() => {
                  setInspectionFormValues({});
                  setInspectionSignoff(DEFAULT_SIGNOFF);
                  setInspectionFormOpen(true);
                }}>
                  <ClipboardList className="h-3.5 w-3.5" />Fyll ut befaringsskjema
                </Button>
              )}
              {/* Template selector */}
              <div className="flex items-center gap-2 pt-1">
                <Select
                  value={dealTemplateId || effectiveInspectionTemplateId || ""}
                  onValueChange={async (v) => {
                    await supabase.from("crm_deals").update({ site_visit_template_id: v } as any).eq("id", deal.id);
                    toast.success("Befaringsmal oppdatert");
                    fetchDeal();
                  }}
                >
                  <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Velg mal" /></SelectTrigger>
                  <SelectContent>
                    {(siteVisitTemplates.data || []).map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}{t.is_default ? " (standard)" : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">Ingen befaringsmal valgt</p>
              {(siteVisitTemplates.data || []).length > 0 ? (
                <Select
                  value=""
                  onValueChange={async (v) => {
                    await supabase.from("crm_deals").update({ site_visit_template_id: v } as any).eq("id", deal.id);
                    toast.success("Befaringsmal valgt");
                    fetchDeal();
                  }}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Velg befaringsmal..." /></SelectTrigger>
                  <SelectContent>
                    {(siteVisitTemplates.data || []).map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Button variant="link" size="sm" className="px-0 h-auto" asChild>
                  <Link to="/tenant/templates/new?category=befaring">Opprett befaringsmal →</Link>
                </Button>
              )}
              {!deal.site_visit_date && !isClosed && (
                <Button variant="link" size="sm" className="px-0 h-auto" onClick={openEdit}>
                  Registrer befaring →
                </Button>
              )}
            </div>
          )}
        </Card>
      </div>

      {deal.description && (
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Beskrivelse</p>
          <p className="text-sm whitespace-pre-wrap">{deal.description}</p>
        </Card>
      )}

      {/* ── Tabs: Quotes + Activities ───────────────────────────── */}
      <Tabs defaultValue="quotes">
        <TabsList>
          <TabsTrigger value="quotes" className="gap-1.5"><FileText className="h-3.5 w-3.5" />Tilbud ({quotes.length})</TabsTrigger>
          <TabsTrigger value="activities" className="gap-1.5"><MessageSquare className="h-3.5 w-3.5" />Aktiviteter ({activities.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="quotes" className="mt-4">
          <QuoteSection
            deal={deal}
            quotes={quotes}
            company={company}
            contact={contact}
            site={site}
            linkedJob={linkedJob}
            linkedAgreement={linkedAgreement}
            isClosed={isClosed}
            isWon={isWon}
            onRefresh={fetchDeal}
            onChangeStage={changeStage}
            onOpenCreateJob={openCreateJob}
            onOpenCreateAgreement={openCreateAgreement}
          />
        </TabsContent>

        <TabsContent value="activities" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">Tidslinje over hendelser og notater</p>
            <div className="flex gap-2">
              {[
                { type: "note", icon: MessageSquare, label: "Notat" },
                { type: "call", icon: Phone, label: "Samtale" },
                { type: "meeting", icon: Calendar, label: "Møte" },
              ].map(({ type, icon: Icon, label }) => (
                <Button key={type} variant="outline" size="sm" className="gap-1 text-xs" onClick={() => { setNoteType(type); setNoteBody(""); setNoteOpen(true); }}>
                  <Icon className="h-3 w-3" />{label}
                </Button>
              ))}
            </div>
          </div>
          {activities.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">Ingen aktiviteter ennå</div>
          ) : (
            <div className="relative pl-6 space-y-4">
              <div className="absolute left-2.5 top-2 bottom-2 w-px bg-border" />
              {activities.map(a => (
                <div key={a.id} className="relative">
                  <div className={`absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                    a.type === "status_change" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  }`}>
                    {a.type === "status_change" ? <TrendingUp className="h-3 w-3" /> :
                     a.type === "call" ? <Phone className="h-3 w-3" /> :
                     a.type === "email" ? <Mail className="h-3 w-3" /> :
                     a.type === "meeting" ? <Calendar className="h-3 w-3" /> :
                     a.type === "task" ? <ClipboardList className="h-3 w-3" /> :
                     <MessageSquare className="h-3 w-3" />}
                  </div>
                  <div className="ml-2">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Badge variant="outline" className="text-[10px]">{ACTIVITY_TYPE_LABELS[a.type as keyof typeof ACTIVITY_TYPE_LABELS] || a.type}</Badge>
                      <span className="text-[10px] text-muted-foreground">{formatDateTime(a.created_at)}</span>
                    </div>
                    {a.subject && <p className="text-sm font-medium">{a.subject}</p>}
                    {a.body && <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap">{a.body}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Edit deal sheet ─────────────────────────────────────── */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>Rediger deal</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label>Tittel *</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Fase</Label>
                <Select value={form.stage} onValueChange={v => setForm({ ...form, stage: v as DealStage })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DEAL_STAGE_ORDER.map(s => <SelectItem key={s} value={s}>{DEAL_STAGE_LABELS[s]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Verdi (NOK)</Label>
                <Input type="number" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} />
              </div>
            </div>
            <Separator />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tilknytninger</p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Kunde</Label>
                <Select value={form.company_id} onValueChange={v => setForm({ ...form, company_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Velg" /></SelectTrigger>
                  <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Kontaktperson</Label>
                <Select value={form.contact_id} onValueChange={v => setForm({ ...form, contact_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Velg" /></SelectTrigger>
                  <SelectContent>{contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name || ""}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Anleggssted</Label>
                <Select value={form.site_id} onValueChange={v => setForm({ ...form, site_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Velg" /></SelectTrigger>
                  <SelectContent>{sites.map(s => <SelectItem key={s.id} value={s.id}>{s.name || s.address}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <Separator />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Teknisk</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Energikilde</Label>
                <Select value={form.energy_source} onValueChange={v => setForm({ ...form, energy_source: v })}>
                  <SelectTrigger><SelectValue placeholder="Velg" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ENERGY_SOURCE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Estimert kW</Label>
                <Input type="number" value={form.estimated_kw} onChange={e => setForm({ ...form, estimated_kw: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Forventet lukkedato</Label>
              <Input type="date" value={form.expected_close_date} onChange={e => setForm({ ...form, expected_close_date: e.target.value })} />
            </div>
            <Separator />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Befaring</p>
            <div className="space-y-1.5">
              <Label>Befaringsdato</Label>
              <Input type="date" value={form.site_visit_date} onChange={e => setForm({ ...form, site_visit_date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Befaringsnotater</Label>
              <Textarea value={form.site_visit_notes} onChange={e => setForm({ ...form, site_visit_notes: e.target.value })} rows={3} placeholder="Funn, observasjoner, anbefalinger..." />
            </div>
            <Separator />
            <div className="space-y-1.5">
              <Label>Beskrivelse</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>
          </div>
          <SheetFooter className="flex flex-row justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Avbryt</Button>
            <Button onClick={saveEdit} disabled={saving || !form.title.trim()}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Lagre
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Create job sheet ────────────────────────────────────── */}
      <Sheet open={jobSheetOpen} onOpenChange={setJobSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>Opprett jobb fra deal</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4">
            {/* Transfer summary */}
            <Card className="p-4 bg-muted/30">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Følgende overføres til jobben</p>
              <div className="space-y-2 text-sm">
                {company && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Kunde:</span>
                    <span className="font-medium">{company.name}</span>
                  </div>
                )}
                {contact && (
                  <div className="flex items-center gap-2">
                    <Contact className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Kontakt:</span>
                    <span className="font-medium">{contact.first_name} {contact.last_name || ""}</span>
                  </div>
                )}
                {site && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Sted:</span>
                    <span className="font-medium">{site.name || site.address}</span>
                  </div>
                )}
                {deal.energy_source && (
                  <div className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Energikilde:</span>
                    <span className="font-medium">{ENERGY_SOURCE_LABELS[deal.energy_source] || deal.energy_source}</span>
                  </div>
                )}
                {deal.estimated_kw && (
                  <div className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Kapasitet:</span>
                    <span className="font-medium">{deal.estimated_kw} kW</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Deal:</span>
                  <span className="font-medium">{deal.title}</span>
                </div>
              </div>
            </Card>

            <Separator />

            <div className="space-y-1.5">
              <Label>Jobbtittel *</Label>
              <Input value={jobForm.title} onChange={e => setJobForm({ ...jobForm, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Jobbtype</Label>
                <Select value={jobForm.job_type} onValueChange={v => setJobForm({ ...jobForm, job_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {JOB_TYPES.map(t => <SelectItem key={t} value={t}>{JOB_TYPE_LABELS[t] || t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Prioritet</Label>
                <Select value={jobForm.priority} onValueChange={v => setJobForm({ ...jobForm, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Lav</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">Høy</SelectItem>
                    <SelectItem value="urgent">Haster</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Beskrivelse</Label>
              <Textarea value={jobForm.description} onChange={e => setJobForm({ ...jobForm, description: e.target.value })} rows={4} />
            </div>
          </div>
          <SheetFooter className="flex flex-row justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setJobSheetOpen(false)}>Avbryt</Button>
            <Button onClick={createJob} disabled={creatingJob || !jobForm.title.trim()} className="gap-1.5">
              {creatingJob && <Loader2 className="h-4 w-4 animate-spin" />}
              Opprett jobb
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* (Quote sheet now handled by QuoteSection) */}

      {/* ── Add note sheet ──────────────────────────────────────── */}
      <Sheet open={noteOpen} onOpenChange={setNoteOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader><SheetTitle>Legg til aktivitet</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={noteType} onValueChange={setNoteType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="note">Notat</SelectItem>
                  <SelectItem value="call">Samtale</SelectItem>
                  <SelectItem value="meeting">Møte</SelectItem>
                  <SelectItem value="email">E-post</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Innhold *</Label>
              <Textarea value={noteBody} onChange={e => setNoteBody(e.target.value)} rows={6} placeholder="Skriv her..." autoFocus />
            </div>
          </div>
          <SheetFooter className="flex flex-row justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setNoteOpen(false)}>Avbryt</Button>
            <Button onClick={saveNote} disabled={!noteBody.trim()}>Lagre</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      {/* ── Create agreement sheet ─────────────────────────────── */}
      <Sheet open={agreementSheetOpen} onOpenChange={setAgreementSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>Opprett serviceavtale</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4">
            <Card className="p-4 bg-muted/30">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Overføres fra deal</p>
              <div className="space-y-2 text-sm">
                {company && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Kunde:</span>
                    <span className="font-medium">{company.name}</span>
                  </div>
                )}
                {site && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Sted:</span>
                    <span className="font-medium">{site.name || site.address}</span>
                  </div>
                )}
              </div>
            </Card>
            <Separator />
            {dealAssets.length > 0 && (
              <div className="space-y-1.5">
                <Label>Anlegg (valgfritt)</Label>
                <Select value={selectedAssetId} onValueChange={setSelectedAssetId}>
                  <SelectTrigger><SelectValue placeholder="Velg anlegg" /></SelectTrigger>
                  <SelectContent>
                    {dealAssets.map(a => (
                      <SelectItem key={a.id} value={a.id}>{`${a.manufacturer || ""} ${a.model || ""}`.trim() || a.serial_number || a.id.slice(0, 8)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Intervall *</Label>
                <Select value={agreementForm.interval} onValueChange={v => setAgreementForm({ ...agreementForm, interval: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(AGREEMENT_INTERVAL_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {agreementForm.interval === "custom" ? (
                <div className="space-y-1.5">
                  <Label>Antall måneder *</Label>
                  <Input
                    type="number"
                    min="1"
                    max="60"
                    value={agreementForm.custom_interval_months}
                    onChange={e => setAgreementForm({ ...agreementForm, custom_interval_months: e.target.value })}
                    placeholder="F.eks. 18"
                  />
                  <p className="text-[11px] text-muted-foreground">Service hver {agreementForm.custom_interval_months || "?"} måned</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label>Startdato *</Label>
                  <Input type="date" value={agreementForm.start_date} onChange={e => setAgreementForm({ ...agreementForm, start_date: e.target.value })} />
                </div>
              )}
            </div>
            {agreementForm.interval === "custom" && (
              <div className="space-y-1.5">
                <Label>Startdato *</Label>
                <Input type="date" value={agreementForm.start_date} onChange={e => setAgreementForm({ ...agreementForm, start_date: e.target.value })} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Årspris (NOK)</Label>
              <Input type="number" value={agreementForm.annual_price} onChange={e => setAgreementForm({ ...agreementForm, annual_price: e.target.value })} placeholder="F.eks. 4500" />
            </div>
            <div className="space-y-1.5">
              <Label>Omfang / beskrivelse</Label>
              <Textarea value={agreementForm.scope_description} onChange={e => setAgreementForm({ ...agreementForm, scope_description: e.target.value })} rows={3} placeholder="Hva dekker avtalen..." />
            </div>
          </div>
          <SheetFooter className="flex flex-row justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setAgreementSheetOpen(false)}>Avbryt</Button>
            <Button onClick={createAgreement} disabled={creatingAgreement || !agreementForm.start_date} className="gap-1.5">
              {creatingAgreement && <Loader2 className="h-4 w-4 animate-spin" />}
              Opprett avtale
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Entity picker dialog ────────────────────────────────── */}
      <EntityPickerDialog
        open={pickerOpen.open}
        onOpenChange={(open) => setPickerOpen(p => ({ ...p, open }))}
        entityType={pickerOpen.type}
        onSelect={(id) => handlePickerSelect(pickerOpen.type, id)}
        companyId={deal?.company_id || undefined}
      />

      {/* ── Quick create company sheet ──────────────────────────── */}
      <Sheet open={createCompanyOpen} onOpenChange={setCreateCompanyOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>Ny kunde</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label>Navn *</Label>
              <Input value={newCompanyForm.name} onChange={e => setNewCompanyForm(f => ({ ...f, name: e.target.value }))} placeholder="Kunde- eller bedriftsnavn" autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label>Kundetype</Label>
              <Select value={newCompanyForm.customer_type} onValueChange={v => setNewCompanyForm(f => ({ ...f, customer_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Privat</SelectItem>
                  <SelectItem value="business">Bedriftskunde</SelectItem>
                  <SelectItem value="housing_coop">Borettslag</SelectItem>
                  <SelectItem value="public_sector">Offentlig</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Telefon</Label>
                <Input value={newCompanyForm.phone} onChange={e => setNewCompanyForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>E-post</Label>
                <Input value={newCompanyForm.email} onChange={e => setNewCompanyForm(f => ({ ...f, email: e.target.value }))} />
              </div>
            </div>
          </div>
          <SheetFooter className="flex flex-row justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setCreateCompanyOpen(false)}>Avbryt</Button>
            <Button onClick={createAndLinkCompany} disabled={linkSaving || !newCompanyForm.name.trim()}>
              {linkSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Opprett og koble
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Quick create contact sheet ──────────────────────────── */}
      <Sheet open={createContactOpen} onOpenChange={setCreateContactOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>Ny kontaktperson</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Fornavn *</Label>
                <Input value={newContactForm.first_name} onChange={e => setNewContactForm(f => ({ ...f, first_name: e.target.value }))} autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label>Etternavn</Label>
                <Input value={newContactForm.last_name} onChange={e => setNewContactForm(f => ({ ...f, last_name: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>E-post</Label>
                <Input value={newContactForm.email} onChange={e => setNewContactForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Telefon</Label>
                <Input value={newContactForm.phone} onChange={e => setNewContactForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>
            {deal?.company_id && company && (
              <p className="text-xs text-muted-foreground">Kobles automatisk til {company.name}</p>
            )}
          </div>
          <SheetFooter className="flex flex-row justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setCreateContactOpen(false)}>Avbryt</Button>
            <Button onClick={createAndLinkContact} disabled={linkSaving || !newContactForm.first_name.trim()}>
              {linkSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Opprett og koble
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Quick create site sheet ─────────────────────────────── */}
      <Sheet open={createSiteOpen} onOpenChange={setCreateSiteOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>Nytt anleggssted</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4">
            {company && (
              <p className="text-xs text-muted-foreground">Kobles til {company.name}</p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Navn</Label>
                <Input value={newSiteForm.name} onChange={e => setNewSiteForm(f => ({ ...f, name: e.target.value }))} placeholder="F.eks. Bolig" />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={newSiteForm.site_type} onValueChange={v => setNewSiteForm(f => ({ ...f, site_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(SITE_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Adresse *</Label>
              <Input value={newSiteForm.address} onChange={e => setNewSiteForm(f => ({ ...f, address: e.target.value }))} autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Postnummer</Label>
                <Input value={newSiteForm.postal_code} onChange={e => setNewSiteForm(f => ({ ...f, postal_code: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Sted</Label>
                <Input value={newSiteForm.city} onChange={e => setNewSiteForm(f => ({ ...f, city: e.target.value }))} />
              </div>
            </div>
          </div>
          <SheetFooter className="flex flex-row justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setCreateSiteOpen(false)}>Avbryt</Button>
            <Button onClick={createAndLinkSite} disabled={linkSaving || !newSiteForm.address.trim()}>
              {linkSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Opprett og koble
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Inspection form sheet ────────────────────────────────── */}
      <Sheet open={inspectionFormOpen} onOpenChange={setInspectionFormOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader><SheetTitle>{hasInspectionForm ? "Rediger befaringsskjema" : "Fyll ut befaringsskjema"}</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4">
            {inspectionFields.data && inspectionFields.data.length > 0 ? (
              <DynamicFormRenderer
                fields={inspectionFields.data}
                values={inspectionFormValues}
                onChange={(key, val) => setInspectionFormValues(prev => ({ ...prev, [key]: val }))}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Malen har ingen felter ennå.</p>
            )}
            <Separator />
            <FormSignoffSection signoff={inspectionSignoff} onChange={setInspectionSignoff} />
          </div>
          <SheetFooter className="flex flex-row justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setInspectionFormOpen(false)}>Avbryt</Button>
            <Button
              onClick={async () => {
                if (!deal || !effectiveInspectionTemplateId) return;
                setSavingInspection(true);
                const template = (siteVisitTemplates.data || []).find((t: any) => t.id === effectiveInspectionTemplateId);
                const payload = {
                  schema_version: 1,
                  template_id: effectiveInspectionTemplateId,
                  template_key: template?.template_key || "",
                  values: inspectionFormValues,
                  signoff: inspectionSignoff,
                };
                const { error } = await supabase.from("crm_deals").update({
                  site_visit_data: payload,
                  site_visit_template_id: effectiveInspectionTemplateId,
                } as any).eq("id", deal.id);
                setSavingInspection(false);
                if (error) { toast.error("Kunne ikke lagre befaringsskjema"); return; }
                toast.success("Befaringsskjema lagret");
                setInspectionFormOpen(false);
                fetchDeal();
              }}
              disabled={savingInspection}
              className="gap-1.5"
            >
              {savingInspection && <Loader2 className="h-4 w-4 animate-spin" />}
              <Save className="h-3.5 w-3.5" />Lagre
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Send inspection report sheet */}
      <SendDocumentSheet
        open={sendInspectionOpen}
        onOpenChange={setSendInspectionOpen}
        context={{
          templateKey: "inspection_report",
          placeholders: {
            customer_name: company?.name,
            contact_name: contact ? `${contact.first_name} ${contact.last_name || ""}`.trim() : undefined,
            deal_title: deal.title,
            site_address: site ? `${site.address || ""}, ${site.postal_code || ""} ${site.city || ""}`.trim() : undefined,
            report_date: deal.site_visit_date || new Date().toISOString().slice(0, 10),
          },
          defaultTo: contact?.email || company?.email || undefined,
          attachments: dealPdfDoc.data ? [{ fileName: `Befaringsrapport_${deal.title}.pdf`, filePath: dealPdfDoc.data.file_path }] : [],
          dealId: deal.id,
          companyId: deal.company_id,
          activitySubject: "Befaringsrapport",
        }}
        onSent={() => fetchDeal()}
      />
    </div>
  );
}