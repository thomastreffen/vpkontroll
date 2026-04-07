import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useWarrantyDetail(warrantyId: string | undefined) {
  const { tenantId } = useAuth();

  const warranty = useQuery({
    queryKey: ["warranty", warrantyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("warranty_cases").select("*").eq("id", warrantyId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!warrantyId && !!tenantId,
  });

  const company = useQuery({
    queryKey: ["warranty-company", warranty.data?.company_id],
    queryFn: async () => {
      const { data } = await supabase.from("crm_companies").select("*").eq("id", warranty.data!.company_id!).single();
      return data;
    },
    enabled: !!warranty.data?.company_id,
  });

  const asset = useQuery({
    queryKey: ["warranty-asset", warranty.data?.asset_id],
    queryFn: async () => {
      const { data } = await supabase.from("hvac_assets").select("*").eq("id", warranty.data!.asset_id!).single();
      return data;
    },
    enabled: !!warranty.data?.asset_id,
  });

  const linkedCase = useQuery({
    queryKey: ["warranty-case", warranty.data?.case_id],
    queryFn: async () => {
      const { data } = await supabase.from("cases").select("*").eq("id", warranty.data!.case_id!).single();
      return data;
    },
    enabled: !!warranty.data?.case_id,
  });

  const jobs = useQuery({
    queryKey: ["warranty-jobs", warrantyId],
    queryFn: async () => {
      // Jobs related to the same asset with type 'repair' or 'warranty'
      if (!warranty.data?.asset_id) return [];
      const { data } = await supabase.from("jobs").select("*")
        .eq("asset_id", warranty.data.asset_id)
        .in("job_type", ["repair", "warranty"])
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!warranty.data?.asset_id && !!tenantId,
  });

  const documents = useQuery({
    queryKey: ["warranty-documents", warrantyId],
    queryFn: async () => {
      const { data } = await supabase.from("documents").select("*")
        .eq("warranty_case_id", warrantyId!)
        .is("deleted_at", null);
      return data || [];
    },
    enabled: !!warrantyId && !!tenantId,
  });

  return { warranty, company, asset, linkedCase, jobs, documents };
}
