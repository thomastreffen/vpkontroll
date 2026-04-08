import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ArrowLeft, Building2, Contact, MapPin, Zap, Calendar, FileText, TrendingUp, Pencil, MessageSquare, Briefcase, Plus, ArrowRight } from "lucide-react";
import {
  DEAL_STAGE_LABELS, DEAL_STAGE_COLORS, DEAL_STAGE_ORDER, formatCurrency, type DealStage,
} from "@/lib/crm-labels";
import { ENERGY_SOURCE_LABELS, JOB_TYPE_LABELS, formatDate, formatDateTime } from "@/lib/domain-labels";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const JOB_TYPES = ["installation", "service", "repair", "warranty", "inspection", "decommission"];

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
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [jobDialogOpen, setJobDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creatingJob, setCreatingJob] = useState(false);

  const [companies, setCompanies] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);

  const [form, setForm] = useState({
    title: "", stage: "lead" as DealStage, value: "", company_id: "", contact_id: "",
    site_id: "", expected_close_date: "", description: "", energy_source: "",
    estimated_kw: "", site_visit_date: "", site_visit_notes: "",
  });

  const [jobForm, setJobForm] = useState({
    title: "", job_type: "installation", description: "", priority: "normal",
  });

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

  const openEdit = async () => {
    if (!deal) return;
    const [{ data: cos }, { data: cts }, { data: sts }] = await Promise.all([
      supabase.from("crm_companies").select("id, name").eq("tenant_id", deal.tenant_id).is("deleted_at", null).order("name"),
      supabase.from("crm_contacts").select("id, first_name, last_name").eq("tenant_id", deal.tenant_id).is("deleted_at", null).order("first_name"),
      supabase.from("customer_sites").select("id, name, address").eq("tenant_id", deal.tenant_id).is("deleted_at", null).order("name"),
    ]);
    setCompanies(cos || []);
    setContacts(cts || []);
    setSites(sts || []);
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

  const save = async () => {
    if (!deal || !form.title.trim()) return;
    setSaving(true);
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
    toast.success("Deal oppdatert");
    setEditOpen(false);
    fetchDeal();
  };

  const openCreateJob = () => {
    if (!deal) return;
    const descParts: string[] = [];
    if (deal.description) descParts.push(deal.description);
    if (deal.energy_source) descParts.push(`Energikilde: ${ENERGY_SOURCE_LABELS[deal.energy_source] || deal.energy_source}`);
    if (deal.estimated_kw) descParts.push(`Estimert kapasitet: ${deal.estimated_kw} kW`);

    setJobForm({
      title: `Installasjon – ${deal.title}`,
      job_type: "installation",
      description: descParts.join("\n"),
      priority: "normal",
    });
    setJobDialogOpen(true);
  };

  const createJob = async () => {
    if (!deal || !tenantId || !jobForm.title.trim()) return;
    setCreatingJob(true);
    const { data, error } = await supabase.from("jobs").insert({
      tenant_id: tenantId,
      title: jobForm.title.trim(),
      job_type: jobForm.job_type,
      description: jobForm.description || null,
      priority: jobForm.priority,
      company_id: deal.company_id || null,
      contact_id: deal.contact_id || null,
      site_id: deal.site_id || null,
      deal_id: deal.id,
      created_by: user?.id,
      job_number: "TEMP",
    } as any).select().single();
    setCreatingJob(false);
    if (error) { toast.error("Kunne ikke opprette jobb: " + error.message); return; }
    toast.success(`Jobb ${data.job_number} opprettet`);
    setJobDialogOpen(false);
    setLinkedJob(data);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!deal) return <div className="text-center py-20 text-muted-foreground">Deal ikke funnet</div>;

  const stageColor = DEAL_STAGE_COLORS[deal.stage as keyof typeof DEAL_STAGE_COLORS] || "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/tenant/crm/deals"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{deal.title}</h1>
            <Badge className={`text-xs ${stageColor}`}>{DEAL_STAGE_LABELS[deal.stage as DealStage] || deal.stage}</Badge>
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
            <span className="font-semibold text-foreground text-lg">{formatCurrency(deal.value as number | null)}</span>
            {deal.expected_close_date && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Forventet: {formatDate(deal.expected_close_date)}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={openEdit} className="gap-1.5">
            <Pencil className="h-3.5 w-3.5" />Rediger
          </Button>
        </div>
      </div>

      {/* Linked job banner */}
      {linkedJob ? (
        <Card className="p-4 border-primary/30 bg-primary/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Briefcase className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Jobb opprettet: {linkedJob.job_number}</p>
                <p className="text-xs text-muted-foreground">{linkedJob.title}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild className="gap-1.5">
              <Link to={`/tenant/crm/jobs/${linkedJob.id}`}>Se jobb <ArrowRight className="h-3.5 w-3.5" /></Link>
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="p-4 border-dashed">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Briefcase className="h-5 w-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Ingen jobb opprettet fra denne dealen ennå</p>
            </div>
            <Button size="sm" onClick={openCreateJob} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />Opprett jobb
            </Button>
          </div>
        </Card>
      )}

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />Bedrift</p>
          {company ? (
            <Link to={`/tenant/crm/companies/${company.id}`} className="text-sm font-medium hover:underline">{company.name}</Link>
          ) : <span className="text-sm text-muted-foreground">Ikke tilknyttet</span>}
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5"><Contact className="h-3.5 w-3.5" />Kontakt</p>
          {contact ? (
            <span className="text-sm font-medium">{contact.first_name} {contact.last_name || ""}</span>
          ) : <span className="text-sm text-muted-foreground">Ikke tilknyttet</span>}
          {contact?.email && <p className="text-xs text-muted-foreground mt-0.5">{contact.email}</p>}
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />Anleggssted</p>
          {site ? (
            <div>
              <span className="text-sm font-medium">{site.name || site.address}</span>
              {site.address && <p className="text-xs text-muted-foreground mt-0.5">{site.address}, {site.postal_code} {site.city}</p>}
            </div>
          ) : <span className="text-sm text-muted-foreground">Ikke tilknyttet</span>}
        </Card>
        {(deal.energy_source || deal.estimated_kw) && (
          <Card className="p-4">
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5"><Zap className="h-3.5 w-3.5" />Teknisk</p>
            <div className="space-y-1 text-sm">
              {deal.energy_source && <p>{ENERGY_SOURCE_LABELS[deal.energy_source] || deal.energy_source}</p>}
              {deal.estimated_kw && <p>{deal.estimated_kw} kW estimert</p>}
            </div>
          </Card>
        )}
        {(deal.site_visit_date || deal.site_visit_notes) && (
          <Card className="p-4 md:col-span-2">
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />Befaring</p>
            <div className="space-y-1 text-sm">
              {deal.site_visit_date && <p>Dato: {formatDate(deal.site_visit_date)}</p>}
              {deal.site_visit_notes && <p className="text-muted-foreground">{deal.site_visit_notes}</p>}
            </div>
          </Card>
        )}
      </div>

      {deal.description && (
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Beskrivelse</p>
          <p className="text-sm whitespace-pre-wrap">{deal.description}</p>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="quotes">
        <TabsList>
          <TabsTrigger value="quotes" className="gap-1.5"><FileText className="h-3.5 w-3.5" />Tilbud ({quotes.length})</TabsTrigger>
          <TabsTrigger value="activities" className="gap-1.5"><MessageSquare className="h-3.5 w-3.5" />Aktiviteter ({activities.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="quotes" className="mt-4">
          {quotes.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">Ingen tilbud knyttet til denne dealen</div>
          ) : (
            <div className="grid gap-3">
              {quotes.map(q => (
                <Card key={q.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{q.quote_number} (v{q.version})</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(q.total_amount)} · {q.valid_until ? `Gyldig til ${formatDate(q.valid_until)}` : "Ingen utløpsdato"}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{q.status}</Badge>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="activities" className="mt-4">
          {activities.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">Ingen aktiviteter</div>
          ) : (
            <div className="space-y-3">
              {activities.map(a => (
                <Card key={a.id} className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="outline" className="text-[10px]">{a.type}</Badge>
                    <span className="text-[10px] text-muted-foreground">{formatDateTime(a.created_at)}</span>
                  </div>
                  {a.subject && <p className="text-sm font-medium">{a.subject}</p>}
                  {a.body && <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{a.body}</p>}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit deal dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Rediger deal</DialogTitle></DialogHeader>
          <div className="space-y-4">
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Bedrift</Label>
                <Select value={form.company_id} onValueChange={v => setForm({ ...form, company_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Velg" /></SelectTrigger>
                  <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Kontakt</Label>
                <Select value={form.contact_id} onValueChange={v => setForm({ ...form, contact_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Velg" /></SelectTrigger>
                  <SelectContent>{contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name || ""}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Anleggssted</Label>
              <Select value={form.site_id} onValueChange={v => setForm({ ...form, site_id: v })}>
                <SelectTrigger><SelectValue placeholder="Velg" /></SelectTrigger>
                <SelectContent>{sites.map(s => <SelectItem key={s.id} value={s.id}>{s.name || s.address}</SelectItem>)}</SelectContent>
              </Select>
            </div>
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Forventet lukkedato</Label>
                <Input type="date" value={form.expected_close_date} onChange={e => setForm({ ...form, expected_close_date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Befaringsdato</Label>
                <Input type="date" value={form.site_visit_date} onChange={e => setForm({ ...form, site_visit_date: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Befaringsnotater</Label>
              <Textarea value={form.site_visit_notes} onChange={e => setForm({ ...form, site_visit_notes: e.target.value })} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Beskrivelse</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Avbryt</Button>
            <Button onClick={save} disabled={saving || !form.title.trim()}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Lagre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create job dialog */}
      <Dialog open={jobDialogOpen} onOpenChange={setJobDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Opprett jobb fra deal</DialogTitle></DialogHeader>
          <div className="space-y-4">
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
            {/* Show what will be linked */}
            <div className="rounded-md bg-muted/50 p-3 space-y-1 text-xs text-muted-foreground">
              <p className="font-medium text-foreground text-sm mb-1">Følgende kobles automatisk:</p>
              {company && <p>Bedrift: {company.name}</p>}
              {contact && <p>Kontakt: {contact.first_name} {contact.last_name || ""}</p>}
              {site && <p>Sted: {site.name || site.address}</p>}
              <p>Deal: {deal.title}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJobDialogOpen(false)}>Avbryt</Button>
            <Button onClick={createJob} disabled={creatingJob || !jobForm.title.trim()} className="gap-1.5">
              {creatingJob && <Loader2 className="h-4 w-4 animate-spin" />}
              Opprett jobb
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
