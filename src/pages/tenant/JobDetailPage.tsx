import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useJobDetail } from "@/hooks/useJobDetail";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ArrowLeft, Info, Users, ClipboardCheck, FileText, Pencil } from "lucide-react";
import {
  JOB_STATUS_LABELS, JOB_STATUS_COLORS, JOB_TYPE_LABELS,
  ENERGY_SOURCE_LABELS, DOCUMENT_CATEGORY_LABELS,
  formatDate, formatDateTime,
} from "@/lib/domain-labels";
import { CASE_PRIORITY_LABELS, CASE_PRIORITY_COLOR } from "@/lib/case-labels";
import { JobEditDialog } from "@/components/crud/JobEditDialog";

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { job, company, contact, site, asset, technicians, checklists, documents } = useJobDetail(id);
  const [editOpen, setEditOpen] = useState(false);

  if (job.isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!job.data) {
    return <div className="text-center py-20 text-muted-foreground">Jobb ikke funnet</div>;
  }

  const j = job.data;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{j.job_number}</h1>
            <Badge className={JOB_STATUS_COLORS[j.status] || ""}>{JOB_STATUS_LABELS[j.status] || j.status}</Badge>
            <Badge variant="outline">{JOB_TYPE_LABELS[j.job_type] || j.job_type}</Badge>
            <span className={`text-sm font-medium ${CASE_PRIORITY_COLOR[j.priority as keyof typeof CASE_PRIORITY_COLOR] || ""}`}>
              {CASE_PRIORITY_LABELS[j.priority as keyof typeof CASE_PRIORITY_LABELS] || j.priority}
            </span>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}><Pencil className="h-3 w-3 mr-1" />Rediger</Button>
          </div>
          <p className="text-lg mt-1">{j.title}</p>
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-2">
            {company.data && <Link to={`/tenant/crm/companies/${company.data.id}`} className="text-primary hover:underline">{company.data.name}</Link>}
            {contact.data && <span>{contact.data.first_name} {contact.data.last_name || ""}</span>}
            {site.data && <span>{site.data.address}, {site.data.city}</span>}
            {asset.data && <Link to={`/tenant/crm/assets/${asset.data.id}`} className="text-primary hover:underline">{asset.data.manufacturer} {asset.data.model || ""}</Link>}
          </div>
        </div>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info" className="gap-1.5"><Info className="h-3.5 w-3.5" />Detaljer</TabsTrigger>
          <TabsTrigger value="technicians" className="gap-1.5"><Users className="h-3.5 w-3.5" />Teknikere ({technicians.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="checklists" className="gap-1.5"><ClipboardCheck className="h-3.5 w-3.5" />Sjekklister ({checklists.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="documents" className="gap-1.5"><FileText className="h-3.5 w-3.5" />Dokumenter ({documents.data?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-4">
          <Card className="p-5">
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
          {!checklists.data?.length ? <Empty text="Ingen sjekklister" /> : (
            <div className="space-y-4">
              {checklists.data.map((cl: any) => (
                <Card key={cl.id} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-medium text-sm">{cl.template_name}</p>
                    {cl.completed_at && <Badge variant="secondary" className="text-[10px]">Fullført {formatDate(cl.completed_at)}</Badge>}
                  </div>
                  <div className="space-y-2">
                    {cl.items?.map((item: any) => (
                      <div key={item.id} className="flex items-start gap-2">
                        <Checkbox checked={item.is_checked} disabled className="mt-0.5" />
                        <div>
                          <p className={`text-sm ${item.is_checked ? "line-through text-muted-foreground" : ""}`}>{item.label}</p>
                          {item.note && <p className="text-xs text-muted-foreground">{item.note}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          {!documents.data?.length ? <Empty text="Ingen dokumenter" /> : (
            <div className="grid gap-3">
              {documents.data.map(d => (
                <Card key={d.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{d.file_name}</p>
                    <p className="text-xs text-muted-foreground">{DOCUMENT_CATEGORY_LABELS[d.category] || d.category} · {formatDate(d.created_at)}</p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <JobEditDialog open={editOpen} onOpenChange={setEditOpen} job={j} />
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
