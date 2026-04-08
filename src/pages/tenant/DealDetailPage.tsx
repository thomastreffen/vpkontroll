import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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
  XCircle, Eye, Send, ChevronRight, ClipboardList, Phone, Mail, ScrollText,
} from "lucide-react";
import {
  DEAL_STAGE_LABELS, DEAL_STAGE_COLORS, DEAL_STAGE_ORDER, DEAL_STAGE_BG,
  PIPELINE_STAGES, formatCurrency, type DealStage, ACTIVITY_TYPE_LABELS,
  QUOTE_STATUS_LABELS, QUOTE_STATUS_COLORS,
} from "@/lib/crm-labels";
import { ENERGY_SOURCE_LABELS, JOB_TYPE_LABELS, AGREEMENT_INTERVAL_LABELS, formatDate, formatDateTime } from "@/lib/domain-labels";

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

  // Create quote sheet
  const [quoteSheetOpen, setQuoteSheetOpen] = useState(false);
  const [creatingQuote, setCreatingQuote] = useState(false);
  const [quoteLines, setQuoteLines] = useState<{ description: string; quantity: string; unit_price: string; unit: string }[]>([
    { description: "", quantity: "1", unit_price: "", unit: "stk" },
  ]);
  const [quoteNotes, setQuoteNotes] = useState("");
  const [quoteValidUntil, setQuoteValidUntil] = useState("");

  // Add note
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteBody, setNoteBody] = useState("");
  const [noteType, setNoteType] = useState<string>("note");

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

  /* ─── Create quote ──────────────────────────────────────────── */
  const openCreateQuote = () => {
    setQuoteLines([{ description: "", quantity: "1", unit_price: "", unit: "stk" }]);
    setQuoteNotes("");
    setQuoteValidUntil("");
    setQuoteSheetOpen(true);
  };

  const addQuoteLine = () => {
    setQuoteLines([...quoteLines, { description: "", quantity: "1", unit_price: "", unit: "stk" }]);
  };

  const updateQuoteLine = (i: number, field: string, value: string) => {
    const updated = [...quoteLines];
    (updated[i] as any)[field] = value;
    setQuoteLines(updated);
  };

  const removeQuoteLine = (i: number) => {
    if (quoteLines.length <= 1) return;
    setQuoteLines(quoteLines.filter((_, idx) => idx !== i));
  };

  const quoteTotal = quoteLines.reduce((sum, l) => {
    const qty = parseFloat(l.quantity) || 0;
    const price = parseFloat(l.unit_price) || 0;
    return sum + qty * price;
  }, 0);

  const createQuote = async () => {
    if (!deal || !tenantId) return;
    const validLines = quoteLines.filter(l => l.description.trim() && l.unit_price);
    if (validLines.length === 0) { toast.error("Legg til minst én linje"); return; }

    setCreatingQuote(true);
    const vatAmount = Math.round(quoteTotal * 0.25);
    const { data: q, error } = await supabase.from("quotes").insert({
      tenant_id: tenantId, deal_id: deal.id, quote_number: "TEMP",
      total_amount: quoteTotal, vat_amount: vatAmount,
      notes: quoteNotes || null,
      valid_until: quoteValidUntil || null,
      created_by: user?.id,
    } as any).select().single();

    if (error || !q) { setCreatingQuote(false); toast.error("Kunne ikke opprette tilbud"); return; }

    // Insert lines
    const lineInserts = validLines.map((l, i) => ({
      tenant_id: tenantId, quote_id: q.id, description: l.description.trim(),
      quantity: parseFloat(l.quantity) || 1, unit_price: parseFloat(l.unit_price) || 0,
      unit: l.unit || "stk", sort_order: i,
      line_total: (parseFloat(l.quantity) || 1) * (parseFloat(l.unit_price) || 0),
    }));
    await supabase.from("quote_lines").insert(lineInserts as any);

    // Log activity
    await supabase.from("crm_activities").insert({
      tenant_id: tenantId, deal_id: deal.id, company_id: deal.company_id,
      type: "task", subject: `Tilbud ${q.quote_number} opprettet (${formatCurrency(quoteTotal)})`,
      created_by: user?.id,
    } as any);

    setCreatingQuote(false);
    toast.success(`Tilbud ${q.quote_number} opprettet`);
    setQuoteSheetOpen(false);
    fetchDeal();
  };

  /* ─── Quote actions ─────────────────────────────────────────── */
  const updateQuoteStatus = async (quoteId: string, status: string, quoteNumber: string) => {
    const updatePayload: any = { status };
    if (status === "sent") updatePayload.sent_at = new Date().toISOString();
    if (status === "accepted") updatePayload.accepted_at = new Date().toISOString();

    const { error } = await supabase.from("quotes").update(updatePayload).eq("id", quoteId);
    if (error) { toast.error("Kunne ikke oppdatere tilbud"); return; }

    // If accepted, move deal to won
    if (status === "accepted" && deal.stage !== "won") {
      await changeStage("won");
    }

    // Log activity
    if (tenantId) {
      const statusLabel = QUOTE_STATUS_LABELS[status] || status;
      await supabase.from("crm_activities").insert({
        tenant_id: tenantId, deal_id: deal.id, company_id: deal.company_id,
        type: "status_change", subject: `Tilbud ${quoteNumber} markert som ${statusLabel}`,
        created_by: user?.id,
      } as any);
    }

    toast.success(`Tilbud markert som ${QUOTE_STATUS_LABELS[status] || status}`);
    fetchDeal();
  };

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
              if (stageNext.next === "quote_sent") { openCreateQuote(); return; }
              changeStage(stageNext.next);
            }} className="gap-1.5">
              <ArrowRight className="h-3.5 w-3.5" />{stageNext.label}
            </Button>
          )}
          {!isClosed && (
            <>
              <Button variant="outline" size="sm" onClick={openCreateQuote} className="gap-1.5">
                <FileText className="h-3.5 w-3.5" />Nytt tilbud
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

      {/* ── Info cards grid ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />Kunde</p>
          {company ? (
            <Link to={`/tenant/crm/companies/${company.id}`} className="text-sm font-medium hover:underline">{company.name}</Link>
          ) : <span className="text-sm text-muted-foreground">Ikke tilknyttet</span>}
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5"><Contact className="h-3.5 w-3.5" />Kontaktperson</p>
          {contact ? (
            <div>
              <Link to={`/tenant/crm/contacts/${contact.id}`} className="text-sm font-medium hover:underline">{contact.first_name} {contact.last_name || ""}</Link>
              {contact.email && <p className="text-xs text-muted-foreground mt-0.5">{contact.email}</p>}
              {contact.phone && <p className="text-xs text-muted-foreground">{contact.phone}</p>}
            </div>
          ) : <span className="text-sm text-muted-foreground">Ikke tilknyttet</span>}
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />Anleggssted</p>
          {site ? (
            <div>
              <Link to={`/tenant/crm/sites/${site.id}`} className="text-sm font-medium hover:underline">{site.name || site.address}</Link>
              {site.address && <p className="text-xs text-muted-foreground mt-0.5">{site.address}, {site.postal_code} {site.city}</p>}
            </div>
          ) : <span className="text-sm text-muted-foreground">Ikke tilknyttet</span>}
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
          <p className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1.5"><Eye className="h-3.5 w-3.5" />Befaring</p>
          {deal.site_visit_date || deal.site_visit_notes ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Befaringsdato</span>
                <span>{formatDate(deal.site_visit_date)}</span>
              </div>
              {deal.site_visit_notes && (
                <div className="border-t pt-2 mt-2">
                  <p className="text-xs text-muted-foreground font-medium mb-1">Notater</p>
                  <p className="text-sm whitespace-pre-wrap">{deal.site_visit_notes}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              <p>Ingen befaring registrert</p>
              {!isClosed && (
                <Button variant="link" size="sm" className="px-0 h-auto mt-1" onClick={openEdit}>
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
          {quotes.length === 0 ? (
            <Card className="p-8 text-center">
              <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-3">Ingen tilbud ennå</p>
              {!isClosed && (
                <Button size="sm" onClick={openCreateQuote} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />Opprett tilbud
                </Button>
              )}
            </Card>
          ) : (
            <div className="grid gap-3">
              {quotes.map(q => (
                <Card key={q.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{q.quote_number} (v{q.version})</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatCurrency(q.total_amount)} ekskl. MVA
                        {q.valid_until && ` · Gyldig til ${formatDate(q.valid_until)}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-[10px] ${QUOTE_STATUS_COLORS[q.status] || ""}`}>
                        {QUOTE_STATUS_LABELS[q.status] || q.status}
                      </Badge>
                    </div>
                  </div>
                  {/* Quote actions */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                    {q.status === "draft" && (
                      <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => updateQuoteStatus(q.id, "sent", q.quote_number)}>
                        <Send className="h-3 w-3" />Marker sendt
                      </Button>
                    )}
                    {(q.status === "sent" || q.status === "draft") && (
                      <>
                        <Button variant="outline" size="sm" className="gap-1 text-xs text-emerald-600" onClick={() => updateQuoteStatus(q.id, "accepted", q.quote_number)}>
                          <CheckCircle2 className="h-3 w-3" />Akseptert
                        </Button>
                        <Button variant="ghost" size="sm" className="gap-1 text-xs text-destructive" onClick={() => updateQuoteStatus(q.id, "rejected", q.quote_number)}>
                          <XCircle className="h-3 w-3" />Avslått
                        </Button>
                      </>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
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

      {/* ── Create quote sheet ──────────────────────────────────── */}
      <Sheet open={quoteSheetOpen} onOpenChange={setQuoteSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader><SheetTitle>Nytt tilbud</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label>Gyldig til</Label>
              <Input type="date" value={quoteValidUntil} onChange={e => setQuoteValidUntil(e.target.value)} />
            </div>

            <Separator />
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tilbudslinjer</p>
              <Button variant="outline" size="sm" onClick={addQuoteLine} className="gap-1 text-xs">
                <Plus className="h-3 w-3" />Legg til linje
              </Button>
            </div>

            <div className="space-y-3">
              {quoteLines.map((line, i) => (
                <Card key={i} className="p-3">
                  <div className="space-y-2">
                    <Input placeholder="Beskrivelse *" value={line.description} onChange={e => updateQuoteLine(i, "description", e.target.value)} />
                    <div className="grid grid-cols-4 gap-2">
                      <Input type="number" placeholder="Antall" value={line.quantity} onChange={e => updateQuoteLine(i, "quantity", e.target.value)} />
                      <Select value={line.unit} onValueChange={v => updateQuoteLine(i, "unit", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="stk">stk</SelectItem>
                          <SelectItem value="timer">timer</SelectItem>
                          <SelectItem value="m">m</SelectItem>
                          <SelectItem value="m2">m²</SelectItem>
                          <SelectItem value="rs">rs</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input type="number" placeholder="Enhetspris" value={line.unit_price} onChange={e => updateQuoteLine(i, "unit_price", e.target.value)} />
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{formatCurrency((parseFloat(line.quantity) || 0) * (parseFloat(line.unit_price) || 0))}</span>
                        {quoteLines.length > 1 && (
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground" onClick={() => removeQuoteLine(i)}>×</Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <Separator />
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Sum ekskl. MVA</span>
              <span className="font-semibold text-lg">{formatCurrency(quoteTotal)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">MVA (25%)</span>
              <span>{formatCurrency(Math.round(quoteTotal * 0.25))}</span>
            </div>
            <div className="flex justify-between items-center text-sm font-semibold">
              <span>Totalt inkl. MVA</span>
              <span>{formatCurrency(Math.round(quoteTotal * 1.25))}</span>
            </div>

            <div className="space-y-1.5">
              <Label>Notater</Label>
              <Textarea value={quoteNotes} onChange={e => setQuoteNotes(e.target.value)} rows={2} placeholder="Vilkår, forutsetninger..." />
            </div>
          </div>
          <SheetFooter className="flex flex-row justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setQuoteSheetOpen(false)}>Avbryt</Button>
            <Button onClick={createQuote} disabled={creatingQuote} className="gap-1.5">
              {creatingQuote && <Loader2 className="h-4 w-4 animate-spin" />}
              Opprett tilbud
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

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
    </div>
  );
}