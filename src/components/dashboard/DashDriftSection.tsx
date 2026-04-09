import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wrench, CalendarCheck, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

interface Job {
  id: string;
  job_number: string;
  title: string;
  status: string;
  job_type: string;
  scheduled_start: string | null;
  form_data: any;
  company_id: string | null;
}

interface Visit {
  id: string;
  status: string;
  scheduled_date: string | null;
  agreement_id: string | null;
  job_id: string | null;
  report_data: any;
}

interface Props {
  jobsThisWeek: Job[];
  visitsNext14: Visit[];
  companyMap: Record<string, string>;
}

const statusColor: Record<string, string> = {
  planned: "bg-[hsl(var(--crm-lead))]/10 text-[hsl(var(--crm-lead))]",
  in_progress: "bg-[hsl(var(--crm-visit))]/10 text-[hsl(var(--crm-visit))]",
  on_hold: "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]",
};

const statusLabel: Record<string, string> = {
  planned: "Planlagt",
  in_progress: "Pågår",
  on_hold: "På vent",
};

const jobTypeLabel: Record<string, string> = {
  installation: "Installasjon",
  service: "Service",
  maintenance: "Vedlikehold",
  inspection: "Inspeksjon",
  repair: "Reparasjon",
};

export default function DashDriftSection({ jobsThisWeek, visitsNext14, companyMap }: Props) {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="w-4 h-4" /> Jobber denne uken
            </CardTitle>
            <div className="flex items-center gap-2">
              <button className="text-xs text-primary hover:underline" onClick={() => navigate("/tenant/ressursplanlegger")}>
                Planlegger →
              </button>
              <button className="text-xs text-primary hover:underline" onClick={() => navigate("/tenant/crm/jobs")}>
                Alle →
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-3">
          {!jobsThisWeek.length ? (
            <div className="flex flex-col items-center py-6 text-center">
              <Wrench className="w-8 h-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">Ingen jobber planlagt denne uken</p>
              <button className="text-xs text-primary hover:underline mt-1" onClick={() => navigate("/tenant/ressursplanlegger")}>
                Åpne planlegger →
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              {jobsThisWeek.slice(0, 6).map((j) => {
                const hasForm = j.form_data && (j.form_data as any)?.template_id;
                const customer = j.company_id ? companyMap[j.company_id] : null;
                return (
                  <div
                    key={j.id}
                    className="flex items-center gap-3 py-2 cursor-pointer hover:bg-muted/50 rounded-md px-2 -mx-2 transition-colors"
                    onClick={() => navigate(`/tenant/crm/jobs/${j.id}`)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground">{j.job_number}</span>
                        <p className="text-sm font-medium truncate">{j.title}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {j.scheduled_start && (
                          <span className="text-[10px] text-muted-foreground">{format(new Date(j.scheduled_start), "EEE d. MMM", { locale: nb })}</span>
                        )}
                        {customer && <span className="text-[10px] text-muted-foreground">· {customer}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {(j.job_type === "installation" || j.job_type === "service") && (
                        <Badge variant="outline" className={`text-[9px] ${hasForm ? "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]" : "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]"}`}>
                          {hasForm ? "Skjema ✓" : "Skjema ✗"}
                        </Badge>
                      )}
                      <Badge variant="outline" className={`${statusColor[j.status] ?? ""} text-[10px]`}>
                        {statusLabel[j.status] ?? j.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarCheck className="w-4 h-4" /> Servicebesøk neste 14 dager
            </CardTitle>
            <button className="text-xs text-primary hover:underline" onClick={() => navigate("/tenant/crm/agreements")}>
              Alle avtaler →
            </button>
          </div>
        </CardHeader>
        <CardContent className="pb-3">
          {!visitsNext14.length ? (
            <div className="flex flex-col items-center py-6 text-center">
              <CalendarCheck className="w-8 h-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">Ingen kommende servicebesøk</p>
            </div>
          ) : (
            <div className="space-y-1">
              {visitsNext14.slice(0, 6).map((v) => {
                const hasReport = v.report_data && (v.report_data as any)?.template_id;
                return (
                  <div
                    key={v.id}
                    className="flex items-center gap-3 py-2 cursor-pointer hover:bg-muted/50 rounded-md px-2 -mx-2 transition-colors"
                    onClick={() => navigate(v.agreement_id ? `/tenant/crm/agreements/${v.agreement_id}` : `/tenant/crm/jobs/${v.job_id}`)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">Servicebesøk</p>
                      {v.scheduled_date && (
                        <p className="text-[10px] text-muted-foreground">{format(new Date(v.scheduled_date), "EEEE d. MMMM", { locale: nb })}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant="outline" className={`text-[9px] ${hasReport ? "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]" : "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]"}`}>
                        {hasReport ? "Rapport ✓" : "Rapport ✗"}
                      </Badge>
                      <Badge variant="outline" className={`${statusColor[v.status] ?? ""} text-[10px]`}>
                        {statusLabel[v.status] ?? v.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
