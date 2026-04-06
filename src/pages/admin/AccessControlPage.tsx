import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield, Users, ChevronRight, LayoutGrid, Zap } from "lucide-react";
import { MODULE_PERMISSION_KEYS, getPermLabel } from "@/lib/permission-labels";

export default function MasterAccessControlPage() {
  const { data: tenants } = useQuery({
    queryKey: ["tenants"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: allRoles, isLoading } = useQuery({
    queryKey: ["all-tenant-roles"],
    queryFn: async () => {
      const [{ data: roles }, { data: perms }, { data: assignments }] = await Promise.all([
        supabase.from("tenant_roles").select("*").order("name"),
        supabase.from("tenant_role_permissions").select("*"),
        supabase.from("tenant_user_role_assignments").select("*"),
      ]);
      return { roles: roles || [], perms: perms || [], assignments: assignments || [] };
    },
  });

  const getRolesForTenant = (tenantId: string) => {
    if (!allRoles) return [];
    const roles = allRoles.roles.filter((r: any) => r.tenant_id === tenantId);
    return roles.map((r: any) => {
      const permCount = allRoles.perms.filter((p: any) => p.role_id === r.id).length;
      const userCount = allRoles.assignments.filter((a: any) => a.role_id === r.id).length;
      const moduleCount = allRoles.perms
        .filter((p: any) => p.role_id === r.id && MODULE_PERMISSION_KEYS.includes(p.permission_key) && p.allowed)
        .length;
      return { ...r, permCount, userCount, moduleCount };
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Tilgangsstyring</h1>
        <p className="text-muted-foreground mt-1">Oversikt over roller og rettigheter per tenant</p>
      </div>

      {!tenants?.length ? (
        <Card className="border-border/50">
          <CardContent className="p-12 text-center">
            <Shield className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Ingen tenants å vise tilgangsstyring for</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tenants.map((tenant) => {
            const roles = getRolesForTenant(tenant.id);
            const totalUsers = new Set(
              (allRoles?.assignments || []).filter((a: any) => a.tenant_id === tenant.id).map((a: any) => a.user_id)
            ).size;

            return (
              <Card key={tenant.id} className="border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{tenant.name}</CardTitle>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-[10px]">{roles.length} roller</Badge>
                      <Badge variant="outline" className="text-[10px]">{totalUsers} brukere med roller</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {!roles.length ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">Ingen roller konfigurert ennå.</p>
                  ) : (
                    <div className="space-y-2">
                      {roles.map((r: any) => (
                        <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/30">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{r.name}</span>
                              <Badge variant={r.is_system_role ? "secondary" : "outline"} className="text-[10px]">
                                {r.is_system_role ? "System" : "Egendefinert"}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><LayoutGrid className="h-3 w-3" />{r.moduleCount} moduler</span>
                              <span>·</span>
                              <span className="flex items-center gap-1"><Zap className="h-3 w-3" />{r.permCount} rett.</span>
                              <span>·</span>
                              <span className="flex items-center gap-1"><Users className="h-3 w-3" />{r.userCount} brukere</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
