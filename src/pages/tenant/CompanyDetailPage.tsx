import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useCompanyDetail } from "@/hooks/useCompanyDetail";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, ArrowLeft, Building2, Contact, MapPin, Thermometer, TrendingUp, Wrench, ShieldCheck, FileText, Mail, Phone, Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DEAL_STAGE_LABELS, DEAL_STAGE_COLORS, formatCurrency,
} from "@/lib/crm-labels";
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

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/tenant/crm/companies"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">{c.name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">{c.name}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                {c.customer_type && (
                  <Badge className={`text-[10px] ${CUSTOMER_TYPE_COLORS[c.customer_type] || ""}`}>
                    {CUSTOMER_TYPE_LABELS[c.customer_type] || c.customer_type}
                  </Badge>
                )}
                {c.org_number && <span>Org: {c.org_number}</span>}
                {c.industry && <span className="capitalize">{c.industry}</span>}
                {c.city && <span>{c.postal_code} {c.city}</span>}
              </div>
            </div>
          </div>
          <div className="flex gap-4 mt-3 text-sm">
            {c.email && <span className="flex items-center gap-1.5 text-muted-foreground"><Mail className="h-3.5 w-3.5" />{c.email}</span>}
            {c.phone && <span className="flex items-center gap-1.5 text-muted-foreground"><Phone className="h-3.5 w-3.5" />{c.phone}</span>}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditCompanyOpen(true)} className="gap-1.5">
          <Pencil className="h-3.5 w-3.5" />Rediger
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="contacts">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="contacts" className="gap-1.5"><Contact className="h-3.5 w-3.5" />Kontakter ({contacts.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="sites" className="gap-1.5"><MapPin className="h-3.5 w-3.5" />Anleggssteder ({sites.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="assets" className="gap-1.5"><Thermometer className="h-3.5 w-3.5" />Anlegg ({assets.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="deals" className="gap-1.5"><TrendingUp className="h-3.5 w-3.5" />Deals ({deals.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="jobs" className="gap-1.5"><Wrench className="h-3.5 w-3.5" />Jobber ({jobs.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="agreements" className="gap-1.5"><ShieldCheck className="h-3.5 w-3.5" />Avtaler ({agreements.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="warranty" className="gap-1.5">Garanti ({warrantyCases.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="documents" className="gap-1.5"><FileText className="h-3.5 w-3.5" />Dokumenter ({documents.data?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="contacts" className="mt-4">
          {contacts.data?.length === 0 ? <EmptyState text="Ingen kontakter" /> : (
            <div className="grid gap-3">
                {contacts.data?.map(ct => (
                <Link key={ct.id} to={`/tenant/crm/contacts/${ct.id}`}>
                  <Card className="p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
                    <Avatar className="h-9 w-9"><AvatarFallback className="text-xs bg-muted">{ct.first_name[0]}{ct.last_name?.[0] || ""}</AvatarFallback></Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{ct.first_name} {ct.last_name || ""}</p>
                      {ct.title && <p className="text-xs text-muted-foreground">{ct.title}</p>}
                    </div>
                    {ct.email && <span className="text-xs text-muted-foreground">{ct.email}</span>}
                    {ct.phone && <span className="text-xs text-muted-foreground">{ct.phone}</span>}
                    {ct.is_primary_contact && <Badge variant="secondary" className="text-[10px]">Primær</Badge>}
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sites" className="mt-4">
          <div className="flex justify-end mb-3">
            <Button size="sm" onClick={() => setSiteDialog({ open: true })}><Plus className="h-3.5 w-3.5 mr-1" />Nytt sted</Button>
          </div>
          {sites.data?.length === 0 ? <EmptyState text="Ingen anleggssteder" /> : (
            <div className="grid gap-3">
              {sites.data?.map(s => (
                <Link key={s.id} to={`/tenant/crm/sites/${s.id}`}>
                  <Card className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{s.name || s.address || "Uten navn"}</p>
                        <p className="text-xs text-muted-foreground">{s.address}, {s.postal_code} {s.city}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{SITE_TYPE_LABELS[s.site_type] || s.site_type}</Badge>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="assets" className="mt-4">
          <div className="flex justify-end mb-3">
            <Button size="sm" onClick={() => setAssetDialog({ open: true })} disabled={!sites.data?.length}>
              <Plus className="h-3.5 w-3.5 mr-1" />Nytt anlegg
            </Button>
          </div>
          {assets.data?.length === 0 ? <EmptyState text="Ingen anlegg" /> : (
            <div className="grid gap-3">
              {assets.data?.map(a => (
                <Link key={a.id} to={`/tenant/crm/assets/${a.id}`}>
                  <Card className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{a.manufacturer} {a.model || ""}</p>
                        <p className="text-xs text-muted-foreground">
                          {ENERGY_SOURCE_LABELS[a.energy_source] || a.energy_source}
                          {a.nominal_kw && ` · ${a.nominal_kw} kW`}
                          {a.serial_number && ` · SN: ${a.serial_number}`}
                        </p>
                      </div>
                      <Badge className={`text-[10px] ${ASSET_STATUS_COLORS[a.status] || ""}`}>{ASSET_STATUS_LABELS[a.status] || a.status}</Badge>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="deals" className="mt-4">
          {deals.data?.length === 0 ? <EmptyState text="Ingen deals" /> : (
            <div className="grid gap-3">
              {deals.data?.map(d => (
                <Link key={d.id} to={`/tenant/crm/deals/${d.id}`}>
                  <Card className="p-4 flex items-center justify-between hover:shadow-md transition-shadow">
                    <div>
                      <p className="font-medium text-sm">{d.title}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(d.value as number | null)} · {formatDate(d.expected_close_date)}</p>
                    </div>
                    <Badge className={`text-[10px] ${DEAL_STAGE_COLORS[d.stage as keyof typeof DEAL_STAGE_COLORS] || ""}`}>
                      {DEAL_STAGE_LABELS[d.stage as keyof typeof DEAL_STAGE_LABELS] || d.stage}
                    </Badge>
                  </Card>
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
            <Button size="sm" onClick={() => setAgreementDialog({ open: true })}><Plus className="h-3.5 w-3.5 mr-1" />Ny avtale</Button>
          </div>
          {agreements.data?.length === 0 ? <EmptyState text="Ingen serviceavtaler" /> : (
            <div className="grid gap-3">
              {agreements.data?.map(a => (
                <Link key={a.id} to={`/tenant/crm/agreements/${a.id}`}>
                  <Card className="p-4 hover:shadow-md transition-shadow flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{a.agreement_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {AGREEMENT_INTERVAL_LABELS[a.interval] || a.interval} · Neste: {formatDate(a.next_visit_due)}
                      </p>
                    </div>
                    <Badge className={`text-[10px] ${AGREEMENT_STATUS_COLORS[a.status] || ""}`}>
                      {AGREEMENT_STATUS_LABELS[a.status] || a.status}
                    </Badge>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="warranty" className="mt-4">
          <div className="flex justify-end mb-3">
            <Button size="sm" onClick={() => setWarrantyDialog(true)}><Plus className="h-3.5 w-3.5 mr-1" />Ny garantisak</Button>
          </div>
          {warrantyCases.data?.length === 0 ? <EmptyState text="Ingen garantisaker" /> : (
            <div className="grid gap-3">
              {warrantyCases.data?.map(w => (
                <Link key={w.id} to={`/tenant/crm/warranty/${w.id}`}>
                  <Card className="p-4 hover:shadow-md transition-shadow flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{w.warranty_number}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{w.issue_description}</p>
                    </div>
                    <Badge className={`text-[10px] ${WARRANTY_STATUS_COLORS[w.status] || ""}`}>
                      {WARRANTY_STATUS_LABELS[w.status] || w.status}
                    </Badge>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <DocumentsList documents={documents.data} />
        </TabsContent>
      </Tabs>

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

function EmptyState({ text }: { text: string }) {
  return <div className="text-center py-10 text-sm text-muted-foreground">{text}</div>;
}

function JobsList({ jobs }: { jobs: any[] | undefined }) {
  if (!jobs || jobs.length === 0) return <EmptyState text="Ingen jobber" />;
  return (
    <div className="grid gap-3">
      {jobs.map(j => (
        <Link key={j.id} to={`/tenant/crm/jobs/${j.id}`}>
          <Card className="p-4 hover:shadow-md transition-shadow flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">{j.job_number} – {j.title}</p>
              <p className="text-xs text-muted-foreground">
                {JOB_TYPE_LABELS[j.job_type] || j.job_type} · {formatDate(j.scheduled_start)}
              </p>
            </div>
            <Badge className={`text-[10px] ${JOB_STATUS_COLORS[j.status] || ""}`}>
              {JOB_STATUS_LABELS[j.status] || j.status}
            </Badge>
          </Card>
        </Link>
      ))}
    </div>
  );
}

function DocumentsList({ documents }: { documents: any[] | undefined }) {
  if (!documents || documents.length === 0) return <EmptyState text="Ingen dokumenter" />;
  return (
    <div className="grid gap-3">
      {documents.map(d => (
        <Card key={d.id} className="p-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">{d.file_name}</p>
            <p className="text-xs text-muted-foreground">
              {DOCUMENT_CATEGORY_LABELS[d.category] || d.category} · {formatDate(d.created_at)}
            </p>
          </div>
          {d.mime_type && <Badge variant="outline" className="text-[10px]">{d.mime_type.split("/")[1]}</Badge>}
        </Card>
      ))}
    </div>
  );
}
