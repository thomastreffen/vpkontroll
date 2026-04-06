import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plug, CheckCircle2, XCircle, AlertCircle, Clock } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Credential = Tables<"tenant_credentials">;

const statusConfig: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  connected: { label: "Tilkoblet", icon: CheckCircle2, className: "text-accent" },
  disconnected: { label: "Frakoblet", icon: XCircle, className: "text-muted-foreground" },
  error: { label: "Feil", icon: AlertCircle, className: "text-destructive" },
  pending: { label: "Venter", icon: Clock, className: "text-yellow-600" },
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

  const getTenantCredentials = (tenantId: string) =>
    credentials?.filter((c) => c.tenant_id === tenantId) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Integrasjoner</h1>
        <p className="text-muted-foreground mt-1">
          Oversikt over Microsoft og Google-tilkoblinger per tenant
        </p>
      </div>

      {!tenants?.length ? (
        <Card className="border-border/50">
          <CardContent className="p-12 text-center">
            <Plug className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Ingen tenants å vise integrasjoner for</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tenants.map((tenant) => {
            const creds = getTenantCredentials(tenant.id);
            return (
              <Card key={tenant.id} className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{tenant.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  {!creds.length ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      Ingen integrasjoner konfigurert ennå. Tenant admin kan sette dette opp.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {creds.map((cred) => {
                        const sc = statusConfig[cred.status] ?? statusConfig.disconnected;
                        return (
                          <div
                            key={cred.id}
                            className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-muted/30"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-xs font-bold uppercase">
                                {cred.provider === "microsoft" ? "MS" : "G"}
                              </div>
                              <div>
                                <p className="text-sm font-medium capitalize">{cred.provider}</p>
                                <p className="text-xs text-muted-foreground">
                                  {cred.tenant_domain || "Domene ikke satt"}
                                </p>
                              </div>
                            </div>
                            <div className={`flex items-center gap-1.5 ${sc.className}`}>
                              <sc.icon className="w-4 h-4" />
                              <span className="text-xs font-medium">{sc.label}</span>
                            </div>
                          </div>
                        );
                      })}
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
