import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAssetDetail } from "@/hooks/useAssetDetail";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Wrench, ShieldCheck, FileText, Info, Pencil, Plus } from "lucide-react";
import {
  ENERGY_SOURCE_LABELS, ASSET_STATUS_LABELS, ASSET_STATUS_COLORS,
  JOB_STATUS_LABELS, JOB_STATUS_COLORS, JOB_TYPE_LABELS,
  WARRANTY_STATUS_LABELS, WARRANTY_STATUS_COLORS,
  VISIT_STATUS_LABELS,
  formatDate,
} from "@/lib/domain-labels";
import { AssetFormDialog } from "@/components/crud/AssetFormDialog";
import { DocumentUploadSection } from "@/components/crud/DocumentUploadSection";
import { WarrantyFormDialog } from "@/components/crud/WarrantyFormDialog";

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { asset, site, company, serviceVisits, warrantyCases, jobs, documents } = useAssetDetail(id);
  const [editOpen, setEditOpen] = useState(false);
  const [warrantyOpen, setWarrantyOpen] = useState(false);

  if (asset.isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!asset.data) {
    return <div className="text-center py-20 text-muted-foreground">Anlegg ikke funnet</div>;
  }

  const a = asset.data;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{a.manufacturer} {a.model || ""}</h1>
            <Badge className={ASSET_STATUS_COLORS[a.status] || ""}>{ASSET_STATUS_LABELS[a.status] || a.status}</Badge>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}><Pencil className="h-3 w-3 mr-1" />Rediger</Button>
          </div>
          <div className="flex gap-3 text-sm text-muted-foreground mt-1">
            <span>{ENERGY_SOURCE_LABELS[a.energy_source] || a.energy_source}</span>
            {a.nominal_kw && <span>{a.nominal_kw} kW</span>}
            {a.serial_number && <span>SN: {a.serial_number}</span>}
          </div>
          <div className="flex gap-3 text-sm text-muted-foreground mt-1">
            {company.data && <Link to={`/tenant/crm/companies/${company.data.id}`} className="text-primary hover:underline">{company.data.name}</Link>}
            {site.data && <span>{site.data.address}, {site.data.city}</span>}
          </div>
        </div>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info" className="gap-1.5"><Info className="h-3.5 w-3.5" />Teknisk info</TabsTrigger>
          <TabsTrigger value="visits">Servicehistorikk ({serviceVisits.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="jobs" className="gap-1.5"><Wrench className="h-3.5 w-3.5" />Jobber ({jobs.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="warranty" className="gap-1.5"><ShieldCheck className="h-3.5 w-3.5" />Garanti ({warrantyCases.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="documents" className="gap-1.5"><FileText className="h-3.5 w-3.5" />Dokumenter ({documents.data?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-4">
          <Card className="p-5">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <Field label="Produsent" value={a.manufacturer} />
              <Field label="Modell" value={a.model} />
              <Field label="Innedel" value={a.indoor_unit_model} />
              <Field label="Serienummer" value={a.serial_number} />
              <Field label="Energikilde" value={ENERGY_SOURCE_LABELS[a.energy_source]} />
              <Field label="Nominell effekt" value={a.nominal_kw ? `${a.nominal_kw} kW` : null} />
              <Field label="Kuldemedium" value={a.refrigerant_type} />
              <Field label="Mengde" value={a.refrigerant_kg ? `${a.refrigerant_kg} kg` : null} />
              <Field label="Plassering utedel" value={a.outdoor_unit_location} />
              <Field label="Installert" value={formatDate(a.installed_at)} />
              <Field label="Garanti utløper" value={formatDate(a.warranty_expires_at)} />
            </div>
            {a.notes && <p className="text-sm text-muted-foreground mt-4 border-t pt-3">{a.notes}</p>}
          </Card>
        </TabsContent>

        <TabsContent value="visits" className="mt-4">
          {!serviceVisits.data?.length ? <Empty text="Ingen servicebesøk" /> : (
            <div className="grid gap-3">
              {serviceVisits.data.map(v => (
                <Card key={v.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{formatDate(v.scheduled_date)}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{v.findings || v.actions_taken || "–"}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{VISIT_STATUS_LABELS[v.status] || v.status}</Badge>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="jobs" className="mt-4">
          {!jobs.data?.length ? <Empty text="Ingen jobber" /> : (
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

        <TabsContent value="warranty" className="mt-4">
          {!warrantyCases.data?.length ? <Empty text="Ingen garantisaker" /> : (
            <div className="grid gap-3">
              {warrantyCases.data.map(w => (
                <Card key={w.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{w.warranty_number}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{w.issue_description}</p>
                  </div>
                  <Badge className={`text-[10px] ${WARRANTY_STATUS_COLORS[w.status] || ""}`}>{WARRANTY_STATUS_LABELS[w.status] || w.status}</Badge>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <DocumentUploadSection
            documents={documents.data}
            entityType="asset"
            entityId={id!}
            queryKey={["asset-documents", id!]}
          />
        </TabsContent>
      </Tabs>

      <AssetFormDialog open={editOpen} onOpenChange={setEditOpen} siteId={a.site_id} asset={a} />
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
