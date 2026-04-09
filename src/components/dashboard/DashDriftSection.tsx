import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wrench, CalendarCheck } from "lucide-react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

interface Job {
  id: string;
  job_number: string;
  title: string;
  status: string;
  scheduled_start: string | null;
}

interface Visit {
  id: string;
  status: string;
  scheduled_date: string | null;
  agreement_id: string | null;
  job_id: string | null;
}

interface Props {
  jobsThisWeek: Job[];
  visitsNext14: Visit[];
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

export default function DashDriftSection({ jobsThisWeek, visitsNext14 }: Props) {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Jobs this week */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="w-4 h-4" /> Jobber denne uken
            </CardTitle>
            <button className="text-xs text-primary hover:underline" onClick={() => navigate("/tenant/crm/jobs")}>
              Alle jobber →
            </button>
          </div>
        </CardHeader>
        <CardContent className="pb-3">
          {!jobsThisWeek.length ? (
            <p className="text-sm text-muted-foreground text-center py-4">Ingen planlagte jobber denne uken</p>
          ) : (
            <div className="divide-y divide-border">
              {jobsThisWeek.slice(0, 6).map((j) => (
                <div
                  key={j.id}
                  className="flex items-center gap-3 py-2 cursor-pointer hover:bg-muted/50 rounded-md px-2 -mx-2 transition-colors"
                  onClick={() => navigate(`/tenant/crm/jobs/${j.id}`)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{j.job_number} – {j.title}</p>
                    {j.scheduled_start && (
                      <p className="text-xs text-muted-foreground">{format(new Date(j.scheduled_start), "EEEE d. MMM", { locale: nb })}</p>
                    )}
                  </div>
                  <Badge variant="outline" className={`${statusColor[j.status] ?? ""} text-[10px]`}>
                    {statusLabel[j.status] ?? j.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Service visits next 14 days */}
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
            <p className="text-sm text-muted-foreground text-center py-4">Ingen kommende servicebesøk</p>
          ) : (
            <div className="divide-y divide-border">
              {visitsNext14.slice(0, 6).map((v) => (
                <div
                  key={v.id}
                  className="flex items-center gap-3 py-2 cursor-pointer hover:bg-muted/50 rounded-md px-2 -mx-2 transition-colors"
                  onClick={() => navigate(v.agreement_id ? `/tenant/crm/agreements/${v.agreement_id}` : `/tenant/crm/jobs/${v.job_id}`)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">Servicebesøk</p>
                    {v.scheduled_date && (
                      <p className="text-xs text-muted-foreground">{format(new Date(v.scheduled_date), "d. MMM yyyy", { locale: nb })}</p>
                    )}
                  </div>
                  <Badge variant="outline" className={`${statusColor[v.status] ?? ""} text-[10px]`}>
                    {statusLabel[v.status] ?? v.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
