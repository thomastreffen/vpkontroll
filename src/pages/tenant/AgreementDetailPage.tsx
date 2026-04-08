import { useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAgreementDetail } from "@/hooks/useAgreementDetail";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Loader2, ArrowLeft, Info, CalendarDays, Wrench, Building2, MapPin,
  Zap, Plus, CheckCircle2, Clock, AlertTriangle, Settings2, Pencil,
  RefreshCw, ArrowRight,
} from "lucide-react";
import { ScheduleEventDialog } from "@/components/crud/ScheduleEventDialog";
import { AgreementFormDialog } from "@/components/crud/AgreementFormDialog";
import {
  AGREEMENT_STATUS_LABELS, AGREEMENT_STATUS_COLORS,
  AGREEMENT_INTERVAL_LABELS,
  VISIT_STATUS_LABELS,
  JOB_STATUS_LABELS, JOB_STATUS_COLORS, JOB_TYPE_LABELS,
  formatDate, formatDateTime,
} from "@/lib/domain-labels";
import { formatCurrency } from "@/lib/crm-labels";
import { addMonths, addYears, format, isBefore, isAfter, startOfToday } from "date-fns";

/* ─── Due status helpers ──────────────────────────────────────── */
function getDueStatus(nextDue: string | null): { label: string; color: string; icon: typeof CheckCircle2 } {
  if (!nextDue) return { label: "Ikke satt", color: "text-muted-foreground", icon: Clock };
  const days = Math.ceil((new Date(nextDue).getTime() - Date.now()) / 86400000);
  if (days < 0) return { label: `${Math.abs(days)} dager forfalt`, color: "text-destructive", icon: AlertTriangle };
  if (days <= 30) return { label: `Om ${days} dager`, color: "text-amber-600", icon: Clock };
  return { label: `Om ${days} dager`, color: "text-emerald-600", icon: CheckCircle2 };
}

/* ─── Project future visits ────────────────────────────────────── */
function projectFutureVisits(
  interval: string,
  nextVisitDue: string | null,
  startDate: string,
  endDate: string | null,
  existingVisitDates: Set<string>,
  maxProjections: number = 6,
): string[] {
  const stepMonths = interval === "quarterly" ? 3 : interval === "semi_annual" ? 6 : 12;
  const anchor = nextVisitDue ? new Date(nextVisitDue) : new Date(startDate);
  const today = startOfToday();
  const limit = endDate ? new Date(endDate) : addYears(today, 3);
  const projected: string[] = [];
  let cursor = anchor;

  // Walk forward from anchor
  for (let i = 0; i < 50 && projected.length < maxProjections; i++) {
    const dateStr = format(cursor, "yyyy-MM-dd");
    if (isAfter(cursor, limit)) break;
    if (isAfter(cursor, today) && !existingVisitDates.has(dateStr)) {
      projected.push(dateStr);
    }
    cursor = addMonths(cursor, stepMonths);
  }
  return projected;
}

export default function AgreementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { tenantId, user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { agreement, company, site, asset, visits, jobs, generationRuns } = useAgreementDetail(id);
  const [scheduleVisit, setScheduleVisit] = useState<any>(null);
  const [extraVisitOpen, setExtraVisitOpen] = useState(false);
  const [extraVisitDate, setExtraVisitDate] = useState("");
  const [extraVisitNotes, setExtraVisitNotes] = useState("");
  const [creatingVisit, setCreatingVisit] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [renewOpen, setRenewOpen] = useState(false);
  const [renewMonths, setRenewMonths] = useState("12");
  const [renewing, setRenewing] = useState(false);

  // Fetch sites/assets for edit dialog
  const [editSites, setEditSites] = useState<any[]>([]);
  const [editAssets, setEditAssets] = useState<any[]>([]);

  const openEdit = async () => {
    if (!agreement.data) return;
    // Load sites and assets for the company
    const companyId = agreement.data.company_id;
    const [sitesRes, assetsRes] = await Promise.all([
      supabase.from("customer_sites").select("id, name, address").eq("company_id", companyId).is("deleted_at", null),
      supabase.from("hvac_assets").select("id, manufacturer, model, site_id").eq("tenant_id", tenantId!).is("deleted_at", null),
    ]);
    setEditSites(sitesRes.data || []);
    setEditAssets(assetsRes.data || []);
    setEditOpen(true);
  };

  const createExtraVisit = async () => {
    if (!id || !tenantId || !extraVisitDate) return;
    const a = agreement.data;
    if (!a) return;
    setCreatingVisit(true);
    const { error } = await supabase.from("service_visits").insert({
      tenant_id: tenantId,
      agreement_id: id,
      site_id: a.site_id || null,
      asset_id: a.asset_id || null,
      scheduled_date: extraVisitDate,
      findings: extraVisitNotes || null,
      created_by: user?.id,
    } as any);
    setCreatingVisit(false);
    if (error) { toast.error("Kunne ikke opprette besøk"); return; }
    toast.success("Ekstra servicebesøk opprettet");
    setExtraVisitOpen(false);
    setExtraVisitDate("");
    setExtraVisitNotes("");
    visits.refetch();
  };

  const renewAgreement = async () => {
    if (!agreement.data || !id) return;
    setRenewing(true);
    const a = agreement.data;
    const months = parseInt(renewMonths) || 12;
    const currentEnd = a.end_date ? new Date(a.end_date) : new Date();
    const base = isBefore(currentEnd, new Date()) ? new Date() : currentEnd;
    const newEnd = addMonths(base, months);

    // Calculate next_visit_due from new end or interval
    const stepMonths = a.interval === "quarterly" ? 3 : a.interval === "semi_annual" ? 6 : 12;
    const nextDue = a.next_visit_due && isAfter(new Date(a.next_visit_due), new Date())
      ? a.next_visit_due
      : format(addMonths(base, stepMonths), "yyyy-MM-dd");

    const { error } = await supabase.from("service_agreements").update({
      end_date: format(newEnd, "yyyy-MM-dd"),
      next_visit_due: nextDue,
      status: "active" as any,
    }).eq("id", id);
    setRenewing(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Avtale forlenget til ${format(newEnd, "dd.MM.yyyy")}`);
    setRenewOpen(false);
    qc.invalidateQueries({ queryKey: ["agreement", id] });
  };

  if (agreement.isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!agreement.data) {
    return <div className="text-center py-20 text-muted-foreground">Avtale ikke funnet</div>;
  }

  const a = agreement.data;
  const due = getDueStatus(a.next_visit_due);
  const DueIcon = due.icon;

  // Separate visits into categories
  const allVisits = visits.data || [];
  const completedVisits = allVisits.filter(v => v.status === "completed");
  const plannedVisits = allVisits.filter(v => v.status === "planned" || v.status === "confirmed");
  const inProgressVisits = allVisits.filter(v => v.status === "in_progress");
  const otherVisits = allVisits.filter(v => !["completed", "planned", "confirmed", "in_progress"].includes(v.status));

  // Project future visits
  const existingDates = new Set(allVisits.map(v => v.scheduled_date).filter(Boolean));
  const projectedDates = projectFutureVisits(a.interval, a.next_visit_due, a.start_date, a.end_date, existingDates);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/tenant/crm/agreements")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{a.agreement_number}</h1>
            <Badge className={AGREEMENT_STATUS_COLORS[a.status] || ""}>{AGREEMENT_STATUS_LABELS[a.status] || a.status}</Badge>
          </div>
          <div className="flex gap-3 text-sm text-muted-foreground mt-1 flex-wrap">
            {company.data && <Link to={`/tenant/crm/companies/${company.data.id}`} className="text-primary hover:underline">{company.data.name}</Link>}
            <span>{AGREEMENT_INTERVAL_LABELS[a.interval] || a.interval}</span>
            {a.annual_price && <span>{formatCurrency(a.annual_price as number)}/år</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={openEdit} className="gap-1.5">
            <Pencil className="h-3.5 w-3.5" />Rediger
          </Button>
          <Button variant="outline" size="sm" onClick={() => setRenewOpen(true)} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />Forny
          </Button>
        </div>
      </div>

      {/* Due status card */}
      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <DueIcon className={`h-5 w-5 ${due.color}`} />
            <div>
              <p className="text-sm font-medium">Neste service: {formatDate(a.next_visit_due)}</p>
              <p className={`text-xs font-medium ${due.color}`}>{due.label}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setExtraVisitOpen(true)} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />Ekstra servicebesøk
            </Button>
            {plannedVisits.length > 0 && (
              <Button size="sm" onClick={() => setScheduleVisit(plannedVisits[0])} className="gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />Planlegg i kalender
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Info grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />Kunde</p>
          {company.data ? (
            <Link to={`/tenant/crm/companies/${company.data.id}`} className="text-sm font-medium hover:underline">{company.data.name}</Link>
          ) : <span className="text-sm text-muted-foreground">–</span>}
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />Anleggssted</p>
          {site.data ? (
            <Link to={`/tenant/crm/sites/${site.data.id}`} className="text-sm font-medium hover:underline">{site.data.name || site.data.address}</Link>
          ) : <span className="text-sm text-muted-foreground">–</span>}
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5"><Zap className="h-3.5 w-3.5" />Anlegg</p>
          {asset.data ? (
            <Link to={`/tenant/crm/assets/${asset.data.id}`} className="text-sm font-medium hover:underline">
              {`${asset.data.manufacturer || ""} ${asset.data.model || ""}`.trim() || "Anlegg"}
            </Link>
          ) : <span className="text-sm text-muted-foreground">–</span>}
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Avtaleperiode</p>
          <p className="text-sm">{formatDate(a.start_date)} – {formatDate(a.end_date) || "Løpende"}</p>
        </Card>
      </div>

      {a.scope_description && (
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Omfang</p>
          <p className="text-sm whitespace-pre-wrap">{a.scope_description}</p>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="timeline">
        <TabsList>
          <TabsTrigger value="timeline" className="gap-1.5"><CalendarDays className="h-3.5 w-3.5" />Servicetidslinje ({allVisits.length})</TabsTrigger>
          <TabsTrigger value="jobs" className="gap-1.5"><Wrench className="h-3.5 w-3.5" />Jobber ({jobs.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="details" className="gap-1.5"><Info className="h-3.5 w-3.5" />Detaljer</TabsTrigger>
          <TabsTrigger value="automation" className="gap-1.5"><Settings2 className="h-3.5 w-3.5" />Automasjon</TabsTrigger>
        </TabsList>

        {/* Timeline tab */}
        <TabsContent value="timeline" className="mt-4">
          <div className="relative pl-6 space-y-4">
            <div className="absolute left-2.5 top-2 bottom-2 w-px bg-border" />

            {/* In progress */}
            {inProgressVisits.map(v => (
              <TimelineItem key={v.id} visit={v} type="active" onSchedule={() => setScheduleVisit(v)} />
            ))}

            {/* Planned / upcoming */}
            {plannedVisits.map(v => (
              <TimelineItem key={v.id} visit={v} type="upcoming" onSchedule={() => setScheduleVisit(v)} />
            ))}

            {/* Projected future visits */}
            {projectedDates.length > 0 && (
              <>
                <div className="relative">
                  <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-muted/50 border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                    <ArrowRight className="h-2.5 w-2.5 text-muted-foreground/50" />
                  </div>
                  <p className="ml-2 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    Forventede fremtidige besøk
                  </p>
                </div>
                {projectedDates.map(date => (
                  <ProjectedVisitItem key={date} date={date} interval={a.interval} />
                ))}
              </>
            )}

            {/* Completed */}
            {completedVisits.length > 0 && (
              <div className="relative">
                <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                  <CheckCircle2 className="h-3 w-3 text-muted-foreground" />
                </div>
                <p className="ml-2 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Fullførte besøk ({completedVisits.length})</p>
              </div>
            )}
            {completedVisits.map(v => (
              <TimelineItem key={v.id} visit={v} type="completed" />
            ))}

            {/* Other (missed, cancelled) */}
            {otherVisits.map(v => (
              <TimelineItem key={v.id} visit={v} type="other" />
            ))}

            {allVisits.length === 0 && projectedDates.length === 0 && (
              <Card className="ml-2 p-8 text-center">
                <CalendarDays className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-3">Ingen servicebesøk ennå</p>
                <p className="text-xs text-muted-foreground">Servicebesøk genereres automatisk basert på intervall, eller kan opprettes manuelt.</p>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Jobs tab */}
        <TabsContent value="jobs" className="mt-4">
          {!jobs.data?.length ? (
            <div className="text-center py-10 text-sm text-muted-foreground">Ingen tilknyttede jobber</div>
          ) : (
            <div className="grid gap-3">
              {jobs.data.map(j => (
                <Link key={j.id} to={`/tenant/crm/jobs/${j.id}`}>
                  <Card className="p-4 hover:shadow-md transition-shadow flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{j.job_number} – {j.title}</p>
                      <p className="text-xs text-muted-foreground">{JOB_TYPE_LABELS[j.job_type] || j.job_type} · {formatDate(j.scheduled_start)}</p>
                    </div>
                    <Badge className={`text-[10px] ${JOB_STATUS_COLORS[j.status] || ""}`}>{JOB_STATUS_LABELS[j.status] || j.status}</Badge>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Details tab */}
        <TabsContent value="details" className="mt-4">
          <Card className="p-5">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <Field label="Startdato" value={formatDate(a.start_date)} />
              <Field label="Sluttdato" value={formatDate(a.end_date)} />
              <Field label="Intervall" value={AGREEMENT_INTERVAL_LABELS[a.interval] || a.interval} />
              <Field label="Neste forfall" value={formatDate(a.next_visit_due)} />
              <Field label="Årspris" value={a.annual_price ? formatCurrency(a.annual_price as number) : null} />
              <Field label="Opprettet" value={formatDate(a.created_at)} />
            </div>
            {a.notes && <p className="text-sm text-muted-foreground mt-3 border-t pt-3">{a.notes}</p>}
          </Card>
        </TabsContent>

        {/* Automation tab */}
        <TabsContent value="automation" className="mt-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Settings2 className="h-4 w-4" />Automatisk generering</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Systemet sjekker daglig om neste service nærmer seg og oppretter automatisk servicebesøk og jobber basert på avtalens intervall.
            </p>
            {generationRuns.data && generationRuns.data.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Siste kjøringer</p>
                {generationRuns.data.map(run => (
                  <div key={run.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 text-sm">
                    <div>
                      <p className="font-medium">{formatDateTime(run.started_at)}</p>
                      <p className="text-xs text-muted-foreground">
                        {run.agreements_scanned} avtaler skannet · {run.visits_created} besøk · {run.jobs_created} jobber
                      </p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${run.status === "completed" ? "text-emerald-600" : run.status === "running" ? "text-amber-600" : "text-destructive"}`}>
                      {run.status === "completed" ? "Fullført" : run.status === "running" ? "Kjører" : "Feil"}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Ingen kjøringer registrert ennå.</p>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Schedule event dialog */}
      {scheduleVisit && (
        <ScheduleEventDialog
          open={!!scheduleVisit}
          onOpenChange={(o) => { if (!o) setScheduleVisit(null); }}
          serviceVisitId={scheduleVisit.id}
          visitDate={scheduleVisit.scheduled_date}
          jobTitle={`Servicebesøk – ${a.agreement_number}`}
          companyName={company.data?.name}
        />
      )}

      {/* Extra visit sheet */}
      <Sheet open={extraVisitOpen} onOpenChange={setExtraVisitOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader><SheetTitle>Opprett ekstra servicebesøk</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Opprett et ekstra servicebesøk utenom det automatiske intervallet.
            </p>
            <div className="space-y-1.5">
              <Label>Planlagt dato *</Label>
              <Input type="date" value={extraVisitDate} onChange={e => setExtraVisitDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Notater (valgfritt)</Label>
              <Textarea value={extraVisitNotes} onChange={e => setExtraVisitNotes(e.target.value)} rows={3} placeholder="Grunn for ekstra besøk..." />
            </div>
          </div>
          <SheetFooter className="flex flex-row justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setExtraVisitOpen(false)}>Avbryt</Button>
            <Button onClick={createExtraVisit} disabled={creatingVisit || !extraVisitDate} className="gap-1.5">
              {creatingVisit && <Loader2 className="h-4 w-4 animate-spin" />}
              Opprett besøk
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Edit agreement sheet */}
      <AgreementFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        companyId={a.company_id}
        agreement={a}
        sites={editSites}
        assets={editAssets}
      />

      {/* Renew agreement sheet */}
      <Sheet open={renewOpen} onOpenChange={setRenewOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader><SheetTitle>Forny serviceavtale</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Forleng avtalen med en ny periode. Sluttdato beregnes fra {a.end_date ? "nåværende sluttdato" : "dagens dato"}.
            </p>
            <Card className="p-3 bg-muted/30">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <Field label="Nåværende start" value={formatDate(a.start_date)} />
                <Field label="Nåværende slutt" value={formatDate(a.end_date) || "Løpende"} />
                <Field label="Intervall" value={AGREEMENT_INTERVAL_LABELS[a.interval] || a.interval} />
                <Field label="Status" value={AGREEMENT_STATUS_LABELS[a.status] || a.status} />
              </div>
            </Card>
            <div className="space-y-1.5">
              <Label>Forleng med (måneder)</Label>
              <Input type="number" min="1" max="60" value={renewMonths} onChange={e => setRenewMonths(e.target.value)} />
            </div>
            {renewMonths && (
              <p className="text-xs text-muted-foreground">
                Ny sluttdato blir: <span className="font-medium text-foreground">
                  {format(addMonths(a.end_date ? new Date(a.end_date) : new Date(), parseInt(renewMonths) || 12), "dd.MM.yyyy")}
                </span>
              </p>
            )}
          </div>
          <SheetFooter className="flex flex-row justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setRenewOpen(false)}>Avbryt</Button>
            <Button onClick={renewAgreement} disabled={renewing || !renewMonths} className="gap-1.5">
              {renewing && <Loader2 className="h-4 w-4 animate-spin" />}
              <RefreshCw className="h-3.5 w-3.5" />Forny avtale
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ─── Timeline item component ─────────────────────────────────── */
function TimelineItem({ visit, type, onSchedule }: { visit: any; type: "active" | "upcoming" | "completed" | "other"; onSchedule?: () => void }) {
  const dotColor = type === "active" ? "bg-amber-500" : type === "upcoming" ? "bg-blue-500" : type === "completed" ? "bg-emerald-500" : "bg-muted";

  return (
    <div className="relative">
      <div className={`absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center ${dotColor}`}>
        {type === "completed" ? <CheckCircle2 className="h-3 w-3 text-white" /> :
         type === "active" ? <Clock className="h-3 w-3 text-white" /> :
         type === "upcoming" ? <CalendarDays className="h-3 w-3 text-white" /> :
         <AlertTriangle className="h-3 w-3 text-muted-foreground" />}
      </div>
      <Card className="ml-2 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <p className="font-medium text-sm">{formatDate(visit.scheduled_date)}</p>
              <Badge variant="outline" className="text-[10px]">{VISIT_STATUS_LABELS[visit.status] || visit.status}</Badge>
            </div>
            {visit.findings && <p className="text-xs text-muted-foreground mt-1">{visit.findings.substring(0, 100)}{visit.findings.length > 100 ? "..." : ""}</p>}
            {visit.completed_at && <p className="text-xs text-muted-foreground">Fullført: {formatDate(visit.completed_at)}</p>}
            {visit.actions_taken && <p className="text-xs text-muted-foreground mt-0.5">Tiltak: {visit.actions_taken.substring(0, 80)}</p>}
          </div>
          {(type === "upcoming" || type === "active") && onSchedule && (
            <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={onSchedule}>
              <CalendarDays className="h-3 w-3" />Planlegg
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

/* ─── Projected visit item (visual only) ──────────────────────── */
function ProjectedVisitItem({ date, interval }: { date: string; interval: string }) {
  return (
    <div className="relative">
      <div className="absolute -left-6 top-1 w-5 h-5 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
        <CalendarDays className="h-2.5 w-2.5 text-muted-foreground/40" />
      </div>
      <div className="ml-2 p-3 rounded-lg border border-dashed border-muted-foreground/20 bg-muted/10">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">{formatDate(date)}</p>
          <Badge variant="outline" className="text-[10px] border-dashed text-muted-foreground/60">Forventet</Badge>
        </div>
        <p className="text-xs text-muted-foreground/60 mt-0.5">
          Projisert basert på {AGREEMENT_INTERVAL_LABELS[interval as keyof typeof AGREEMENT_INTERVAL_LABELS]?.toLowerCase() || interval} intervall
        </p>
      </div>
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
