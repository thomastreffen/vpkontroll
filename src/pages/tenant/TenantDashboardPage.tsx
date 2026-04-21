import { useDashboardData } from "@/hooks/useDashboardData";
import DashActionItems from "@/components/dashboard/DashActionItems";
import DashDriftSection from "@/components/dashboard/DashDriftSection";
import DashMiniKanban from "@/components/dashboard/DashMiniKanban";
import TrialBanner from "@/components/dashboard/TrialBanner";
import OnboardingChecklist from "@/components/dashboard/OnboardingChecklist";
import { formatCurrency } from "@/lib/crm-labels";
import { CheckCircle2, CalendarX, ArrowUpRight, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export default function TenantDashboardPage() {
  const d = useDashboardData();
  const navigate = useNavigate();

  if (d.loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const urgentCount = d.overdueAgreements.length + d.casesWithoutOwner.length;
  const isUrgent = urgentCount > 0;
  const pipelineValue = d.allDeals.reduce((s, deal) => s + ((deal as any).value ?? 0), 0);
  const hasDeals = d.allDeals.length > 0 || d.wonDeals.length > 0;
  const hasDrift = d.jobsThisWeek.length > 0 || d.visitsNext14.length > 0;

  return (
    <div className="space-y-6">
      <OnboardingChecklist />
      <TrialBanner />

      {/* 3 KPI-kort — Hvordan går det? */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* 1: Hva haster? */}
        <button
          className={cn(
            "text-left rounded-xl border bg-card p-6 transition-all hover:shadow-sm group",
            isUrgent
              ? "border-red-200 dark:border-red-900/40 hover:border-red-300 dark:hover:border-red-800"
              : "border-border hover:border-primary/20"
          )}
          onClick={() => navigate("/tenant/crm/agreements")}
        >
          <div className="flex items-center justify-between mb-5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
              Haster
            </span>
            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/70 transition-colors" />
          </div>
          <p className={cn(
            "text-[52px] font-bold font-[Lexend] leading-none tabular-nums",
            isUrgent ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
          )}>
            {urgentCount}
          </p>
          <p className="text-sm text-muted-foreground mt-3 leading-snug">
            {isUrgent
              ? [
                  d.overdueAgreements.length > 0 && `${d.overdueAgreements.length} forfalt`,
                  d.casesWithoutOwner.length > 0 && `${d.casesWithoutOwner.length} sak uten eier`,
                ].filter(Boolean).join(" · ")
              : "Ingenting haster nå"
            }
          </p>
        </button>

        {/* 2: Hva skjer denne uken? */}
        <button
          className="text-left rounded-xl border border-border bg-card p-6 transition-all hover:shadow-sm hover:border-primary/20 group"
          onClick={() => navigate("/tenant/ressursplanlegger")}
        >
          <div className="flex items-center justify-between mb-5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
              Denne uken
            </span>
            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/70 transition-colors" />
          </div>
          <p className="text-[52px] font-bold font-[Lexend] leading-none tabular-nums">
            {d.jobsThisWeek.length}
          </p>
          <p className="text-sm text-muted-foreground mt-3 leading-snug">
            {d.jobsThisWeek.length === 1 ? "jobb planlagt" : "jobber planlagt"}
            {d.visitsNext14.length > 0 && (
              <span className="text-muted-foreground/60"> · {d.visitsNext14.length} besøk (14d)</span>
            )}
          </p>
        </button>

        {/* 3: Nøkkeltall */}
        <button
          className="text-left rounded-xl border border-border bg-card p-6 transition-all hover:shadow-sm hover:border-primary/20 group"
          onClick={() => navigate("/tenant/crm/agreements")}
        >
          <div className="flex items-center justify-between mb-5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
              Serviceavtaler
            </span>
            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/70 transition-colors" />
          </div>
          <p className="text-[52px] font-bold font-[Lexend] leading-none tabular-nums">
            {d.allAgreements.length}
          </p>
          <p className="text-sm text-muted-foreground mt-3 leading-snug">
            aktive avtaler
            {pipelineValue > 0 && (
              <span className="text-muted-foreground/60"> · {formatCurrency(pipelineValue)} pipeline</span>
            )}
          </p>
        </button>
      </div>

      {/* To-kolonne midtseksjon — alltid synlig */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* Venstre: Hva haster? */}
        <div className="flex flex-col gap-3">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest px-0.5">
            Hva haster?
          </p>
          {d.actionItems.length > 0 ? (
            <DashActionItems items={d.actionItems} />
          ) : (
            <div className="rounded-xl border border-border bg-card flex flex-col items-center justify-center py-14 gap-2.5">
              <div className="h-9 w-9 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <p className="text-sm font-medium">Alt er under kontroll</p>
              <p className="text-xs text-muted-foreground">Ingen forfalt, ingen saker uten eier</p>
            </div>
          )}
        </div>

        {/* Høyre: Hva skjer denne uken? */}
        <div className="flex flex-col gap-3">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest px-0.5">
            Hva skjer denne uken?
          </p>
          {hasDrift ? (
            <DashDriftSection
              jobsThisWeek={d.jobsThisWeek}
              visitsNext14={d.visitsNext14}
              companyMap={d.companyMap}
            />
          ) : (
            <div className="rounded-xl border border-border bg-card flex flex-col items-center justify-center py-14 gap-2.5">
              <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                <CalendarX className="h-5 w-5 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Ingen planlagte jobber</p>
              <button
                className="text-xs text-primary hover:underline"
                onClick={() => navigate("/tenant/ressursplanlegger")}
              >
                Åpne planlegger →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Salgspipeline */}
      {hasDeals && (
        <div className="flex flex-col gap-3">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest px-0.5">
            Hvordan går salget?
          </p>
          <DashMiniKanban
            dealsByStage={d.dealsByStage}
            wonDeals={d.wonDeals}
            companyMap={d.companyMap}
          />
        </div>
      )}
    </div>
  );
}
