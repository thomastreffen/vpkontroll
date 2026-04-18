import { useNavigate } from "react-router-dom";
import { Wrench, CalendarCheck, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { cn } from "@/lib/utils";

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

const statusDot: Record<string, string> = {
  planned: "bg-blue-400",
  in_progress: "bg-emerald-400",
  on_hold: "bg-amber-400",
};

const statusLabel: Record<string, string> = {
  planned: "Planlagt",
  in_progress: "Pågår",
  on_hold: "På vent",
};

export default function DashDriftSection({ jobsThisWeek, visitsNext14, companyMap }: Props) {
  const navigate = useNavigate();
  const hasJobs = jobsThisWeek.length > 0;
  const hasVisits = visitsNext14.length > 0;

  if (!hasJobs && !hasVisits) return null;

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card [box-shadow:var(--shadow-card)]">
      {hasJobs && (
        <>
          <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Jobber denne uken</span>
              <span className="text-xs text-muted-foreground">{jobsThisWeek.length}</span>
            </div>
            <button
              className="text-xs text-primary hover:underline"
              onClick={() => navigate("/tenant/ressursplanlegger")}
            >
              Planlegger →
            </button>
          </div>
          <div className="divide-y divide-border">
            {jobsThisWeek.slice(0, 5).map(j => {
              const customer = j.company_id ? companyMap[j.company_id] : null;
              return (
                <div
                  key={j.id}
                  className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-muted/40 transition-colors group"
                  onClick={() => navigate(`/tenant/crm/jobs/${j.id}`)}
                >
                  <span className={cn("w-2 h-2 rounded-full shrink-0", statusDot[j.status] ?? "bg-muted-foreground/30")} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{j.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {j.scheduled_start && format(new Date(j.scheduled_start), "EEE d. MMM", { locale: nb })}
                      {customer && <span> · {customer}</span>}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{statusLabel[j.status] ?? j.status}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0 group-hover:text-muted-foreground transition-colors" />
                </div>
              );
            })}
          </div>
        </>
      )}

      {hasVisits && (
        <>
          <div className={cn(
            "px-5 py-3 border-b border-border bg-muted/30 flex items-center justify-between",
            hasJobs && "border-t"
          )}>
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Servicebesøk neste 14 dager</span>
              <span className="text-xs text-muted-foreground">{visitsNext14.length}</span>
            </div>
            <button
              className="text-xs text-primary hover:underline"
              onClick={() => navigate("/tenant/crm/agreements")}
            >
              Alle avtaler →
            </button>
          </div>
          <div className="divide-y divide-border">
            {visitsNext14.slice(0, 5).map(v => {
              const hasReport = v.report_data && (v.report_data as any)?.template_id;
              return (
                <div
                  key={v.id}
                  className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-muted/40 transition-colors group"
                  onClick={() => navigate(v.agreement_id ? `/tenant/crm/agreements/${v.agreement_id}` : `/tenant/crm/jobs/${v.job_id}`)}
                >
                  <span className={cn("w-2 h-2 rounded-full shrink-0", statusDot[v.status] ?? "bg-muted-foreground/30")} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">Servicebesøk</p>
                    {v.scheduled_date && (
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(v.scheduled_date), "EEEE d. MMMM", { locale: nb })}
                      </p>
                    )}
                  </div>
                  {!hasReport && (
                    <span className="text-xs text-amber-500 shrink-0">Mangler rapport</span>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0 group-hover:text-muted-foreground transition-colors" />
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
