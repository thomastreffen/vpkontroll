import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  ArrowLeft, Building2, Users, Puzzle, Plug, Shield, ExternalLink,
  CheckCircle2, XCircle, Clock, AlertCircle, Pause, Play, Mail, CalendarDays, TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

type TenantStatus = Tables<"tenants">["status"];

const statusLabels: Record<TenantStatus, string> = {
  active: "Aktiv", trial: "Prøveperiode", inactive: "Inaktiv", suspended: "Suspendert",
};
const statusColors: Record<string, string> = {
  active: "bg-accent/10 text-accent border-accent/20",
  trial: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400",
  inactive: "bg-muted text-muted-foreground",
  suspended: "bg-destructive/10 text-destructive border-destructive/20",
};

const moduleInfo: Record<string, { label: string; icon: typeof Mail }> = {
  postkontoret: { label: "Postkontoret", icon: Mail },
  ressursplanlegger: { label: "Ressursplanlegger", icon: CalendarDays },
  crm: { label: "CRM", icon: TrendingUp },
};

const credStatusConfig: Record<string, { label: string; icon: typeof CheckCircle2; cls: string }> = {
  connected: { label: "Tilkoblet", icon: CheckCircle2, cls: "text-accent" },
  disconnected: { label: "Frakoblet", icon: XCircle, cls: "text-muted-foreground" },
  error: { label: "Feil", icon: AlertCircle, cls: "text-destructive" },
  pending: { label: "Venter", icon: Clock, cls: "text-yellow-600" },
};

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [statusAction, setStatusAction] = useState<TenantStatus | null>(null);

  const { data: tenant, isLoading } = useQuery({
    queryKey: ["tenant", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: modules } = useQuery({
    queryKey: ["tenant_modules", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenant_modules").select("*").eq("tenant_id", id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: profiles } = useQuery({
    queryKey: ["tenant_profiles", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("tenant_id", id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: credentials } = useQuery({
    queryKey: ["tenant_credentials", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenant_credentials").select("*").eq("tenant_id", id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: roles } = useQuery({
    queryKey: ["tenant_roles", id],
    queryFn: async () => {
      const [{ data: r }, { data: a }] = await Promise.all([
        supabase.from("tenant_roles").select("*").eq("tenant_id", id!),
        supabase.from("tenant_user_role_assignments").select("*").eq("tenant_id", id!),
      ]);
      return { roles: r || [], assignments: a || [] };
    },
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: async (newStatus: TenantStatus) => {
      const { error } = await supabase.from("tenants").update({ status: newStatus }).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant", id] });
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      toast.success("Tenantstatus oppdatert");
      setStatusAction(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleModuleMutation = useMutation({
    mutationFn: async ({ moduleName, isActive }: { moduleName: string; isActive: boolean }) => {
      const existing = modules?.find((m) => m.module_name === moduleName);
      if (existing) {
        const { error } = await supabase.from("tenant_modules").update({
          is_active: isActive,
          activated_at: isActive ? new Date().toISOString() : existing.activated_at,
          deactivated_at: !isActive ? new Date().toISOString() : null,
        }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tenant_modules").insert({
          tenant_id: id!,
          module_name: moduleName as any,
          is_active: isActive,
          activated_at: isActive ? new Date().toISOString() : null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant_modules", id] });
      toast.success("Modul oppdatert");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!tenant) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Tenant ikke funnet</p>
        <Button asChild variant="ghost" className="mt-4"><Link to="/admin/tenants">Tilbake</Link></Button>
      </div>
    );
  }

  const getModuleActive = (name: string) => modules?.find((m) => m.module_name === name)?.is_active ?? false;
  const uniqueUsers = new Set(roles?.assignments.map((a) => a.user_id) ?? []).size;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button asChild variant="ghost" size="icon" className="mt-0.5 shrink-0">
            <Link to="/admin/tenants"><ArrowLeft className="w-4 h-4" /></Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{tenant.name}</h1>
              <Badge variant="outline" className={cn("text-xs", statusColors[tenant.status])}>
                {statusLabels[tenant.status]}
              </Badge>
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span>{tenant.slug}</span>
              {tenant.domain && <><span>·</span><span>{tenant.domain}</span></>}
              <span>·</span>
              <span>Opprettet {new Date(tenant.created_at).toLocaleDateString("nb-NO")}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {tenant.status === "suspended" ? (
            <Button variant="outline" size="sm" onClick={() => setStatusAction("active")}>
              <Play className="w-3.5 h-3.5 mr-1.5" /> Reaktiver
            </Button>
          ) : tenant.status !== "inactive" ? (
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setStatusAction("suspended")}>
              <Pause className="w-3.5 h-3.5 mr-1.5" /> Suspender
            </Button>
          ) : null}
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Brukere", value: profiles?.length ?? 0, icon: Users },
          { label: "Aktive moduler", value: modules?.filter((m) => m.is_active).length ?? 0, icon: Puzzle },
          { label: "Integrasjoner", value: credentials?.length ?? 0, icon: Plug },
          { label: "Roller", value: roles?.roles.length ?? 0, icon: Shield },
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Modules */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Puzzle className="w-4 h-4" /> Moduler
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(moduleInfo).map(([key, info]) => {
              const active = getModuleActive(key);
              return (
                <div key={key} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                      <info.icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium">{info.label}</span>
                  </div>
                  <Switch
                    checked={active}
                    onCheckedChange={(checked) => toggleModuleMutation.mutate({ moduleName: key, isActive: checked })}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Integrations */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Plug className="w-4 h-4" /> Integrasjoner
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!credentials?.length ? (
              <p className="text-sm text-muted-foreground text-center py-6">Ingen integrasjoner konfigurert</p>
            ) : (
              <div className="space-y-3">
                {credentials.map((cred) => {
                  const sc = credStatusConfig[cred.status] ?? credStatusConfig.disconnected;
                  return (
                    <div key={cred.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/30">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-xs font-bold">
                          {cred.provider === "microsoft" ? "MS" : "G"}
                        </div>
                        <div>
                          <p className="text-sm font-medium capitalize">{cred.provider}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {cred.tenant_domain || "Ikke konfigurert"}
                            {cred.last_sync_at && ` · Sist synk ${new Date(cred.last_sync_at).toLocaleDateString("nb-NO")}`}
                          </p>
                        </div>
                      </div>
                      <div className={cn("flex items-center gap-1.5", sc.cls)}>
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

        {/* Users */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="w-4 h-4" /> Brukere ({profiles?.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!profiles?.length ? (
              <p className="text-sm text-muted-foreground text-center py-6">Ingen brukere tilknyttet</p>
            ) : (
              <div className="space-y-2">
                {profiles.slice(0, 8).map((p) => {
                  const userRoles = roles?.assignments.filter((a) => a.user_id === p.user_id) ?? [];
                  const roleNames = userRoles.map((ur) => roles?.roles.find((r) => r.id === ur.role_id)?.name).filter(Boolean);
                  return (
                    <div key={p.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold shrink-0">
                          {(p.full_name?.[0] || p.email?.[0] || "?").toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{p.full_name || p.email}</p>
                          {p.full_name && <p className="text-[11px] text-muted-foreground truncate">{p.email}</p>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {roleNames.map((rn) => (
                          <Badge key={rn} variant="outline" className="text-[10px]">{rn}</Badge>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {(profiles?.length ?? 0) > 8 && (
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    + {(profiles?.length ?? 0) - 8} flere brukere
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Roles */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4" /> Roller ({roles?.roles.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!roles?.roles.length ? (
              <p className="text-sm text-muted-foreground text-center py-6">Ingen roller konfigurert</p>
            ) : (
              <div className="space-y-2">
                {roles.roles.map((r) => {
                  const userCount = roles.assignments.filter((a) => a.role_id === r.id).length;
                  return (
                    <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/30">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{r.name}</span>
                        <Badge variant={r.is_system_role ? "secondary" : "outline"} className="text-[10px]">
                          {r.is_system_role ? "System" : "Egendefinert"}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">{userCount} brukere</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tenant info */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Tenantdetaljer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div><span className="text-muted-foreground block text-xs mb-1">Navn</span>{tenant.name}</div>
            <div><span className="text-muted-foreground block text-xs mb-1">Slug</span>{tenant.slug}</div>
            <div><span className="text-muted-foreground block text-xs mb-1">Domene</span>{tenant.domain || "–"}</div>
            <div>
              <span className="text-muted-foreground block text-xs mb-1">Status</span>
              <Select
                value={tenant.status}
                onValueChange={(v) => setStatusAction(v as TenantStatus)}
              >
                <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Aktiv</SelectItem>
                  <SelectItem value="trial">Prøveperiode</SelectItem>
                  <SelectItem value="inactive">Inaktiv</SelectItem>
                  <SelectItem value="suspended">Suspendert</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><span className="text-muted-foreground block text-xs mb-1">Opprettet</span>{new Date(tenant.created_at).toLocaleDateString("nb-NO")}</div>
            <div><span className="text-muted-foreground block text-xs mb-1">Sist oppdatert</span>{new Date(tenant.updated_at).toLocaleDateString("nb-NO")}</div>
          </div>
        </CardContent>
      </Card>

      {/* Status change confirmation */}
      <AlertDialog open={!!statusAction} onOpenChange={(o) => { if (!o) setStatusAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Endre status til «{statusAction ? statusLabels[statusAction] : ""}»?</AlertDialogTitle>
            <AlertDialogDescription>
              {statusAction === "suspended"
                ? "Brukere i denne tenanten vil miste tilgang til systemet."
                : "Tenantens status vil bli oppdatert."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => statusAction && statusMutation.mutate(statusAction)}
              className={statusAction === "suspended" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {statusMutation.isPending ? "Lagrer..." : "Bekreft"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
