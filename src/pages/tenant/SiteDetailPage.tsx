import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useSiteDetail } from "@/hooks/useSiteDetail";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Building2, MapPin, Thermometer, Wrench, ShieldCheck, AlertTriangle, Pencil, User, Plus } from "lucide-react";
import {
  ENERGY_SOURCE_LABELS, ASSET_STATUS_LABELS, ASSET_STATUS_COLORS,
  JOB_STATUS_LABELS, JOB_STATUS_COLORS, JOB_TYPE_LABELS,
  AGREEMENT_STATUS_LABELS, AGREEMENT_STATUS_COLORS,
  formatIntervalLabel,
  WARRANTY_STATUS_LABELS, WARRANTY_STATUS_COLORS,
  SITE_TYPE_LABELS, formatDate,
} from "@/lib/domain-labels";
import { SiteFormDialog } from "@/components/crud/SiteFormDialog";
import { AgreementFormDialog } from "@/components/crud/AgreementFormDialog";

export default function SiteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { site, company, primaryContact, assets, jobs, agreements, warrantyCases } = useSiteDetail(id);
  const [editOpen, setEditOpen] = useState(false);
  const [agreementOpen, setAgreementOpen] = useState(false);

  if (site.isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!site.data) {
    return <div className="text-center py-20 text-muted-foreground">Anleggssted ikke funnet</div>;
  }

  const s = site.data;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to={`/tenant/crm/companies/${s.company_id}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <MapPin className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{s.name || s.address || "Anleggssted"}</h1>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                <Badge variant="outline" className="text-[10px]">{SITE_TYPE_LABELS[s.site_type] || s.site_type}</Badge>
                <span>{s.address}, {s.postal_code} {s.city}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-4 mt-3 text-sm">
            {company.data && (
              <Link to={`/tenant/crm/companies/${company.data.id}`} className="flex items-center gap-1.5 text-primary hover:underline">
                <Building2 className="h-3.5 w-3.5" />{company.data.name}
              </Link>
            )}
            {primaryContact.data && (
              <Link to={`/tenant/crm/contacts/${primaryContact.data.id}`} className="flex items-center gap-1.5 text-primary hover:underline">
                <User className="h-3.5 w-3.5" />{primaryContact.data.first_name} {primaryContact.data.last_name || ""}
              </Link>
            )}
          </div>
          {s.access_info && <p className="text-sm text-muted-foreground mt-2">Tilgang: {s.access_info}</p>}
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="gap-1.5">
          <Pencil className="h-3.5 w-3.5" />Rediger
        </Button>
      </div>

      <Tabs defaultValue="assets">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="assets" className="gap-1.5"><Thermometer className="h-3.5 w-3.5" />Anlegg ({assets.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="jobs" className="gap-1.5"><Wrench className="h-3.5 w-3.5" />Jobber ({jobs.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="agreements" className="gap-1.5"><ShieldCheck className="h-3.5 w-3.5" />Avtaler ({agreements.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="warranty" className="gap-1.5"><AlertTriangle className="h-3.5 w-3.5" />Garanti ({warrantyCases.data?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="assets" className="mt-4">
          {!assets.data?.length ? <Empty text="Ingen anlegg på dette stedet" /> : (
            <div className="grid gap-3">
              {assets.data.map(a => (
                <Link key={a.id} to={`/tenant/crm/assets/${a.id}`}>
                  <Card className="p-4 hover:shadow-md transition-shadow flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{a.manufacturer} {a.model || ""}</p>
                      <p className="text-xs text-muted-foreground">
                        {ENERGY_SOURCE_LABELS[a.energy_source] || a.energy_source}
                        {a.nominal_kw && ` · ${a.nominal_kw} kW`}
                        {a.serial_number && ` · SN: ${a.serial_number}`}
                      </p>
                    </div>
                    <Badge className={`text-[10px] ${ASSET_STATUS_COLORS[a.status] || ""}`}>{ASSET_STATUS_LABELS[a.status] || a.status}</Badge>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="jobs" className="mt-4">
          {!jobs.data?.length ? <Empty text="Ingen jobber på dette stedet" /> : (
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

        <TabsContent value="agreements" className="mt-4">
          <div className="flex justify-end mb-3">
            <Button size="sm" onClick={() => setAgreementOpen(true)} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />Ny serviceavtale
            </Button>
          </div>
          {!agreements.data?.length ? <Empty text="Ingen serviceavtaler på dette stedet" /> : (
            <div className="grid gap-3">
              {agreements.data.map(a => (
                <Link key={a.id} to={`/tenant/crm/agreements/${a.id}`}>
                  <Card className="p-4 hover:shadow-md transition-shadow flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{a.agreement_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatIntervalLabel(a.interval, (a as any).custom_interval_months)} · Neste: {formatDate(a.next_visit_due)}
                      </p>
                    </div>
                    <Badge className={`text-[10px] ${AGREEMENT_STATUS_COLORS[a.status] || ""}`}>{AGREEMENT_STATUS_LABELS[a.status] || a.status}</Badge>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="warranty" className="mt-4">
          {!warrantyCases.data?.length ? <Empty text="Ingen garantisaker knyttet til anlegg på dette stedet" /> : (
            <div className="grid gap-3">
              {warrantyCases.data.map(w => (
                <Link key={w.id} to={`/tenant/crm/warranty/${w.id}`}>
                  <Card className="p-4 hover:shadow-md transition-shadow flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{w.warranty_number}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{w.issue_description}</p>
                    </div>
                    <Badge className={`text-[10px] ${WARRANTY_STATUS_COLORS[w.status] || ""}`}>{WARRANTY_STATUS_LABELS[w.status] || w.status}</Badge>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {s.notes && (
        <Card className="p-4">
          <h3 className="text-sm font-medium mb-1">Notater</h3>
          <p className="text-sm text-muted-foreground">{s.notes}</p>
        </Card>
      )}

      <SiteFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        companyId={s.company_id}
        site={s}
      />
      <AgreementFormDialog
        open={agreementOpen}
        onOpenChange={setAgreementOpen}
        companyId={s.company_id}
        siteId={id}
      />
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="text-center py-10 text-sm text-muted-foreground">{text}</div>;
}
