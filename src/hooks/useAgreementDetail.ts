import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useAgreementDetail(agreementId: string | undefined) {
  const { tenantId } = useAuth();

  const agreement = useQuery({
    queryKey: ["agreement", agreementId],
    queryFn: async () => {
      const { data, error } = await supabase.from("service_agreements").select("*").eq("id", agreementId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!agreementId && !!tenantId,
  });

  const company = useQuery({
    queryKey: ["agreement-company", agreement.data?.company_id],
    queryFn: async () => {
      const { data } = await supabase.from("crm_companies").select("*").eq("id", agreement.data!.company_id).single();
      return data;
    },
    enabled: !!agreement.data?.company_id,
  });

  const site = useQuery({
    queryKey: ["agreement-site", agreement.data?.site_id],
    queryFn: async () => {
      if (!agreement.data?.site_id) return null;
      const { data } = await supabase.from("customer_sites").select("*").eq("id", agreement.data.site_id).single();
      return data;
    },
    enabled: !!agreement.data?.site_id,
  });

  const asset = useQuery({
    queryKey: ["agreement-asset", agreement.data?.asset_id],
    queryFn: async () => {
      if (!agreement.data?.asset_id) return null;
      const { data } = await supabase.from("hvac_assets").select("*").eq("id", agreement.data.asset_id).single();
      return data;
    },
    enabled: !!agreement.data?.asset_id,
  });

  const visits = useQuery({
    queryKey: ["agreement-visits", agreementId],
    queryFn: async () => {
      const { data } = await supabase.from("service_visits").select("*").eq("agreement_id", agreementId!).order("scheduled_date", { ascending: false });
      return data || [];
    },
    enabled: !!agreementId && !!tenantId,
  });

  const jobs = useQuery({
    queryKey: ["agreement-jobs", agreementId],
    queryFn: async () => {
      const visitData = visits.data;
      if (!visitData || visitData.length === 0) return [];
      const jobIds = visitData.map(v => v.job_id).filter(Boolean) as string[];
      if (jobIds.length === 0) return [];
      const { data } = await supabase.from("jobs").select("*").in("id", jobIds);
      return data || [];
    },
    enabled: !!visits.data,
  });

  const generationRuns = useQuery({
    queryKey: ["agreement-generation-runs", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("service_generation_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!tenantId,
  });

  const documents = useQuery({
    queryKey: ["agreement-documents", agreementId],
    queryFn: async () => {
      const { data } = await supabase.from("documents").select("*")
        .eq("agreement_id" as any, agreementId! as any)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      return (data as any[]) || [];
    },
    enabled: !!agreementId && !!tenantId,
  });

  return { agreement, company, site, asset, visits, jobs, generationRuns, documents };
}
