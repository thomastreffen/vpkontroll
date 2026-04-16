import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, CalendarDays, TrendingUp, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

const moduleInfo: Record<string, { label: string; description: string; icon: typeof Mail; path?: string }> = {
  postkontoret: {
    label: "Postkontoret",
    description: "E-post, samtaler og meldingshåndtering",
    icon: Mail,
    path: "/tenant/postkontoret",
  },
  ressursplanlegger: {
    label: "Ressursplanlegger",
    description: "Kalender, ressursallokering og planlegging",
    icon: CalendarDays,
    path: "/tenant/ressursplanlegger",
  },
  crm: {
    label: "CRM",
    description: "Kunder, kontaktpersoner, deals og salgsoppfølging",
    icon: TrendingUp,
    path: "/tenant/crm/companies",
  },
};

export default function TenantModulesPage() {
  const { tenantId } = useAuth();
  const navigate = useNavigate();

  const { data: modules, isLoading } = useQuery({
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

  const getModuleStatus = (moduleName: string) =>
    modules?.find((m) => m.module_name === moduleName)?.is_active ?? false;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Moduler</h1>
        <p className="text-muted-foreground mt-1">Oversikt over tilgjengelige moduler for din virksomhet</p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-center py-8">Laster...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(moduleInfo).map(([key, info]) => {
            const active = getModuleStatus(key);
            return (
              <Card
                key={key}
                className={`border-border/50 transition-colors ${active && info.path ? "cursor-pointer hover:border-primary/30" : ""}`}
                onClick={() => active && info.path && navigate(info.path)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      <info.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold">{info.label}</h3>
                        <Badge variant="outline" className={active ? "bg-accent/10 text-accent border-accent/20" : ""}>
                          {active ? "Aktiv" : "Inaktiv"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{info.description}</p>
                      {active && info.path ? (
                        <Button variant="link" size="sm" className="px-0 h-auto mt-2 text-xs gap-1" onClick={(e) => { e.stopPropagation(); navigate(info.path!); }}>
                          <ExternalLink className="h-3 w-3" /> Åpne modul
                        </Button>
                      ) : !active ? (
                        <p className="text-xs text-muted-foreground mt-2">
                          Kontakt administrator for å aktivere denne modulen.
                        </p>
                      ) : null}
                    </div>
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
