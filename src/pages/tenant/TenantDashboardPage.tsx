import { useDashboardData } from "@/hooks/useDashboardData";
import DashKpiCards from "@/components/dashboard/DashKpiCards";
import DashMiniKanban from "@/components/dashboard/DashMiniKanban";
import DashActionItems from "@/components/dashboard/DashActionItems";
import DashDriftSection from "@/components/dashboard/DashDriftSection";
import DashDocsStatus from "@/components/dashboard/DashDocsStatus";
import DashPostkontoret from "@/components/dashboard/DashPostkontoret";
import DashWarranty from "@/components/dashboard/DashWarranty";

export default function TenantDashboardPage() {
  const d = useDashboardData();

  if (d.loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Operativ oversikt – klikk for å gå videre</p>
      </div>

      {/* Row 1 – KPI cards */}
      <DashKpiCards
        openCases={d.openCases}
        dealsNeedAction={d.allDeals.length}
        jobsThisWeek={d.jobsThisWeek.length}
        visitsNext14={d.visitsNext14.length}
        overdueAgreements={d.overdueAgreements.length}
        formsMissing={d.jobsMissingForm.length + d.visitsMissingReport.length}
        openWarranties={d.openWarranties.length}
        unplannedJobs={d.unplannedJobs.length}
      />

      {/* Row 2 – Mini kanban */}
      <DashMiniKanban dealsByStage={d.dealsByStage} />

      {/* Row 3 – Action items */}
      <DashActionItems items={d.actionItems} />

      {/* Row 4 – Drift */}
      <DashDriftSection jobsThisWeek={d.jobsThisWeek} visitsNext14={d.visitsNext14} />

      {/* Row 5 – Bottom grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DashPostkontoret cases={d.casesData} casesWithoutOwner={d.casesWithoutOwner} />
        <DashDocsStatus jobsMissingForm={d.jobsMissingForm} visitsMissingReport={d.visitsMissingReport} />
        <DashWarranty warranties={d.openWarranties} />
      </div>
    </div>
  );
}
