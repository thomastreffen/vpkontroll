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
  { key: "openCases", label: "Åpne saker", sub: "i Postkontoret", icon: Mail, color: "text-[hsl(var(--crm-lead))]", bg: "bg-[hsl(var(--crm-lead))]/10", link: "/tenant/postkontoret", urgentAt: 5 },
  { key: "dealsNeedAction", label: "Aktive deals", sub: "i pipeline", icon: TrendingUp, color: "text-[hsl(var(--crm-qualified))]", bg: "bg-[hsl(var(--crm-qualified))]/10", link: "/tenant/crm/deals", urgentAt: 0 },
  { key: "jobsThisWeek", label: "Jobber", sub: "denne uken", icon: Wrench, color: "text-[hsl(var(--crm-visit))]", bg: "bg-[hsl(var(--crm-visit))]/10", link: "/tenant/crm/jobs", urgentAt: 0 },
  { key: "visitsNext14", label: "Servicebesøk", sub: "neste 14 dager", icon: CalendarCheck, color: "text-[hsl(var(--crm-quote))]", bg: "bg-[hsl(var(--crm-quote))]/10", link: "/tenant/crm/agreements", urgentAt: 0 },
  { key: "overdueAgreements", label: "Forfalt", sub: "krever oppfølging", icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10", link: "/tenant/crm/agreements", urgentAt: 1 },
  { key: "formsMissing", label: "Skjema mangler", sub: "ufullstendig", icon: FileWarning, color: "text-[hsl(var(--warning))]", bg: "bg-[hsl(var(--warning))]/10", link: "/tenant/crm/jobs", urgentAt: 1 },
  { key: "openWarranties", label: "Garantisaker", sub: "åpne", icon: Shield, color: "text-[hsl(var(--crm-negotiation))]", bg: "bg-[hsl(var(--crm-negotiation))]/10", link: "/tenant/crm/warranties", urgentAt: 1 },
  { key: "unplannedJobs", label: "Ikke planlagt", sub: "mangler dato", icon: CalendarX, color: "text-muted-foreground", bg: "bg-muted", link: "/tenant/crm/jobs", urgentAt: 1 },
] as const;

export default function DashKpiCards(props: Props) {
  const navigate = useNavigate();
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      {kpiConfig.map((cfg) => {
        const value = props[cfg.key as keyof Props];
        const isUrgent = cfg.urgentAt > 0 && value >= cfg.urgentAt;
        return (
          <Card
            key={cfg.key}
            className={`cursor-pointer transition-all group
              ${isUrgent
                ? "border-destructive/40 shadow-[0_0_0_1px_hsl(var(--destructive)/0.15)] hover:shadow-md hover:border-destructive/60"
                : "border-border/50 hover:border-primary/30 hover:shadow-md"
              }`}
            onClick={() => navigate(cfg.link)}
          >
            <CardContent className="p-3 flex flex-col items-center text-center gap-1">
              <div className={`p-2 rounded-lg ${cfg.bg} ${cfg.color} group-hover:scale-110 transition-transform`}>
                <cfg.icon className="w-4 h-4" />
              </div>
              <span className={`text-2xl font-bold leading-none ${isUrgent ? "text-destructive" : ""}`}>{value}</span>
              <span className="text-[10px] font-medium text-foreground/80 leading-tight">{cfg.label}</span>
              <span className={`text-[9px] leading-tight ${isUrgent ? "text-destructive/70 font-medium" : "text-muted-foreground"}`}>{isUrgent ? "⚠ " + cfg.sub : cfg.sub}</span>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
