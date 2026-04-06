import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Mail, CalendarDays, Puzzle } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type TenantModule = Tables<"tenant_modules">;

const moduleInfo: Record<string, { label: string; description: string; icon: typeof Mail }> = {
  postkontoret: {
    label: "Postkontoret",
    description: "E-post, samtaler og meldingshåndtering",
    icon: Mail,
  },
  ressursplanlegger: {
    label: "Ressursplanlegger",
    description: "Kalender, ressursallokering og planlegging",
    icon: CalendarDays,
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
      const existing = modules?.find(
        (m) => m.tenant_id === tenantId && m.module_name === moduleName
      );

      if (existing) {
        const { error } = await supabase
          .from("tenant_modules")
          .update({
            is_active: isActive,
            activated_at: isActive ? new Date().toISOString() : existing.activated_at,
            deactivated_at: !isActive ? new Date().toISOString() : null,
          })
          .eq("id", existing.id);
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

  const getModuleStatus = (tenantId: string, moduleName: string) => {
    return modules?.find(
      (m) => m.tenant_id === tenantId && m.module_name === moduleName
    )?.is_active ?? false;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Moduler</h1>
        <p className="text-muted-foreground mt-1">Aktiver og deaktiver moduler per tenant</p>
      </div>

      {!tenants?.length ? (
        <Card className="border-border/50">
          <CardContent className="p-12 text-center">
            <Puzzle className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Opprett en tenant først for å administrere moduler</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tenants.map((tenant) => (
            <Card key={tenant.id} className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  {tenant.name}
                  <Badge variant="outline" className="text-xs font-normal">{tenant.slug}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(moduleInfo).map(([key, info]) => {
                    const active = getModuleStatus(tenant.id, key);
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-muted/30"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                            <info.icon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{info.label}</p>
                            <p className="text-xs text-muted-foreground">{info.description}</p>
                          </div>
                        </div>
                        <Switch
                          checked={active}
                          onCheckedChange={(checked) =>
                            toggleMutation.mutate({
                              tenantId: tenant.id,
                              moduleName: key,
                              isActive: checked,
                            })
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
