import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type TenantModuleRow = {
  id: string;
  module_name: string;
  is_active: boolean;
};

export function useTenantModules() {
  const { tenantId } = useAuth();

  const query = useQuery({
    queryKey: ["tenant-modules", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_modules")
        .select("id, module_name, is_active")
        .eq("tenant_id", tenantId!)
        .order("module_name");

      if (error) throw error;
      return (data ?? []) as TenantModuleRow[];
    },
  });

  const activeModules = useMemo(
    () => new Set((query.data ?? []).filter((item) => item.is_active).map((item) => item.module_name)),
    [query.data]
  );

  const hasModule = (moduleName: string) => activeModules.has(moduleName);

  return {
    modules: query.data ?? [],
    activeModules,
    hasModule,
    loading: query.isLoading,
  };
}
