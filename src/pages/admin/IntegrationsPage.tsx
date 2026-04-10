import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plug, CheckCircle2, XCircle, AlertCircle, Clock, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";

type Credential = Tables<"tenant_credentials">;

const statusConfig: Record<string, { label: string; icon: typeof CheckCircle2; cls: string }> = {
  connected: { label: "Tilkoblet", icon: CheckCircle2, cls: "text-accent" },
  disconnected: { label: "Frakoblet", icon: XCircle, cls: "text-muted-foreground" },
  error: { label: "Feil", icon: AlertCircle, cls: "text-destructive" },
  pending: { label: "Venter", icon: Clock, cls: "text-yellow-600" },
};

export default function IntegrationsPage() {
  const { data: tenants } = useQuery({
    queryKey: ["tenants"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: credentials } = useQuery({
    queryKey: ["tenant_credentials"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenant_credentials").select("*");
      if (error) throw error;
      return data as Credential[];
    },
  });

  const errorCount = credentials?.filter((c) => c.status === "error").length ?? 0;
  const connectedCount = credentials?.filter((c) => c.status === "connected").length ?? 0;
  const tenantsWithIntegrations = new Set(credentials?.map((c) => c.tenant_id) ?? []).size;
  const tenantsWithout = (tenants?.length ?? 0) - tenantsWithIntegrations;

  const getTenantCredentials = (tenantId: string) =>
    credentials?.filter((c) => c.tenant_id === tenantId) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integrasjoner</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Microsoft- og Google-tilkoblinger per tenant</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Tilkoblet", value: connectedCount, icon: CheckCircle2, cls: "text-accent" },
          { label: "Med feil", value: errorCount, icon: AlertCircle, cls: errorCount > 0 ? "text-destructive" : "text-muted-foreground" },
          { label: "Tenants med intgr.", value: tenantsWithIntegrations, icon: Building2, cls: "text-primary" },
          { label: "Tenants uten", value: tenantsWithout, icon: Plug, cls: tenantsWithout > 0 ? "text-yellow-600" : "text-muted-foreground" },
        ].map((s) => (
          <Card key={s.label} className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn("p-2 rounded-lg bg-muted", s.cls)}><s.icon className="w-4 h-4" /></div>
              <div>
                <p className="text-xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Per-tenant breakdown */}
      {!tenants?.length ? (
        <Card className="border-border/50">
          <CardContent className="p-12 text-center">
            <Plug className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Ingen tenants å vise integrasjoner for</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tenants.map((tenant) => {
            const creds = getTenantCredentials(tenant.id);
            const hasError = creds.some((c) => c.status === "error");
            return (
              <Card key={tenant.id} className={cn("border-border/50", hasError && "border-destructive/30")}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <Link to={`/admin/tenants/${tenant.id}`} className="hover:text-primary transition-colors">
                      <p className="font-medium text-sm">{tenant.name}</p>
                      <p className="text-[11px] text-muted-foreground">{tenant.slug}</p>
                    </Link>
                    {!creds.length ? (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">Ikke konfigurert</Badge>
                    ) : (
                      <div className="flex gap-2">
                        {creds.map((cred) => {
                          const sc = statusConfig[cred.status] ?? statusConfig.disconnected;
                          return (
                            <div key={cred.id} className="flex items-center gap-2 p-2 rounded-lg border border-border/50 bg-muted/30">
                              <div className="w-6 h-6 rounded bg-muted flex items-center justify-center text-[10px] font-bold">
                                {cred.provider === "microsoft" ? "MS" : "G"}
                              </div>
                              <div>
                                <p className="text-xs font-medium capitalize">{cred.provider}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {cred.last_sync_at
                                    ? `Synk ${new Date(cred.last_sync_at).toLocaleDateString("nb-NO")}`
                                    : "Aldri synket"}
                                </p>
                              </div>
                              <div className={cn("flex items-center gap-1", sc.cls)}>
                                <sc.icon className="w-3.5 h-3.5" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
