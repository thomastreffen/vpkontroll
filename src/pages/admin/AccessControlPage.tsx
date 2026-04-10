import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Loader2, Shield, Users, ChevronDown, ChevronRight, LayoutGrid, Zap, Building2 } from "lucide-react";
import { Link } from "react-router-dom";
import { PERMISSION_LABELS, MODULE_PERMISSION_KEYS, PERMISSION_CATEGORIES } from "@/lib/permission-labels";
import { cn } from "@/lib/utils";

export default function MasterAccessControlPage() {
  const [expandedTenant, setExpandedTenant] = useState<string | null>(null);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);

  const { data: tenants } = useQuery({
    queryKey: ["tenants"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: allData, isLoading } = useQuery({
    queryKey: ["all-tenant-roles-full"],
    queryFn: async () => {
      const [{ data: roles }, { data: perms }, { data: assignments }, { data: profiles }] = await Promise.all([
        supabase.from("tenant_roles").select("*").order("name"),
        supabase.from("tenant_role_permissions").select("*"),
        supabase.from("tenant_user_role_assignments").select("*"),
        supabase.from("profiles").select("user_id, full_name, email, tenant_id"),
      ]);
      return { roles: roles || [], perms: perms || [], assignments: assignments || [], profiles: profiles || [] };
    },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const getRolesForTenant = (tenantId: string) => {
    if (!allData) return [];
    return allData.roles
      .filter((r: any) => r.tenant_id === tenantId)
      .map((r: any) => {
        const rolePerms = allData.perms.filter((p: any) => p.role_id === r.id && p.allowed);
        const userCount = allData.assignments.filter((a: any) => a.role_id === r.id).length;
        const users = allData.assignments
          .filter((a: any) => a.role_id === r.id)
          .map((a: any) => allData.profiles.find((p: any) => p.user_id === a.user_id))
          .filter(Boolean);
        return { ...r, rolePerms, userCount, users };
      });
  };

  // Summary stats
  const totalRoles = allData?.roles.length ?? 0;
  const systemRoles = allData?.roles.filter((r: any) => r.is_system_role).length ?? 0;
  const usersWithRoles = new Set(allData?.assignments.map((a: any) => a.user_id) ?? []).size;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tilgangsstyring</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Oversikt over roller, rettigheter og brukertildelinger</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Totalt roller", value: totalRoles, icon: Shield },
          { label: "Systemroller", value: systemRoles, icon: LayoutGrid },
          { label: "Brukere med roller", value: usersWithRoles, icon: Users },
          { label: "Tenants", value: tenants?.length ?? 0, icon: Building2 },
        ].map((s) => (
          <Card key={s.label} className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted"><s.icon className="w-4 h-4 text-muted-foreground" /></div>
              <div>
                <p className="text-xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Per-tenant roles */}
      {!tenants?.length ? (
        <Card className="border-border/50">
          <CardContent className="p-12 text-center">
            <Shield className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Ingen tenants</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tenants.map((tenant) => {
            const roles = getRolesForTenant(tenant.id);
            const isExpanded = expandedTenant === tenant.id;
            const totalUsers = new Set(
              (allData?.assignments || []).filter((a: any) => a.tenant_id === tenant.id).map((a: any) => a.user_id)
            ).size;

            return (
              <Collapsible key={tenant.id} open={isExpanded} onOpenChange={(o) => setExpandedTenant(o ? tenant.id : null)}>
                <Card className="border-border/50">
                  <CollapsibleTrigger asChild>
                    <CardContent className="p-4 cursor-pointer hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                          <Link to={`/admin/tenants/${tenant.id}`} className="font-medium text-sm hover:text-primary" onClick={(e) => e.stopPropagation()}>
                            {tenant.name}
                          </Link>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">{roles.length} roller</Badge>
                          <Badge variant="outline" className="text-[10px]">{totalUsers} brukere</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4 space-y-2">
                      {!roles.length ? (
                        <p className="text-sm text-muted-foreground text-center py-4">Ingen roller konfigurert</p>
                      ) : (
                        roles.map((r: any) => {
                          const isRoleExpanded = expandedRole === r.id;
                          return (
                            <Collapsible key={r.id} open={isRoleExpanded} onOpenChange={(o) => setExpandedRole(o ? r.id : null)}>
                              <CollapsibleTrigger asChild>
                                <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                                  <div className="flex items-center gap-2">
                                    {isRoleExpanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                                    <span className="text-sm font-medium">{r.name}</span>
                                    <Badge variant={r.is_system_role ? "secondary" : "outline"} className="text-[10px]">
                                      {r.is_system_role ? "System" : "Egendefinert"}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1"><Zap className="h-3 w-3" />{r.rolePerms.length} rett.</span>
                                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{r.userCount} brukere</span>
                                  </div>
                                </div>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <div className="ml-6 mt-2 space-y-3">
                                  {/* Users in this role */}
                                  {r.users.length > 0 && (
                                    <div>
                                      <p className="text-xs font-medium text-muted-foreground mb-1">Brukere:</p>
                                      <div className="flex flex-wrap gap-1">
                                        {r.users.map((u: any) => (
                                          <Badge key={u.user_id} variant="outline" className="text-[10px]">
                                            {u.full_name || u.email}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {/* Permissions grouped by category */}
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Rettigheter:</p>
                                    <div className="flex flex-wrap gap-1">
                                      {r.rolePerms.map((p: any) => (
                                        <Badge key={p.permission_key} variant="outline" className="text-[10px] bg-accent/5">
                                          {PERMISSION_LABELS[p.permission_key]?.label ?? p.permission_key}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          );
                        })
                      )}
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
}
