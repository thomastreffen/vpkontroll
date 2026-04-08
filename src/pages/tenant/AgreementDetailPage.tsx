import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAgreementDetail } from "@/hooks/useAgreementDetail";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Info, CalendarDays, Wrench } from "lucide-react";
import { ScheduleEventDialog } from "@/components/crud/ScheduleEventDialog";
import {
  AGREEMENT_STATUS_LABELS, AGREEMENT_STATUS_COLORS,
  AGREEMENT_INTERVAL_LABELS,
  VISIT_STATUS_LABELS,
  JOB_STATUS_LABELS, JOB_STATUS_COLORS, JOB_TYPE_LABELS,
  formatDate,
} from "@/lib/domain-labels";
import { formatCurrency } from "@/lib/crm-labels";

export default function AgreementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { agreement, company, visits, jobs } = useAgreementDetail(id);

  if (agreement.isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!agreement.data) {
    return <div className="text-center py-20 text-muted-foreground">Avtale ikke funnet</div>;
  }

  const a = agreement.data;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{a.agreement_number}</h1>
            <Badge className={AGREEMENT_STATUS_COLORS[a.status] || ""}>{AGREEMENT_STATUS_LABELS[a.status] || a.status}</Badge>
          </div>
          <div className="flex gap-3 text-sm text-muted-foreground mt-1">
            {company.data && <Link to={`/tenant/crm/companies/${company.data.id}`} className="text-primary hover:underline">{company.data.name}</Link>}
            <span>{AGREEMENT_INTERVAL_LABELS[a.interval] || a.interval}</span>
            {a.annual_price && <span>{formatCurrency(a.annual_price as number)}/år</span>}
          </div>
        </div>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info" className="gap-1.5"><Info className="h-3.5 w-3.5" />Detaljer</TabsTrigger>
          <TabsTrigger value="visits" className="gap-1.5"><CalendarDays className="h-3.5 w-3.5" />Servicebesøk ({visits.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="jobs" className="gap-1.5"><Wrench className="h-3.5 w-3.5" />Jobber ({jobs.data?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-4">
          <Card className="p-5">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <Field label="Startdato" value={formatDate(a.start_date)} />
              <Field label="Sluttdato" value={formatDate(a.end_date)} />
              <Field label="Intervall" value={AGREEMENT_INTERVAL_LABELS[a.interval] || a.interval} />
              <Field label="Neste forfall" value={formatDate(a.next_visit_due)} />
              <Field label="Årspris" value={a.annual_price ? formatCurrency(a.annual_price as number) : null} />
              <Field label="Opprettet" value={formatDate(a.created_at)} />
            </div>
            {a.scope_description && (
              <div className="mt-4 border-t pt-3">
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-1">Omfang</p>
                <p className="text-sm">{a.scope_description}</p>
              </div>
            )}
            {a.notes && <p className="text-sm text-muted-foreground mt-3">{a.notes}</p>}
          </Card>
        </TabsContent>

        <TabsContent value="visits" className="mt-4">
          {!visits.data?.length ? <Empty text="Ingen servicebesøk generert" /> : (
            <div className="grid gap-3">
              {visits.data.map(v => (
                <Card key={v.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{formatDate(v.scheduled_date)}</p>
                    <p className="text-xs text-muted-foreground">
                      {v.findings && `Funn: ${v.findings.substring(0, 60)}...`}
                      {v.completed_at && ` · Fullført: ${formatDate(v.completed_at)}`}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{VISIT_STATUS_LABELS[v.status] || v.status}</Badge>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="jobs" className="mt-4">
          {!jobs.data?.length ? <Empty text="Ingen tilknyttede jobber" /> : (
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
      </Tabs>
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
