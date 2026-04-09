import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, TrendingUp, Wrench, CalendarCheck, FileWarning, AlertTriangle, Shield, CalendarX } from "lucide-react";

interface Props {
  openCases: number;
  dealsNeedAction: number;
  jobsThisWeek: number;
  visitsNext14: number;
  overdueAgreements: number;
  formsMissing: number;
  openWarranties: number;
  unplannedJobs: number;
}

const kpiConfig = [
  { key: "openCases", label: "Åpne saker", icon: Mail, color: "text-[hsl(var(--crm-lead))]", bg: "bg-[hsl(var(--crm-lead))]/10", link: "/tenant/postkontoret" },
  { key: "dealsNeedAction", label: "Deals å følge opp", icon: TrendingUp, color: "text-[hsl(var(--crm-qualified))]", bg: "bg-[hsl(var(--crm-qualified))]/10", link: "/tenant/crm/deals" },
  { key: "jobsThisWeek", label: "Jobber denne uken", icon: Wrench, color: "text-[hsl(var(--crm-visit))]", bg: "bg-[hsl(var(--crm-visit))]/10", link: "/tenant/crm/jobs" },
  { key: "visitsNext14", label: "Besøk neste 14 dager", icon: CalendarCheck, color: "text-[hsl(var(--crm-quote))]", bg: "bg-[hsl(var(--crm-quote))]/10", link: "/tenant/crm/agreements" },
  { key: "overdueAgreements", label: "Forfalt avtale", icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10", link: "/tenant/crm/agreements" },
  { key: "formsMissing", label: "Skjema mangler", icon: FileWarning, color: "text-[hsl(var(--warning))]", bg: "bg-[hsl(var(--warning))]/10", link: "/tenant/crm/jobs" },
  { key: "openWarranties", label: "Åpne garantisaker", icon: Shield, color: "text-[hsl(var(--crm-negotiation))]", bg: "bg-[hsl(var(--crm-negotiation))]/10", link: "/tenant/crm/warranties" },
  { key: "unplannedJobs", label: "Ikke-planlagte jobber", icon: CalendarX, color: "text-muted-foreground", bg: "bg-muted", link: "/tenant/crm/jobs" },
] as const;

export default function DashKpiCards(props: Props) {
  const navigate = useNavigate();
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      {kpiConfig.map((cfg) => {
        const value = props[cfg.key as keyof Props];
        return (
          <Card
            key={cfg.key}
            className="border-border/50 cursor-pointer hover:border-primary/30 hover:shadow-md transition-all group"
            onClick={() => navigate(cfg.link)}
          >
            <CardContent className="p-3 flex flex-col items-center text-center gap-1">
              <div className={`p-2 rounded-lg ${cfg.bg} ${cfg.color} group-hover:scale-110 transition-transform`}>
                <cfg.icon className="w-4 h-4" />
              </div>
              <span className="text-2xl font-bold leading-none">{value}</span>
              <span className="text-[10px] text-muted-foreground leading-tight">{cfg.label}</span>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
