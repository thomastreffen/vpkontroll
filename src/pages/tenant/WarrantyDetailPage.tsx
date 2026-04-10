import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useCanDo } from "@/hooks/useCanDo";
import { useWarrantyDetail } from "@/hooks/useWarrantyDetail";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Info, Wrench, FileText, Pencil, Plus } from "lucide-react";
import {
  WARRANTY_STATUS_LABELS, WARRANTY_STATUS_COLORS,
  ENERGY_SOURCE_LABELS,
  JOB_STATUS_LABELS, JOB_STATUS_COLORS, JOB_TYPE_LABELS,
  DOCUMENT_CATEGORY_LABELS,
  formatDate,
} from "@/lib/domain-labels";
import { WarrantyFormDialog } from "@/components/crud/WarrantyFormDialog";
import { CreateJobFromWarrantyDialog } from "@/components/crud/CreateJobFromWarrantyDialog";
import { DocumentUploadSection } from "@/components/crud/DocumentUploadSection";

export default function WarrantyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { warranty, company, asset, linkedCase, jobs, documents } = useWarrantyDetail(id);
  const { canDo } = useCanDo();
  const [editOpen, setEditOpen] = useState(false);
  const [createJobOpen, setCreateJobOpen] = useState(false);

  if (warranty.isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!warranty.data) {
    return <div className="text-center py-20 text-muted-foreground">Garantisak ikke funnet</div>;
  }

  const w = warranty.data;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{w.warranty_number}</h1>
            <Badge className={WARRANTY_STATUS_COLORS[w.status] || ""}>{WARRANTY_STATUS_LABELS[w.status] || w.status}</Badge>
            {canDo("warranty.edit") && <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}><Pencil className="h-3 w-3 mr-1" />Rediger</Button>}
            {canDo("jobs.create") && <Button variant="outline" size="sm" onClick={() => setCreateJobOpen(true)}><Plus className="h-3 w-3 mr-1" />Opprett jobb</Button>}
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-2">
            {company.data && <Link to={`/tenant/crm/companies/${company.data.id}`} className="text-primary hover:underline">{company.data.name}</Link>}
            {asset.data && <Link to={`/tenant/crm/assets/${asset.data.id}`} className="text-primary hover:underline">{asset.data.manufacturer} {asset.data.model || ""}</Link>}
            {linkedCase.data && <span>Sak: {linkedCase.data.case_number}</span>}
            {w.manufacturer_ref && <span>Prod.ref: {w.manufacturer_ref}</span>}
          </div>
        </div>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info" className="gap-1.5"><Info className="h-3.5 w-3.5" />Detaljer</TabsTrigger>
          <TabsTrigger value="jobs" className="gap-1.5"><Wrench className="h-3.5 w-3.5" />Jobber ({jobs.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="documents" className="gap-1.5"><FileText className="h-3.5 w-3.5" />Dokumenter ({documents.data?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-4">
          <Card className="p-5">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <Field label="Status" value={WARRANTY_STATUS_LABELS[w.status] || w.status} />
              <Field label="Opprettet" value={formatDate(w.created_at)} />
              <Field label="Løst" value={formatDate(w.resolved_at)} />
              <Field label="Produsentens ref." value={w.manufacturer_ref} />
            </div>
            {w.issue_description && (
              <div className="mt-4 border-t pt-3">
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-1">Feilbeskrivelse</p>
                <p className="text-sm">{w.issue_description}</p>
              </div>
            )}
            {w.resolution && (
              <div className="mt-3">
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-1">Løsning</p>
                <p className="text-sm">{w.resolution}</p>
              </div>
            )}
          </Card>

          {/* Asset info card */}
          {asset.data && (
            <Card className="p-4 mt-4">
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-2">Anlegg</p>
              <Link to={`/tenant/crm/assets/${asset.data.id}`} className="text-sm text-primary hover:underline">
                {asset.data.manufacturer} {asset.data.model || ""} · {ENERGY_SOURCE_LABELS[asset.data.energy_source] || ""}
                {asset.data.serial_number && ` · SN: ${asset.data.serial_number}`}
              </Link>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="jobs" className="mt-4">
          {!jobs.data?.length ? (
            <div className="text-center py-10">
              <p className="text-sm text-muted-foreground mb-3">Ingen relaterte jobber</p>
              {canDo("jobs.create") && <Button size="sm" onClick={() => setCreateJobOpen(true)}><Plus className="h-3.5 w-3.5 mr-1" />Opprett reparasjonsjobb</Button>}
            </div>
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

        <TabsContent value="documents" className="mt-4">
          <DocumentUploadSection
            documents={documents.data}
            entityType="warranty"
            entityId={id!}
            queryKey={["warranty-documents", id!]}
          />
        </TabsContent>
      </Tabs>

      <WarrantyFormDialog open={editOpen} onOpenChange={setEditOpen} warranty={w} companyId={w.company_id || undefined} assetId={w.asset_id || undefined} />
      <CreateJobFromWarrantyDialog open={createJobOpen} onOpenChange={setCreateJobOpen} warranty={w} />
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
