import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Puzzle, Plug, CheckCircle2, XCircle } from "lucide-react";

export default function TenantDashboardPage() {
  const { tenantId } = useAuth();

  const { data: modules } = useQuery({
    queryKey: ["my-modules", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_modules")
        .select("*")
        .eq("tenant_id", tenantId!);
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const { data: credentials } = useQuery({
    queryKey: ["my-credentials", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_credentials")
        .select("*")
        .eq("tenant_id", tenantId!);
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const activeModules = modules?.filter((m) => m.is_active).length ?? 0;
  const connectedIntegrations = credentials?.filter((c) => c.status === "connected").length ?? 0;

  const stats = [
    { label: "Aktive moduler", value: activeModules, icon: Puzzle, color: "text-accent" },
    { label: "Tilkoblinger", value: connectedIntegrations, icon: Plug, color: "text-primary" },
  ];

  const moduleLabels: Record<string, string> = {
    postkontoret: "Postkontoret",
    ressursplanlegger: "Ressursplanlegger",
    crm: "CRM",
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Oversikt over din bedrift</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border/50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-xl bg-muted ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-border/50">
          <CardHeader><CardTitle className="text-lg">Moduler</CardTitle></CardHeader>
          <CardContent>
            {!modules?.length ? (
              <p className="text-sm text-muted-foreground text-center py-4">Ingen moduler tilgjengelig</p>
            ) : (
              <div className="space-y-3">
                {modules.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm font-medium">{moduleLabels[m.module_name] ?? m.module_name}</span>
                    <Badge variant="outline" className={m.is_active ? "bg-accent/10 text-accent border-accent/20" : ""}>
                      {m.is_active ? "Aktiv" : "Inaktiv"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader><CardTitle className="text-lg">Integrasjoner</CardTitle></CardHeader>
          <CardContent>
            {!credentials?.length ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Ingen integrasjoner konfigurert. Gå til Integrasjoner for å sette opp.
              </p>
            ) : (
              <div className="space-y-3">
                {credentials.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-xs font-bold">
                        {c.provider === "microsoft" ? "MS" : "G"}
                      </div>
                      <span className="text-sm font-medium capitalize">{c.provider}</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${c.status === "connected" ? "text-accent" : "text-muted-foreground"}`}>
                      {c.status === "connected" ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      <span className="text-xs">{c.status === "connected" ? "Tilkoblet" : "Frakoblet"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
