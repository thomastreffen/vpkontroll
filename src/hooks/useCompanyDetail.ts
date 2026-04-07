import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useCompanyDetail(companyId: string | undefined) {
  const { tenantId } = useAuth();

  const company = useQuery({
    queryKey: ["company", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("crm_companies").select("*").eq("id", companyId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!companyId && !!tenantId,
  });

  const contacts = useQuery({
    queryKey: ["company-contacts", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("crm_contacts").select("*").eq("company_id", companyId!).is("deleted_at", null).order("first_name");
      return data || [];
    },
    enabled: !!companyId && !!tenantId,
  });

  const sites = useQuery({
    queryKey: ["company-sites", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("customer_sites").select("*").eq("company_id", companyId!).is("deleted_at", null).order("name");
      return data || [];
    },
    enabled: !!companyId && !!tenantId,
  });

  const assets = useQuery({
    queryKey: ["company-assets", companyId],
    queryFn: async () => {
      if (!tenantId) return [];
      const siteIds = sites.data?.map(s => s.id) || [];
      if (siteIds.length === 0) return [];
      const { data } = await supabase.from("hvac_assets").select("*").in("site_id", siteIds).is("deleted_at", null);
      return data || [];
    },
    enabled: !!companyId && !!tenantId && !!sites.data,
  });

  const deals = useQuery({
    queryKey: ["company-deals", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("crm_deals").select("*").eq("company_id", companyId!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!companyId && !!tenantId,
  });

  const jobs = useQuery({
    queryKey: ["company-jobs", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("jobs").select("*").eq("company_id", companyId!).is("deleted_at", null).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!companyId && !!tenantId,
  });

  const agreements = useQuery({
    queryKey: ["company-agreements", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("service_agreements").select("*").eq("company_id", companyId!).is("deleted_at", null).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!companyId && !!tenantId,
  });

  const warrantyCases = useQuery({
    queryKey: ["company-warranty", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("warranty_cases").select("*").eq("company_id", companyId!).is("deleted_at", null).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!companyId && !!tenantId,
  });

  const documents = useQuery({
    queryKey: ["company-documents", companyId],
    queryFn: async () => {
      if (!tenantId || !jobs.data) return [];
      const jobIds = jobs.data.map(j => j.id);
      if (jobIds.length === 0) return [];
      const { data } = await supabase.from("documents").select("*").in("job_id", jobIds).is("deleted_at", null);
      return data || [];
    },
    enabled: !!companyId && !!tenantId && !!jobs.data,
  });

  return { company, contacts, sites, assets, deals, jobs, agreements, warrantyCases, documents };
}
