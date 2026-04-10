import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Building2, Puzzle, Plug, Users, AlertTriangle, ArrowRight,
  TrendingUp, CheckCircle2, XCircle, Clock, Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { data: tenants } = useQuery({
    queryKey: ["tenants"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("*").order("created_at", { ascending: false });
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

  const { data: roles } = useQuery({
    queryKey: ["all-tenant-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenant_roles").select("*");
      if (error) throw error;
      return data;
    },
  });

  const activeTenants = tenants?.filter((t) => t.status === "active").length ?? 0;
  const trialTenants = tenants?.filter((t) => t.status === "trial").length ?? 0;
  const suspendedTenants = tenants?.filter((t) => t.status === "suspended").length ?? 0;
  const activeModuleCount = modules?.filter((m) => m.is_active).length ?? 0;
  const connectedIntegrations = credentials?.filter((c) => c.status === "connected").length ?? 0;
  const errorIntegrations = credentials?.filter((c) => c.status === "error").length ?? 0;
  const totalUsers = profiles?.length ?? 0;

  // Build alerts
  const alerts: { level: "critical" | "warning" | "info"; text: string; link?: string }[] = [];

  if (errorIntegrations > 0) {
    alerts.push({ level: "critical", text: `${errorIntegrations} integrasjon(er) med feil`, link: "/admin/integrations" });
  }

  // Tenants without any modules
  const tenantsWithoutModules = tenants?.filter((t) => {
    const tm = modules?.filter((m) => m.tenant_id === t.id && m.is_active);
    return !tm || tm.length === 0;
  }) ?? [];
  if (tenantsWithoutModules.length > 0) {
    alerts.push({ level: "warning", text: `${tenantsWithoutModules.length} tenant(er) uten aktive moduler`, link: "/admin/modules" });
  }

  // Tenants without users
  const tenantsWithoutUsers = tenants?.filter((t) => {
    const up = profiles?.filter((p) => p.tenant_id === t.id);
    return !up || up.length === 0;
  }) ?? [];
  if (tenantsWithoutUsers.length > 0) {
    alerts.push({ level: "warning", text: `${tenantsWithoutUsers.length} tenant(er) uten brukere`, link: "/admin/tenants" });
  }

  if (suspendedTenants > 0) {
    alerts.push({ level: "info", text: `${suspendedTenants} suspendert(e) tenant(er)`, link: "/admin/tenants" });
  }

  const statusColors: Record<string, string> = {
    active: "bg-accent/10 text-accent border-accent/20",
    trial: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800",
    inactive: "bg-muted text-muted-foreground",
    suspended: "bg-destructive/10 text-destructive border-destructive/20",
  };

  const statusLabels: Record<string, string> = {
    active: "Aktiv", trial: "Prøve", inactive: "Inaktiv", suspended: "Suspendert",
  };

  // Module usage stats
  const moduleUsage: Record<string, number> = {};
  modules?.filter((m) => m.is_active).forEach((m) => {
    moduleUsage[m.module_name] = (moduleUsage[m.module_name] || 0) + 1;
  });

  const moduleNames: Record<string, string> = {
    postkontoret: "Postkontoret",
    ressursplanlegger: "Ressursplanlegger",
    crm: "CRM",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Plattformoversikt</h1>
          <p className="text-sm text-muted-foreground mt-0.5">VPKontroll SaaS – kontrollsenter</p>
        </div>
        <Button asChild>
          <Link to="/admin/tenants">
            <Building2 className="w-4 h-4 mr-2" />
            Administrer tenants
          </Link>
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Aktive tenants", value: activeTenants, sub: `${trialTenants} på prøve`, icon: Building2, color: "text-primary" },
          { label: "Totalt brukere", value: totalUsers, sub: `${tenants?.length ?? 0} tenants`, icon: Users, color: "text-blue-600 dark:text-blue-400" },
          { label: "Aktive moduler", value: activeModuleCount, sub: `${Object.keys(moduleUsage).length} unike`, icon: Puzzle, color: "text-violet-600 dark:text-violet-400" },
          { label: "Integrasjoner", value: connectedIntegrations, sub: errorIntegrations > 0 ? `${errorIntegrations} feil` : "OK", icon: Plug, color: errorIntegrations > 0 ? "text-destructive" : "text-accent" },
        ].map((s) => (
          <Card key={s.label} className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
                  <p className="text-2xl font-bold mt-1">{s.value}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{s.sub}</p>
                </div>
                <div className={cn("p-2 rounded-lg bg-muted", s.color)}>
                  <s.icon className="w-4 h-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              Krever oppfølging ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.map((a, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg text-sm",
                  a.level === "critical" && "bg-destructive/10 text-destructive",
                  a.level === "warning" && "bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300",
                  a.level === "info" && "bg-muted text-muted-foreground"
                )}
              >
                <span>{a.text}</span>
                {a.link && (
                  <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                    <Link to={a.link}>Vis <ArrowRight className="w-3 h-3 ml-1" /></Link>
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent tenants */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Siste tenants</CardTitle>
              <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                <Link to="/admin/tenants">Se alle <ArrowRight className="w-3 h-3 ml-1" /></Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {!tenants?.length ? (
              <p className="text-sm text-muted-foreground text-center py-6">Ingen tenants ennå</p>
            ) : (
              tenants.slice(0, 6).map((t) => {
                const userCount = profiles?.filter((p) => p.tenant_id === t.id).length ?? 0;
                const modCount = modules?.filter((m) => m.tenant_id === t.id && m.is_active).length ?? 0;
                return (
                  <Link
                    key={t.id}
                    to={`/admin/tenants/${t.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                        {t.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{t.name}</p>
                        <p className="text-[11px] text-muted-foreground">{userCount} brukere · {modCount} moduler</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn("text-[10px]", statusColors[t.status])}>
                        {statusLabels[t.status] ?? t.status}
                      </Badge>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Module usage & Integration health */}
        <div className="space-y-4">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Modulbruk på tvers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(moduleNames).map(([key, label]) => {
                const count = moduleUsage[key] || 0;
                const total = tenants?.length ?? 1;
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{label}</span>
                      <span className="text-muted-foreground">{count} / {total} tenants ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Integrasjonshelse</CardTitle>
            </CardHeader>
            <CardContent>
              {!credentials?.length ? (
                <p className="text-sm text-muted-foreground text-center py-4">Ingen integrasjoner konfigurert</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {["connected", "error", "pending", "disconnected"].map((status) => {
                    const count = credentials.filter((c) => c.status === status).length;
                    if (count === 0) return null;
                    const config: Record<string, { label: string; icon: typeof CheckCircle2; cls: string }> = {
                      connected: { label: "Tilkoblet", icon: CheckCircle2, cls: "text-accent" },
                      error: { label: "Feil", icon: XCircle, cls: "text-destructive" },
                      pending: { label: "Venter", icon: Clock, cls: "text-yellow-600" },
                      disconnected: { label: "Frakoblet", icon: Activity, cls: "text-muted-foreground" },
                    };
                    const c = config[status];
                    return (
                      <div key={status} className="flex items-center gap-2 p-2 rounded bg-muted/50">
                        <c.icon className={cn("w-4 h-4", c.cls)} />
                        <span className="text-sm">{count} {c.label.toLowerCase()}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
