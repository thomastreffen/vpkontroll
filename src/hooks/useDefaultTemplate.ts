import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useDefaultTemplate(useContext: string | undefined) {
  const { tenantId } = useAuth();
  return useQuery({
    queryKey: ["default-template", tenantId, useContext],
    queryFn: async () => {
      const { data } = await supabase
        .from("service_templates" as any)
        .select("id, name, template_key, category, use_context")
        .eq("tenant_id", tenantId!)
        .eq("is_active", true)
        .eq("is_default", true)
        .eq("use_context", useContext!)
        .limit(1);
      return (data as any[])?.[0] || null;
    },
    enabled: !!tenantId && !!useContext,
  });
}

export function useActiveTemplates(category?: string, useContext?: string) {
  const { tenantId } = useAuth();
  return useQuery({
    queryKey: ["active-templates", tenantId, category, useContext],
    queryFn: async () => {
      let q = supabase
        .from("service_templates" as any)
        .select("id, name, template_key, category, use_context, is_default, is_active")
        .eq("tenant_id", tenantId!)
        .eq("is_active", true)
        .order("name");
      if (category) q = q.eq("category", category);
      if (useContext) q = q.eq("use_context", useContext);
      const { data } = await q;
      return (data as any[]) || [];
    },
    enabled: !!tenantId,
  });
}

export async function setAsDefault(templateId: string, useContext: string, tenantId: string) {
  // Clear existing defaults for this context+tenant
  await supabase
    .from("service_templates" as any)
    .update({ is_default: false })
    .eq("tenant_id", tenantId)
    .eq("use_context", useContext)
    .eq("is_default", true);
  // Set new default
  await supabase
    .from("service_templates" as any)
    .update({ is_default: true })
    .eq("id", templateId);
}

export async function clearDefault(templateId: string) {
  await supabase
    .from("service_templates" as any)
    .update({ is_default: false })
    .eq("id", templateId);
}
