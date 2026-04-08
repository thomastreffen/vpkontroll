import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useJobDetail } from "@/hooks/useJobDetail";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Info, Users, ClipboardCheck, FileText, Pencil, CalendarDays, ExternalLink } from "lucide-react";
import {
  JOB_STATUS_LABELS, JOB_STATUS_COLORS, JOB_TYPE_LABELS,
  DOCUMENT_CATEGORY_LABELS,
  formatDate, formatDateTime,
} from "@/lib/domain-labels";
import { CASE_PRIORITY_LABELS, CASE_PRIORITY_COLOR } from "@/lib/case-labels";
import { JobEditDialog } from "@/components/crud/JobEditDialog";
import { DocumentUploadSection } from "@/components/crud/DocumentUploadSection";
import { ChecklistSection } from "@/components/crud/ChecklistSection";
import { ScheduleEventDialog } from "@/components/crud/ScheduleEventDialog";

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { job, company, contact, site, asset, deal, technicians, checklists, documents } = useJobDetail(id);
  const { tenantId } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [linkedEvent, setLinkedEvent] = useState<any>(null);

  // Check if job already has a linked event
  useEffect(() => {
    if (!id || !tenantId) return;
    supabase.from("events").select("id, start_time, end_time, status").eq("job_id", id).is("deleted_at", null).limit(1)
      .then(({ data }) => { if (data && data.length > 0) setLinkedEvent(data[0]); });
  }, [id, tenantId, scheduleOpen]);

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
            {linkedEvent ? (
              <Link to="/tenant/ressursplanlegger">
                <Button variant="outline" size="sm" className="gap-1"><CalendarDays className="h-3 w-3" />Se i kalender<ExternalLink className="h-3 w-3" /></Button>
              </Link>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setScheduleOpen(true)} className="gap-1"><CalendarDays className="h-3 w-3" />Planlegg</Button>
            )}
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
          <ChecklistSection checklists={checklists.data} jobId={id!} jobType={j.job_type} />
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <DocumentUploadSection
            documents={documents.data}
            entityType="job"
            entityId={id!}
            queryKey={["job-documents", id!]}
          />
        </TabsContent>
      </Tabs>

      <JobEditDialog open={editOpen} onOpenChange={setEditOpen} job={j} />
      <ScheduleEventDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        jobId={j.id}
        jobTitle={`${j.job_number} – ${j.title}`}
        companyName={company.data?.name}
        siteAddress={site.data ? `${site.data.address || ""}, ${site.data.city || ""}` : undefined}
        siteId={j.site_id || undefined}
        scheduledStart={j.scheduled_start}
        scheduledEnd={j.scheduled_end}
      />
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
