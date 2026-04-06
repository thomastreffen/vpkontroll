import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Puzzle, Plug, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  const { data: tenants } = useQuery({
    queryKey: ["tenants"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: modules } = useQuery({
    queryKey: ["tenant_modules"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenant_modules").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: credentials } = useQuery({
    queryKey: ["tenant_credentials"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenant_credentials").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      return data;
    },
  });

  const activeModules = modules?.filter((m) => m.is_active).length ?? 0;
  const connectedIntegrations = credentials?.filter((c) => c.status === "connected").length ?? 0;

  const stats = [
    { label: "Tenants", value: tenants?.length ?? 0, icon: Building2, color: "text-primary" },
    { label: "Aktive moduler", value: activeModules, icon: Puzzle, color: "text-accent" },
    { label: "Tilkoblinger", value: connectedIntegrations, icon: Plug, color: "text-accent" },
    { label: "Brukere", value: profiles?.length ?? 0, icon: Users, color: "text-primary" },
  ];

  const statusColors: Record<string, string> = {
    active: "bg-accent/10 text-accent border-accent/20",
    trial: "bg-warning/10 text-warning border-warning/20",
    inactive: "bg-muted text-muted-foreground",
    suspended: "bg-destructive/10 text-destructive border-destructive/20",
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Oversikt over VarmePumpe SaaS-plattformen</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border/50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={cn("p-3 rounded-xl bg-muted", stat.color)}>
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Nylige tenants</CardTitle>
        </CardHeader>
        <CardContent>
          {!tenants?.length ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Ingen tenants ennå. Opprett den første under &quot;Tenants&quot;-fanen.
            </p>
          ) : (
            <div className="space-y-3">
              {tenants.slice(0, 5).map((tenant) => (
                <div
                  key={tenant.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium text-sm">{tenant.name}</p>
                    <p className="text-xs text-muted-foreground">{tenant.slug}</p>
                  </div>
                  <Badge variant="outline" className={statusColors[tenant.status] ?? ""}>
                    {tenant.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}
