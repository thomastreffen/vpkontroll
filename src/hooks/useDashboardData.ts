import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { addDays, startOfDay, endOfDay, startOfWeek, endOfWeek, format } from "date-fns";

export function useDashboardData() {
  const { tenantId } = useAuth();
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const in14Days = addDays(now, 14);

  const cases = useQuery({
    queryKey: ["dash-cases", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("cases")
        .select("id, case_number, title, status, priority, owner_user_id, customer_name, created_at")
        .eq("tenant_id", tenantId!)
        .is("deleted_at", null)
        .in("status", ["new", "triage", "in_progress", "waiting_customer", "waiting_internal"]);
      return data ?? [];
    },
    enabled: !!tenantId,
  });

  const deals = useQuery({
    queryKey: ["dash-deals", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("crm_deals")
        .select("id, title, stage, value, company_id, site_visit_data, site_visit_template_id, expected_close_date, created_at")
        .eq("tenant_id", tenantId!)
        .not("stage", "in", "(won,lost)");
      return data ?? [];
    },
    enabled: !!tenantId,
  });

  const wonDeals = useQuery({
    queryKey: ["dash-won-deals", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("crm_deals")
        .select("id, title, stage, value, company_id")
        .eq("tenant_id", tenantId!)
        .eq("stage", "won");
      return data ?? [];
    },
    enabled: !!tenantId,
  });

  const jobs = useQuery({
    queryKey: ["dash-jobs", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("jobs")
        .select("id, job_number, title, status, job_type, scheduled_start, scheduled_end, form_data, installation_template_id, company_id")
        .eq("tenant_id", tenantId!)
        .is("deleted_at", null)
        .in("status", ["planned", "in_progress", "on_hold"]);
      return data ?? [];
    },
    enabled: !!tenantId,
  });

  const visits = useQuery({
    queryKey: ["dash-visits", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("service_visits")
        .select("id, status, scheduled_date, report_data, agreement_id, job_id")
        .eq("tenant_id", tenantId!)
        .in("status", ["planned", "in_progress"]);
      return data ?? [];
    },
    enabled: !!tenantId,
  });

  const agreements = useQuery({
    queryKey: ["dash-agreements", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("service_agreements")
        .select("id, agreement_number, status, next_visit_due, company_id, end_date")
        .eq("tenant_id", tenantId!)
        .is("deleted_at", null)
        .eq("status", "active");
      return data ?? [];
    },
    enabled: !!tenantId,
  });

  const warranties = useQuery({
    queryKey: ["dash-warranties", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("warranty_cases")
        .select("id, warranty_number, issue_description, status, created_at")
        .eq("tenant_id", tenantId!)
        .is("deleted_at", null)
        .in("status", ["open", "investigating"]);
      return data ?? [];
    },
    enabled: !!tenantId,
  });

  // Derived metrics
  const openCases = cases.data?.length ?? 0;
  const casesWithoutOwner = cases.data?.filter(c => !c.owner_user_id) ?? [];

  const allDeals = deals.data ?? [];
  const dealsByStage = {
    lead: allDeals.filter(d => d.stage === "lead"),
    qualified: allDeals.filter(d => d.stage === "qualified"),
    site_visit: allDeals.filter(d => d.stage === "site_visit"),
    quote_sent: allDeals.filter(d => d.stage === "quote_sent"),
    negotiation: allDeals.filter(d => d.stage === "negotiation"),
  };

  const allJobs = jobs.data ?? [];
  const jobsThisWeek = allJobs.filter(j => {
    if (!j.scheduled_start) return false;
    const d = new Date(j.scheduled_start);
    return d >= weekStart && d <= weekEnd;
  });
  const unplannedJobs = allJobs.filter(j => !j.scheduled_start);

  const allVisits = visits.data ?? [];
  const visitsNext14 = allVisits.filter(v => {
    if (!v.scheduled_date) return false;
    const d = new Date(v.scheduled_date);
    return d <= in14Days;
  });

  const allAgreements = agreements.data ?? [];
  const overdueAgreements = allAgreements.filter(a => {
    if (!a.next_visit_due) return false;
    return new Date(a.next_visit_due) < now;
  });

  const openWarranties = warranties.data ?? [];

  // Action items
  const actionItems: Array<{ type: string; label: string; reason: string; link: string; priority: number }> = [];

  // Cases without owner
  casesWithoutOwner.forEach(c => {
    actionItems.push({ type: "Sak", label: c.case_number + " " + c.title, reason: "Ingen eier tildelt", link: `/tenant/postkontoret`, priority: 2 });
  });

  // Deals missing company
  allDeals.filter(d => !d.company_id).forEach(d => {
    actionItems.push({ type: "Deal", label: d.title, reason: "Mangler kunde", link: `/tenant/crm/deals/${d.id}`, priority: 3 });
  });

  // Deals in site_visit without site_visit_data
  allDeals.filter(d => d.stage === "site_visit" && (!d.site_visit_data || !((d.site_visit_data as any)?.template_id))).forEach(d => {
    actionItems.push({ type: "Deal", label: d.title, reason: "Befaring uten skjema", link: `/tenant/crm/deals/${d.id}`, priority: 2 });
  });

  // Installation jobs without form_data
  allJobs.filter(j => j.job_type === "installation" && (!j.form_data || !((j.form_data as any)?.template_id))).forEach(j => {
    actionItems.push({ type: "Jobb", label: j.job_number + " " + j.title, reason: "Installasjon uten skjema", link: `/tenant/crm/jobs/${j.id}`, priority: 2 });
  });

  // Service visits without report_data
  allVisits.filter(v => !v.report_data || !((v.report_data as any)?.template_id)).forEach(v => {
    actionItems.push({ type: "Besøk", label: `Servicebesøk`, reason: "Mangler skjema", link: v.agreement_id ? `/tenant/crm/agreements/${v.agreement_id}` : `/tenant/crm/jobs/${v.job_id}`, priority: 2 });
  });

  // Overdue agreements
  overdueAgreements.forEach(a => {
    actionItems.push({ type: "Avtale", label: a.agreement_number, reason: "Forfalt besøk", link: `/tenant/crm/agreements/${a.id}`, priority: 1 });
  });

  actionItems.sort((a, b) => a.priority - b.priority);

  // Docs missing
  const jobsMissingForm = allJobs.filter(j => (j.job_type === "installation" || j.job_type === "service") && (!j.form_data || !((j.form_data as any)?.template_id)));
  const visitsMissingReport = allVisits.filter(v => !v.report_data || !((v.report_data as any)?.template_id));

  return {
    loading: cases.isLoading || deals.isLoading || jobs.isLoading || visits.isLoading || agreements.isLoading || warranties.isLoading,
    openCases,
    casesWithoutOwner,
    casesData: cases.data ?? [],
    allDeals,
    dealsByStage,
    wonDeals: wonDeals.data ?? [],
    allJobs,
    jobsThisWeek,
    unplannedJobs,
    allVisits,
    visitsNext14,
    allAgreements,
    overdueAgreements,
    openWarranties,
    actionItems: actionItems.slice(0, 15),
    jobsMissingForm,
    visitsMissingReport,
  };
}
