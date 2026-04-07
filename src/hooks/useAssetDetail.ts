import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useAssetDetail(assetId: string | undefined) {
  const { tenantId } = useAuth();

  const asset = useQuery({
    queryKey: ["asset", assetId],
    queryFn: async () => {
      const { data, error } = await supabase.from("hvac_assets").select("*").eq("id", assetId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!assetId && !!tenantId,
  });

  const site = useQuery({
    queryKey: ["asset-site", asset.data?.site_id],
    queryFn: async () => {
      const { data } = await supabase.from("customer_sites").select("*").eq("id", asset.data!.site_id).single();
      return data;
    },
    enabled: !!asset.data?.site_id,
  });

  const company = useQuery({
    queryKey: ["asset-company", site.data?.company_id],
    queryFn: async () => {
      const { data } = await supabase.from("crm_companies").select("*").eq("id", site.data!.company_id).single();
      return data;
    },
    enabled: !!site.data?.company_id,
  });

  const serviceVisits = useQuery({
    queryKey: ["asset-visits", assetId],
    queryFn: async () => {
      const { data } = await supabase.from("service_visits").select("*").eq("asset_id", assetId!).order("scheduled_date", { ascending: false });
      return data || [];
    },
    enabled: !!assetId && !!tenantId,
  });

  const warrantyCases = useQuery({
    queryKey: ["asset-warranty", assetId],
    queryFn: async () => {
      const { data } = await supabase.from("warranty_cases").select("*").eq("asset_id", assetId!).is("deleted_at", null).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!assetId && !!tenantId,
  });

  const jobs = useQuery({
    queryKey: ["asset-jobs", assetId],
    queryFn: async () => {
      const { data } = await supabase.from("jobs").select("*").eq("asset_id", assetId!).is("deleted_at", null).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!assetId && !!tenantId,
  });

  const documents = useQuery({
    queryKey: ["asset-documents", assetId],
    queryFn: async () => {
      const { data } = await supabase.from("documents").select("*").eq("asset_id", assetId!).is("deleted_at", null);
      return data || [];
    },
    enabled: !!assetId && !!tenantId,
  });

  return { asset, site, company, serviceVisits, warrantyCases, jobs, documents };
}
