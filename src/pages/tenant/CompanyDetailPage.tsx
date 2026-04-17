import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useCompanyDetail } from "@/hooks/useCompanyDetail";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Loader2, ArrowLeft, Contact, MapPin, Thermometer, TrendingUp, Wrench,
  ShieldCheck, FileText, Mail, Phone, Plus, Pencil, ScrollText,
  MessageSquare, Calendar, FileEdit, Clock, ChevronRight,
} from "lucide-react";
import { DEAL_STAGE_LABELS, DEAL_STAGE_COLORS, formatCurrency } from "@/lib/crm-labels";
import {
  ENERGY_SOURCE_LABELS, ASSET_STATUS_LABELS, ASSET_STATUS_COLORS,
  CUSTOMER_TYPE_LABELS, CUSTOMER_TYPE_COLORS,
  JOB_STATUS_LABELS, JOB_STATUS_COLORS, JOB_TYPE_LABELS,
  AGREEMENT_STATUS_LABELS, AGREEMENT_STATUS_COLORS, formatIntervalLabel,
  WARRANTY_STATUS_LABELS, WARRANTY_STATUS_COLORS,
  SITE_TYPE_LABELS, DOCUMENT_CATEGORY_LABELS,
  formatDate,
} from "@/lib/domain-labels";
import { SiteFormDialog } from "@/components/crud/SiteFormDialog";
import { AssetFormDialog } from "@/components/crud/AssetFormDialog";
import { AgreementFormDialog } from "@/components/crud/AgreementFormDialog";
import { WarrantyFormDialog } from "@/components/crud/WarrantyFormDialog";
import { CompanyEditDialog } from "@/components/crud/CompanyEditDialog";
import { useCanDo } from "@/hooks/useCanDo";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

type ActivityType = "call" | "note" | "meeting" | "email";
type Activity = {
  id: string;
  type: ActivityType;
  content: string;
  created_at: string;
  created_by: string | null;
};

const ACTIVITY_TYPES: { value: ActivityType; label: string; icon: React.ElementType; color: string }[] = [
  { value: "note", label: "Notat", icon: FileEdit, color: "text-gray-500" },
  { value: "call", label: "Samtale", icon: Phone, color: "text-blue-500" },
  { value: "meeting", label: "Møte", icon: Calendar, color: "text-violet-500" },
  { value: "email", label: "E-post", icon: Mail, color: "text-orange-500" },
];

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { tenantId, user } = useAuth();
  const { canDo } = useCanDo();
  const navigate = useNavigate();
  const { company, contacts, sites, assets, deals, jobs, agreements, warrantyCases, documents } = useCompanyDetail(id);

  const [siteDialog, setSiteDialog] = useState<{ open: boolean; site?: any }>({ open: false });
  const [assetDialog, setAssetDialog] = useState<{ open: boolean; asset?: any }>({ open: false });
  const [agreementDialog, setAgreementDialog] = useState<{ open: boolean; agreement?: any }>({ open: false });
  const [warrantyDialog, setWarrantyDialog] = useState(false);
  const [editCompanyOpen, setEditCompanyOpen] = useState(false);

  if (company.isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!company.data) {
    return <div className="text-center py-20 text-muted-foreground">Kunde ikke funnet</div>;
  }

  const c = company.data;
  const activeAgreements = agreements.data?.filter(a => a.status === "active").length ?? 0;
  const openDeals = deals.data?.filter(d => !["won", "lost"].includes(d.stage)).length ?? 0;
  const activeJobs = jobs.data?.filter(j => !["completed", "cancelled"].includes(j.status)).length ?? 0;
  const totalAssets = assets.data?.length ?? 0;

  const TAB_ITEMS = [
    { value: "contacts", icon: Contact, label: "Kontakter", count: contacts.data?.length ?? 0 },
    { value: "sites", icon: MapPin, label: "Anleggssteder", count: sites.data?.length ?? 0 },
    { value: "assets", icon: Thermometer, label: "Anlegg", count: totalAssets },
    { value: "deals", icon: TrendingUp, label: "Deals", count: deals.data?.length ?? 0 },
    { value: "jobs", icon: Wrench, label: "Jobber", count: jobs.data?.length ?? 0 },
    { value: "agreements", icon: ShieldCheck, label: "Avtaler", count: agreements.data?.length ?? 0 },
    { value: "warranty", icon: ShieldCheck, label: "Garanti", count: warrantyCases.data?.length ?? 0 },
    { value: "documents", icon: FileText, label: "Dokumenter", count: documents.data?.length ?? 0 },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" className="shrink-0 mt-0.5" asChild>
          <Link to="/tenant/crm/companies"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <Avatar className="h-11 w-11 shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                {c.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h1 className="text-xl font-bold font-[Lexend] truncate">{c.name}</h1>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
                {c.customer_type && (
                  <span className={cn(
                    "inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium",
                    CUSTOMER_TYPE_COLORS[c.customer_type] || "bg-muted text-muted-foreground"
                  )}>
                    {CUSTOMER_TYPE_LABELS[c.customer_type] || c.customer_type}
                  </span>
                )}
                {c.org_number && <span>Org: {c.org_number}</span>}
                {c.city && <span>{c.postal_code} {c.city}</span>}
                {c.email && (
                  <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>
                )}
                {c.phone && (
                  <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>
                )}
              </div>
            </div>
          </div>
        </div>
        {canDo("companies.edit") && (
          <Button variant="outline" size="sm" onClick={() => setEditCompanyOpen(true)} className="gap-1.5 shrink-0">
            <Pencil className="h-3.5 w-3.5" /> Rediger
          </Button>
        )}
      </div>

      {/* Stat-kort */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-muted/40 rounded-lg px-4 py-3 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Aktive avtaler</p>
            <p className="font-semibold text-sm">{activeAgreements}</p>
          </div>
        </div>
        <div className="bg-muted/40 rounded-lg px-4 py-3 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-orange-100 dark:bg-orange-950/60 flex items-center justify-center shrink-0">
            <TrendingUp className="h-4 w-4 text-orange-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Åpne deals</p>
            <p className="font-semibold text-sm">{openDeals}</p>
          </div>
        </div>
        <div className="bg-muted/40 rounded-lg px-4 py-3 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center shrink-0">
            <Wrench className="h-4 w-4 text-blue-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Aktive jobber</p>
            <p className="font-semibold text-sm">{activeJobs}</p>
          </div>
        </div>
        <div className="bg-muted/40 rounded-lg px-4 py-3 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Thermometer className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Anlegg</p>
            <p className="font-semibold text-sm">{totalAssets}</p>
          </div>
        </div>
      </div>

      {/* Hurtighandlinger */}
      <div className="flex flex-wrap gap-2">
        {canDo("agreements.create") && (
          <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={() => setAgreementDialog({ open: true })}>
            <ScrollText className="h-3.5 w-3.5" /> Ny serviceavtale
          </Button>
        )}
        {canDo("sites.create") && (
          <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={() => setSiteDialog({ open: true })}>
            <MapPin className="h-3.5 w-3.5" /> Nytt sted
          </Button>
        )}
        {canDo("assets.create") && (
          <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={() => setAssetDialog({ open: true })} disabled={!sites.data?.length}>
            <Thermometer className="h-3.5 w-3.5" /> Nytt anlegg
          </Button>
        )}
        {canDo("warranties.create") && (
          <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={() => setWarrantyDialog(true)}>
            <ShieldCheck className="h-3.5 w-3.5" /> Ny garantisak
          </Button>
        )}
        {canDo("deals.create") && (
          <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={() => navigate(`/tenant/crm/deals?company_id=${id}`)}>
            <TrendingUp className="h-3.5 w-3.5" /> Ny deal
          </Button>
        )}
        {canDo("jobs.create") && (
          <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={() => navigate(`/tenant/crm/jobs?company_id=${id}`)}>
            <Wrench className="h-3.5 w-3.5" /> Ny jobb
          </Button>
        )}
      </div>

      {/* Innhold: tabs + aktivitetslogg */}
      <div className="flex gap-6 items-start">
        <div className="flex-1 min-w-0">
          <Tabs defaultValue="contacts">
            <div className="border-b border-border -mb-px">
              <TabsList className="h-auto bg-transparent p-0 gap-0 justify-start overflow-x-auto flex-nowrap w-full rounded-none">
                {TAB_ITEMS.map(tab => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none px-4 py-2.5 gap-1.5 text-xs font-medium shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <tab.icon className="h-3.5 w-3.5" />
                    {tab.label}
                    <span className="text-muted-foreground">({tab.count})</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <TabsContent value="contacts" className="mt-4">
              {!contacts.data?.length ? <EmptyTabState text="Ingen kontakter" /> : (
                <div className="rounded-xl border border-border overflow-hidden bg-card">
                  {contacts.data.map(ct => (
                    <Link key={ct.id} to={`/tenant/crm/contacts/${ct.id}`}>
                      <div className="flex items-center px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors group">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className="text-xs bg-muted">{ct.first_name[0]}{ct.last_name?.[0] || ""}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 ml-3">
                          <p className="font-medium text-sm">{ct.first_name} {ct.last_name || ""}</p>
                          {ct.title && <p className="text-xs text-muted-foreground">{ct.title}</p>}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {ct.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{ct.phone}</span>}
                          {ct.email && <span className="hidden md:block">{ct.email}</span>}
                          {ct.is_primary_contact && <Badge variant="secondary" className="text-[10px]">Primær</Badge>}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="sites" className="mt-4">
              <div className="flex justify-end mb-3">
                {canDo("sites.create") && (
                  <Button size="sm" className="gap-1.5" onClick={() => setSiteDialog({ open: true })}>
                    <Plus className="h-3.5 w-3.5" /> Nytt sted
                  </Button>
                )}
              </div>
              {!sites.data?.length ? <EmptyTabState text="Ingen anleggssteder" /> : (
                <div className="rounded-xl border border-border overflow-hidden bg-card">
                  {sites.data.map(s => (
                    <Link key={s.id} to={`/tenant/crm/sites/${s.id}`}>
                      <div className="flex items-center px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors group">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{s.name || s.address || "Uten navn"}</p>
                          <p className="text-xs text-muted-foreground">{s.address}, {s.postal_code} {s.city}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] mr-2">{SITE_TYPE_LABELS[s.site_type] || s.site_type}</Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="assets" className="mt-4">
              <div className="flex justify-end mb-3">
                {canDo("assets.create") && (
                  <Button size="sm" className="gap-1.5" onClick={() => setAssetDialog({ open: true })} disabled={!sites.data?.length}>
                    <Plus className="h-3.5 w-3.5" /> Nytt anlegg
                  </Button>
                )}
              </div>
              {!assets.data?.length ? <EmptyTabState text="Ingen anlegg registrert" /> : (
                <div className="rounded-xl border border-border overflow-hidden bg-card">
                  {assets.data.map(a => (
                    <Link key={a.id} to={`/tenant/crm/assets/${a.id}`}>
                      <div className="flex items-center px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors group">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{a.manufacturer} {a.model || ""}</p>
                          <p className="text-xs text-muted-foreground">
                            {ENERGY_SOURCE_LABELS[a.energy_source] || a.energy_source}
                            {a.nominal_kw && ` · ${a.nominal_kw} kW`}
                            {a.serial_number && ` · SN: ${a.serial_number}`}
                          </p>
                        </div>
                        <Badge className={cn("text-[10px] mr-2", ASSET_STATUS_COLORS[a.status] || "")}>
                          {ASSET_STATUS_LABELS[a.status] || a.status}
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="deals" className="mt-4">
              {!deals.data?.length ? <EmptyTabState text="Ingen deals" /> : (
                <div className="rounded-xl border border-border overflow-hidden bg-card">
                  {deals.data.map(d => (
                    <Link key={d.id} to={`/tenant/crm/deals/${d.id}`}>
                      <div className="flex items-center px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors group">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{d.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(d.value as number | null)} · {formatDate(d.expected_close_date)}
                          </p>
                        </div>
                        <Badge className={cn("text-[10px] mr-2", DEAL_STAGE_COLORS[d.stage as keyof typeof DEAL_STAGE_COLORS] || "")}>
                          {DEAL_STAGE_LABELS[d.stage as keyof typeof DEAL_STAGE_LABELS] || d.stage}
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="jobs" className="mt-4">
              <JobsList jobs={jobs.data} />
            </TabsContent>

            <TabsContent value="agreements" className="mt-4">
              <div className="flex justify-end mb-3">
                {canDo("agreements.create") && (
                  <Button size="sm" className="gap-1.5" onClick={() => setAgreementDialog({ open: true })}>
                    <Plus className="h-3.5 w-3.5" /> Ny serviceavtale
                  </Button>
                )}
              </div>
              {!agreements.data?.length ? (
                <div className="flex flex-col items-center justify-center py-14 px-6 text-center max-w-sm mx-auto">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                    <ScrollText className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold mb-1">Ingen serviceavtaler</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                    Opprett en serviceavtale for å sette opp periodisk vedlikehold med automatisk generering av servicebesøk.
                  </p>
                  {canDo("agreements.create") && (
                    <Button size="sm" onClick={() => setAgreementDialog({ open: true })} className="gap-1.5">
                      <Plus className="h-3.5 w-3.5" /> Opprett serviceavtale
                    </Button>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-border overflow-hidden bg-card">
                  {agreements.data.map(a => (
                    <Link key={a.id} to={`/tenant/crm/agreements/${a.id}`}>
                      <div className="flex items-center px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors group">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{a.agreement_number}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatIntervalLabel(a.interval, (a as any).custom_interval_months)} · Neste: {formatDate(a.next_visit_due)}
                          </p>
                        </div>
                        <Badge className={cn("text-[10px] mr-2", AGREEMENT_STATUS_COLORS[a.status] || "")}>
                          {AGREEMENT_STATUS_LABELS[a.status] || a.status}
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="warranty" className="mt-4">
              <div className="flex justify-end mb-3">
                {canDo("warranties.create") && (
                  <Button size="sm" className="gap-1.5" onClick={() => setWarrantyDialog(true)}>
                    <Plus className="h-3.5 w-3.5" /> Ny garantisak
                  </Button>
                )}
              </div>
              {!warrantyCases.data?.length ? <EmptyTabState text="Ingen garantisaker" /> : (
                <div className="rounded-xl border border-border overflow-hidden bg-card">
                  {warrantyCases.data.map(w => (
                    <Link key={w.id} to={`/tenant/crm/warranty/${w.id}`}>
                      <div className="flex items-center px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors group">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{w.warranty_number}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{w.issue_description}</p>
                        </div>
                        <Badge className={cn("text-[10px] mr-2", WARRANTY_STATUS_COLORS[w.status] || "")}>
                          {WARRANTY_STATUS_LABELS[w.status] || w.status}
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="documents" className="mt-4">
              <DocumentsList documents={documents.data} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Aktivitetslogg sidebar */}
        <div className="hidden lg:block w-72 shrink-0">
          {id && tenantId && (
            <ActivityLogSidebar companyId={id} tenantId={tenantId} userId={user?.id || ""} />
          )}
        </div>
      </div>

      {/* Dialogs */}
      <SiteFormDialog
        open={siteDialog.open}
        onOpenChange={open => setSiteDialog(s => ({ ...s, open }))}
        companyId={id!}
        site={siteDialog.site}
      />
      <AssetFormDialog
        open={assetDialog.open}
        onOpenChange={open => setAssetDialog(s => ({ ...s, open }))}
        siteId={sites.data?.[0]?.id || ""}
        asset={assetDialog.asset}
        sites={sites.data?.map(s => ({ id: s.id, name: s.name, address: s.address })) || []}
      />
      <AgreementFormDialog
        open={agreementDialog.open}
        onOpenChange={open => setAgreementDialog(s => ({ ...s, open }))}
        companyId={id!}
        agreement={agreementDialog.agreement}
        sites={sites.data?.map(s => ({ id: s.id, name: s.name, address: s.address })) || []}
        assets={assets.data?.map(a => ({ id: a.id, manufacturer: a.manufacturer, model: a.model })) || []}
      />
      <WarrantyFormDialog
        open={warrantyDialog}
        onOpenChange={setWarrantyDialog}
        companyId={id!}
        assets={assets.data?.map(a => ({ id: a.id, manufacturer: a.manufacturer, model: a.model })) || []}
      />
      <CompanyEditDialog
        open={editCompanyOpen}
        onOpenChange={setEditCompanyOpen}
        company={c}
        onSaved={() => company.refetch()}
      />
    </div>
  );
}

function EmptyTabState({ text }: { text: string }) {
  return <div className="text-center py-10 text-sm text-muted-foreground">{text}</div>;
}

function JobsList({ jobs }: { jobs: any[] | undefined }) {
  if (!jobs || jobs.length === 0) return <EmptyTabState text="Ingen jobber" />;
  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      {jobs.map(j => (
        <Link key={j.id} to={`/tenant/crm/jobs/${j.id}`}>
          <div className="flex items-center px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors group">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{j.job_number} – {j.title}</p>
              <p className="text-xs text-muted-foreground">
                {JOB_TYPE_LABELS[j.job_type] || j.job_type} · {formatDate(j.scheduled_start)}
              </p>
            </div>
            <Badge className={cn("text-[10px] mr-2", JOB_STATUS_COLORS[j.status] || "")}>
              {JOB_STATUS_LABELS[j.status] || j.status}
            </Badge>
            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </Link>
      ))}
    </div>
  );
}

function DocumentsList({ documents }: { documents: any[] | undefined }) {
  if (!documents || documents.length === 0) return <EmptyTabState text="Ingen dokumenter" />;
  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      {documents.map(d => (
        <div key={d.id} className="flex items-center px-4 py-3 border-b border-border last:border-b-0">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{d.file_name}</p>
            <p className="text-xs text-muted-foreground">
              {DOCUMENT_CATEGORY_LABELS[d.category] || d.category} · {formatDate(d.created_at)}
            </p>
          </div>
          {d.mime_type && <Badge variant="outline" className="text-[10px]">{d.mime_type.split("/")[1]}</Badge>}
        </div>
      ))}
    </div>
  );
}

function ActivityLogSidebar({ companyId, tenantId, userId }: { companyId: string; tenantId: string; userId: string }) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableReady, setTableReady] = useState(true);
  const [activityType, setActivityType] = useState<ActivityType>("note");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchActivities = useCallback(async () => {
    const { data, error } = await supabase
      .from("crm_activities" as any)
      .select("*")
      .eq("company_id", companyId)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      if (error.message?.includes("does not exist") || error.code === "42P01") {
        setTableReady(false);
      }
    } else {
      setActivities((data || []) as Activity[]);
    }
    setLoading(false);
  }, [companyId, tenantId]);

  useEffect(() => { fetchActivities(); }, [fetchActivities]);

  const logActivity = async () => {
    if (!content.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("crm_activities" as any).insert({
      company_id: companyId,
      tenant_id: tenantId,
      type: activityType,
      content: content.trim(),
      created_by: userId || null,
    } as any);
    if (error) {
      toast.error("Kunne ikke logge aktivitet");
    } else {
      setContent("");
      fetchActivities();
    }
    setSaving(false);
  };

  const activeType = ACTIVITY_TYPES.find(t => t.value === activityType)!;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold">Aktivitetslogg</span>
      </div>

      {/* Logg ny aktivitet */}
      <div className="p-3 border-b border-border space-y-2">
        <div className="flex gap-1">
          {ACTIVITY_TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => setActivityType(t.value)}
              className={cn(
                "flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-[10px] font-medium transition-all",
                activityType === t.value
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>
        <Textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder={`Logg ${activeType.label.toLowerCase()}...`}
          rows={2}
          className="text-xs resize-none"
          onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) logActivity(); }}
        />
        <Button
          size="sm"
          className="w-full h-7 text-xs gap-1.5"
          onClick={logActivity}
          disabled={saving || !content.trim()}
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
          Logg
        </Button>
      </div>

      {/* Liste */}
      <div className="divide-y divide-border max-h-[480px] overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : !tableReady ? (
          <div className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Aktivitetsloggen krever en databasemigrering.</p>
            <p className="text-[10px] text-muted-foreground mt-1 font-mono">crm_activities</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="py-8 text-center">
            <MessageSquare className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Ingen aktiviteter ennå</p>
          </div>
        ) : (
          activities.map(a => {
            const typeInfo = ACTIVITY_TYPES.find(t => t.value === a.type) || ACTIVITY_TYPES[0];
            return (
              <div key={a.id} className="px-4 py-3 flex gap-2.5">
                <div className={cn("mt-0.5 shrink-0", typeInfo.color)}>
                  <typeInfo.icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs leading-relaxed text-foreground">{a.content}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {typeInfo.label} · {format(new Date(a.created_at), "d. MMM, HH:mm", { locale: nb })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
