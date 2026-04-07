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

  return { agreement, company, visits, jobs };
}
