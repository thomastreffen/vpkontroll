import { useDashboardData } from "@/hooks/useDashboardData";
import DashActionItems from "@/components/dashboard/DashActionItems";
import DashDriftSection from "@/components/dashboard/DashDriftSection";
import DashMiniKanban from "@/components/dashboard/DashMiniKanban";
import TrialBanner from "@/components/dashboard/TrialBanner";
import { AlertTriangle, CalendarDays, ShieldCheck, Loader2 } from "lucide-react";
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

  const overdue = d.overdueAgreements.length;
  const isOverdue = overdue > 0;
  const hasDrift = d.jobsThisWeek.length > 0 || d.visitsNext14.length > 0;
  const hasActions = d.actionItems.length > 0;
  const hasDeals = d.allDeals.length > 0;

  return (
    <div className="space-y-8">
      {/* Topprad: 3 store stat-kort */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Forfalt */}
        <div
          className={cn(
            "rounded-xl border bg-card [box-shadow:var(--shadow-card)] p-5 cursor-pointer transition-opacity hover:opacity-90",
            isOverdue ? "border-red-200 dark:border-red-900/60" : "border-border"
          )}
          onClick={() => navigate("/tenant/crm/agreements")}
        >
          <div className={cn(
            "h-10 w-10 rounded-xl flex items-center justify-center mb-4",
            isOverdue ? "bg-red-50 dark:bg-red-950/50" : "bg-emerald-50 dark:bg-emerald-950/50"
          )}>
            <AlertTriangle className={cn("h-5 w-5", isOverdue ? "text-red-500" : "text-emerald-500")} />
          </div>
          <p className={cn(
            "text-4xl font-bold font-[Lexend] leading-none",
            isOverdue ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
          )}>
            {overdue}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            {isOverdue ? `forfalt servicebesøk` : "Alt à jour"}
          </p>
        </div>

        {/* Denne uken */}
        <div
          className="rounded-xl border border-border bg-card [box-shadow:var(--shadow-card)] p-5 cursor-pointer transition-opacity hover:opacity-90"
          onClick={() => navigate("/tenant/ressursplanlegger")}
        >
          <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center mb-4">
            <CalendarDays className="h-5 w-5 text-blue-500" />
          </div>
          <p className="text-4xl font-bold font-[Lexend] leading-none">{d.jobsThisWeek.length}</p>
          <p className="text-sm text-muted-foreground mt-2">
            jobber denne uken
            {d.visitsNext14.length > 0 && (
              <span className="ml-1 text-muted-foreground/60">· {d.visitsNext14.length} besøk</span>
            )}
          </p>
        </div>

        {/* Aktive avtaler */}
        <div
          className="rounded-xl border border-border bg-card [box-shadow:var(--shadow-card)] p-5 cursor-pointer transition-opacity hover:opacity-90"
          onClick={() => navigate("/tenant/crm/agreements")}
        >
          <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center mb-4">
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
          </div>
          <p className="text-4xl font-bold font-[Lexend] leading-none">{d.allAgreements.length}</p>
          <p className="text-sm text-muted-foreground mt-2">aktive serviceavtaler</p>
        </div>
      </div>

      {/* Trial-banner */}
      <TrialBanner />

      {/* Midtseksjon: to kolonner */}
      {(hasDrift || hasActions) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {hasDrift && (
            <DashDriftSection
              jobsThisWeek={d.jobsThisWeek}
              visitsNext14={d.visitsNext14}
              companyMap={d.companyMap}
            />
          )}
          {hasActions && (
            <DashActionItems items={d.actionItems} />
          )}
        </div>
      )}

      {/* Bunn: pipeline */}
      {hasDeals && (
        <DashMiniKanban
          dealsByStage={d.dealsByStage}
          wonDeals={d.wonDeals}
          companyMap={d.companyMap}
        />
      )}
    </div>
  );
}
