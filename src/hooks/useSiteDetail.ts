import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useSiteDetail(siteId: string | undefined) {
  const { tenantId } = useAuth();

  const site = useQuery({
    queryKey: ["site", siteId],
    queryFn: async () => {
      const { data, error } = await supabase.from("customer_sites").select("*").eq("id", siteId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!siteId && !!tenantId,
  });

  const company = useQuery({
    queryKey: ["site-company", site.data?.company_id],
    queryFn: async () => {
      const { data } = await supabase.from("crm_companies").select("*").eq("id", site.data!.company_id).single();
      return data;
    },
    enabled: !!site.data?.company_id,
  });

  const primaryContact = useQuery({
    queryKey: ["site-primary-contact", site.data?.primary_contact_id],
    queryFn: async () => {
      const { data } = await supabase.from("crm_contacts").select("*").eq("id", site.data!.primary_contact_id!).single();
      return data;
    },
    enabled: !!site.data?.primary_contact_id,
  });

  const assets = useQuery({
    queryKey: ["site-assets", siteId],
    queryFn: async () => {
      const { data } = await supabase.from("hvac_assets").select("*").eq("site_id", siteId!).is("deleted_at", null);
      return data || [];
    },
    enabled: !!siteId && !!tenantId,
  });

  const jobs = useQuery({
    queryKey: ["site-jobs", siteId],
    queryFn: async () => {
      const { data } = await supabase.from("jobs").select("*").eq("site_id", siteId!).is("deleted_at", null).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!siteId && !!tenantId,
  });

  const agreements = useQuery({
    queryKey: ["site-agreements", siteId],
    queryFn: async () => {
      const { data } = await supabase.from("service_agreements").select("*").eq("site_id", siteId!).is("deleted_at", null).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!siteId && !!tenantId,
  });

  const warrantyCases = useQuery({
    queryKey: ["site-warranty", siteId],
    queryFn: async () => {
      // Get warranty cases via assets on this site
      const assetIds = assets.data?.map(a => a.id) || [];
      if (assetIds.length === 0) return [];
      const { data } = await supabase.from("warranty_cases").select("*").in("asset_id", assetIds).is("deleted_at", null).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!siteId && !!tenantId && !!assets.data,
  });

  return { site, company, primaryContact, assets, jobs, agreements, warrantyCases };
}
