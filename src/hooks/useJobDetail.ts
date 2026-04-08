import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useJobDetail(jobId: string | undefined) {
  const { tenantId } = useAuth();

  const job = useQuery({
    queryKey: ["job", jobId],
    queryFn: async () => {
      const { data, error } = await supabase.from("jobs").select("*").eq("id", jobId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!jobId && !!tenantId,
  });

  const company = useQuery({
    queryKey: ["job-company", job.data?.company_id],
    queryFn: async () => {
      const { data } = await supabase.from("crm_companies").select("*").eq("id", job.data!.company_id!).single();
      return data;
    },
    enabled: !!job.data?.company_id,
  });

  const contact = useQuery({
    queryKey: ["job-contact", job.data?.contact_id],
    queryFn: async () => {
      const { data } = await supabase.from("crm_contacts").select("*").eq("id", job.data!.contact_id!).single();
      return data;
    },
    enabled: !!job.data?.contact_id,
  });

  const site = useQuery({
    queryKey: ["job-site", job.data?.site_id],
    queryFn: async () => {
      const { data } = await supabase.from("customer_sites").select("*").eq("id", job.data!.site_id!).single();
      return data;
    },
    enabled: !!job.data?.site_id,
  });

  const asset = useQuery({
    queryKey: ["job-asset", job.data?.asset_id],
    queryFn: async () => {
      const { data } = await supabase.from("hvac_assets").select("*").eq("id", job.data!.asset_id!).single();
      return data;
    },
    enabled: !!job.data?.asset_id,
  });

  const deal = useQuery({
    queryKey: ["job-deal", job.data?.deal_id],
    queryFn: async () => {
      const { data } = await supabase.from("crm_deals").select("*").eq("id", job.data!.deal_id!).single();
      return data;
    },
    enabled: !!job.data?.deal_id,
  });

  const technicians = useQuery({
    queryKey: ["job-technicians", jobId],
    queryFn: async () => {
      const { data: jt } = await supabase.from("job_technicians").select("technician_id").eq("job_id", jobId!);
      if (!jt || jt.length === 0) return [];
      const ids = jt.map(r => r.technician_id);
      const { data } = await supabase.from("technicians").select("*").in("id", ids);
      return data || [];
    },
    enabled: !!jobId && !!tenantId,
  });

  const checklists = useQuery({
    queryKey: ["job-checklists", jobId],
    queryFn: async () => {
      const { data: cls } = await supabase.from("installation_checklists").select("*").eq("job_id", jobId!).order("created_at");
      if (!cls || cls.length === 0) return [];
      const clIds = cls.map(c => c.id);
      const { data: items } = await supabase.from("checklist_items").select("*").in("checklist_id", clIds).order("sort_order");
      return cls.map(cl => ({ ...cl, items: (items || []).filter(i => i.checklist_id === cl.id) }));
    },
    enabled: !!jobId && !!tenantId,
  });

  const documents = useQuery({
    queryKey: ["job-documents", jobId],
    queryFn: async () => {
      const { data } = await supabase.from("documents").select("*").eq("job_id", jobId!).is("deleted_at", null);
      return data || [];
    },
    enabled: !!jobId && !!tenantId,
  });

  return { job, company, contact, site, asset, deal, technicians, checklists, documents };
}
