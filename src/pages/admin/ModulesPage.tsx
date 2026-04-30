import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Mail, CalendarDays, TrendingUp, Puzzle, CheckCircle2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

type TenantModule = Tables<"tenant_modules">;

const moduleInfo: Record<string, { label: string; description: string; icon: typeof Mail; tier: string; deps?: string[] }> = {
  crm: {
    label: "CRM",
    description: "Kontakter, bedrifter, salg, pipeline og salgsoppfølging",
    icon: TrendingUp,
    tier: "Kjerne",
  },
  postkontoret: {
    label: "Postkontoret",
    description: "E-post, samtaler og meldingshåndtering via tilkoblet postkasse",
    icon: Mail,
    tier: "Kjerne",
    deps: ["crm"],
  },
  ressursplanlegger: {
    label: "Ressursplanlegger",
    description: "Kalender, tekniker-allokering og planlegging av oppdrag",
    icon: CalendarDays,
    tier: "Kjerne",
    deps: ["crm"],
  },
};

export default function ModulesPage() {
  const queryClient = useQueryClient();

  const { data: tenants } = useQuery({
    queryKey: ["tenants"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: modules } = useQuery({
    queryKey: ["tenant_modules"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenant_modules").select("*");
      if (error) throw error;
      return data as TenantModule[];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ tenantId, moduleName, isActive }: { tenantId: string; moduleName: string; isActive: boolean }) => {
      const existing = modules?.find((m) => m.tenant_id === tenantId && m.module_name === moduleName);
      if (existing) {
        const { error } = await supabase.from("tenant_modules").update({
          is_active: isActive,
          activated_at: isActive ? new Date().toISOString() : existing.activated_at,
          deactivated_at: !isActive ? new Date().toISOString() : null,
        }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tenant_modules").insert({
          tenant_id: tenantId,
          module_name: moduleName as TenantModule["module_name"],
          is_active: isActive,
          activated_at: isActive ? new Date().toISOString() : null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant_modules"] });
      toast.success("Modul oppdatert");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const activateAllMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      for (const key of Object.keys(moduleInfo)) {
        const existing = modules?.find((m) => m.tenant_id === tenantId && m.module_name === key);
        if (existing) {
          if (!existing.is_active) {
            await supabase.from("tenant_modules").update({ is_active: true, activated_at: new Date().toISOString(), deactivated_at: null }).eq("id", existing.id);
          }
        } else {
          await supabase.from("tenant_modules").insert({ tenant_id: tenantId, module_name: key as any, is_active: true, activated_at: new Date().toISOString() });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant_modules"] });
      toast.success("Alle moduler aktivert");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const getModuleStatus = (tenantId: string, moduleName: string) =>
    modules?.find((m) => m.tenant_id === tenantId && m.module_name === moduleName)?.is_active ?? false;

  // Module stats
  const moduleStats = Object.keys(moduleInfo).map((key) => {
    const activeCount = modules?.filter((m) => m.module_name === key && m.is_active).length ?? 0;
    return { key, activeCount };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Modulsenter</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Aktiver og styr moduler per tenant</p>
      </div>

      {/* Module overview cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {moduleStats.map((ms) => {
          const info = moduleInfo[ms.key];
          return (
            <Card key={ms.key} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <info.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{info.label}</p>
                      <Badge variant="outline" className="text-[10px]">{info.tier}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{info.description}</p>
                    <p className="text-xs mt-2">
                      <span className="font-medium text-accent">{ms.activeCount}</span>
                      <span className="text-muted-foreground"> / {tenants?.length ?? 0} tenants</span>
                    </p>
                    {info.deps && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Avhenger av: {info.deps.map((d) => moduleInfo[d]?.label || d).join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Per-tenant module matrix */}
      {!tenants?.length ? (
        <Card className="border-border/50">
          <CardContent className="p-12 text-center">
            <Puzzle className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Opprett en tenant først</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Moduler per tenant</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Tenant</th>
                    {Object.entries(moduleInfo).map(([key, info]) => (
                      <th key={key} className="text-center py-2 px-3 font-medium text-muted-foreground">{info.label}</th>
                    ))}
                    <th className="text-right py-2 pl-4 font-medium text-muted-foreground">Handling</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((tenant) => {
                    const allActive = Object.keys(moduleInfo).every((k) => getModuleStatus(tenant.id, k));
                    return (
                      <tr key={tenant.id} className="border-b border-border/50 last:border-0">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{tenant.name}</span>
                            <Badge variant="outline" className="text-[10px]">{tenant.slug}</Badge>
                          </div>
                        </td>
                        {Object.keys(moduleInfo).map((key) => (
                          <td key={key} className="text-center py-3 px-3">
                            <div className="flex justify-center">
                              <Switch
                                checked={getModuleStatus(tenant.id, key)}
                                onCheckedChange={(checked) =>
                                  toggleMutation.mutate({ tenantId: tenant.id, moduleName: key, isActive: checked })
                                }
                              />
                            </div>
                          </td>
                        ))}
                        <td className="py-3 pl-4 text-right">
                          {!allActive && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => activateAllMutation.mutate(tenant.id)}
                            >
                              Aktiver alle
                            </Button>
                          )}
                          {allActive && (
                            <span className="text-xs text-accent flex items-center gap-1 justify-end">
                              <CheckCircle2 className="w-3 h-3" /> Komplett
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
