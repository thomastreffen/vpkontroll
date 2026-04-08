import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useContactDetail(contactId: string | undefined) {
  const { tenantId } = useAuth();

  const contact = useQuery({
    queryKey: ["contact", contactId],
    queryFn: async () => {
      const { data, error } = await supabase.from("crm_contacts").select("*").eq("id", contactId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!contactId && !!tenantId,
  });

  const company = useQuery({
    queryKey: ["contact-company", contact.data?.company_id],
    queryFn: async () => {
      const { data } = await supabase.from("crm_companies").select("*").eq("id", contact.data!.company_id!).single();
      return data;
    },
    enabled: !!contact.data?.company_id,
  });

  const sites = useQuery({
    queryKey: ["contact-sites", contactId],
    queryFn: async () => {
      const { data } = await supabase.from("customer_sites").select("*").eq("primary_contact_id", contactId!).is("deleted_at", null);
      return data || [];
    },
    enabled: !!contactId && !!tenantId,
  });

  const deals = useQuery({
    queryKey: ["contact-deals", contactId],
    queryFn: async () => {
      const { data } = await supabase.from("crm_deals").select("*").eq("contact_id", contactId!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!contactId && !!tenantId,
  });

  const jobs = useQuery({
    queryKey: ["contact-jobs", contactId],
    queryFn: async () => {
      const { data } = await supabase.from("jobs").select("*").eq("contact_id", contactId!).is("deleted_at", null).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!contactId && !!tenantId,
  });

  const activities = useQuery({
    queryKey: ["contact-activities", contactId],
    queryFn: async () => {
      const { data } = await supabase.from("crm_activities").select("*").eq("contact_id", contactId!).order("created_at", { ascending: false }).limit(20);
      return data || [];
    },
    enabled: !!contactId && !!tenantId,
  });

  return { contact, company, sites, deals, jobs, activities };
}
