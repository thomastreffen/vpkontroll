import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Search, CreditCard, Building2, Clock, CalendarCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const statusLabels: Record<string, string> = {
  trial: "Trial", active: "Aktiv", paused: "Pauset", expired: "Utløpt", cancelled: "Kansellert",
};
const statusColors: Record<string, string> = {
  trial: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400",
  active: "bg-accent/10 text-accent border-accent/20",
  paused: "bg-blue-50 text-blue-700 border-blue-200",
  expired: "bg-destructive/10 text-destructive border-destructive/20",
  cancelled: "bg-muted text-muted-foreground",
};

function daysUntil(date: string | null): number | null {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function SubscriptionsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editSub, setEditSub] = useState<any | null>(null);

  const { data: subs, isLoading } = useQuery({
    queryKey: ["tenant_subscriptions_full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_subscriptions")
        .select("*, saas_plans(*), tenants(*)");
      if (error) throw error;
      return data;
    },
  });

  const { data: plans } = useQuery({
    queryKey: ["saas_plans"],
    queryFn: async () => {
      const { data, error } = await supabase.from("saas_plans").select("*").eq("is_active", true).order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: tenantsWithoutSub } = useQuery({
    queryKey: ["tenants_without_sub"],
    queryFn: async () => {
      const { data: allTenants } = await supabase.from("tenants").select("id, name, slug");
      const { data: allSubs } = await supabase.from("tenant_subscriptions").select("tenant_id");
      const subTenantIds = new Set((allSubs || []).map(s => s.tenant_id));
      return (allTenants || []).filter(t => !subTenantIds.has(t.id));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { error } = await supabase.from("tenant_subscriptions").update(payload).eq("id", editSub.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenant_subscriptions_full"] });
      toast.success("Abonnement oppdatert");
      setEditSub(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { error } = await supabase.from("tenant_subscriptions").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenant_subscriptions_full"] });
      qc.invalidateQueries({ queryKey: ["tenants_without_sub"] });
      toast.success("Abonnement opprettet");
      setEditSub(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = subs?.filter((s: any) => {
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    const tenantName = s.tenants?.name?.toLowerCase() || "";
    const planName = s.saas_plans?.name?.toLowerCase() || "";
    if (search && !tenantName.includes(search.toLowerCase()) && !planName.includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: subs?.length || 0,
    trial: subs?.filter((s: any) => s.status === "trial").length || 0,
    active: subs?.filter((s: any) => s.status === "active").length || 0,
    expired: subs?.filter((s: any) => s.status === "expired" || s.status === "cancelled").length || 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Abonnementer</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Alle tenants og deres plan/status</p>
        </div>
        {(tenantsWithoutSub?.length ?? 0) > 0 && (
          <Button onClick={() => setEditSub({ _isNew: true, tenant_id: "", plan_id: "", status: "trial", source: "manual", notes: "" })}>
            <CreditCard className="w-4 h-4 mr-2" /> Tildel plan
          </Button>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Totalt", value: stats.total, icon: Building2 },
          { label: "Trial", value: stats.trial, icon: Clock, color: "text-yellow-600" },
          { label: "Aktive", value: stats.active, icon: CalendarCheck, color: "text-accent" },
          { label: "Utløpt/kansellert", value: stats.expired, icon: CreditCard, color: "text-destructive" },
        ].map(s => (
          <Card key={s.label} className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted"><s.icon className={cn("w-4 h-4", s.color || "text-muted-foreground")} /></div>
              <div>
                <p className="text-xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Søk tenant eller plan..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle statuser</SelectItem>
            {Object.entries(statusLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      <div className="space-y-2">
        {isLoading ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">Laster...</CardContent></Card>
        ) : !filtered?.length ? (
          <Card><CardContent className="p-12 text-center">
            <CreditCard className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Ingen abonnementer funnet</p>
          </CardContent></Card>
        ) : filtered.map((s: any) => {
          const trialDays = daysUntil(s.trial_ends_at);
          const isExpiringSoon = s.status === "trial" && trialDays !== null && trialDays <= 7 && trialDays >= 0;
          return (
            <Card key={s.id} className={cn("border-border/50 hover:border-border transition-colors cursor-pointer", isExpiringSoon && "border-yellow-300")}
              onClick={() => setEditSub(s)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                      {(s.tenants?.name || "?").substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{s.tenants?.name || "Ukjent tenant"}</p>
                        <Badge variant="outline" className={cn("text-[10px] shrink-0", statusColors[s.status])}>
                          {statusLabels[s.status]}
                        </Badge>
                        {isExpiringSoon && (
                          <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-700 border-orange-200 animate-pulse">
                            {trialDays} dager igjen
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                        <span>{s.saas_plans?.name || "Ingen plan"}</span>
                        <span>·</span>
                        <span>Startet {new Date(s.started_at).toLocaleDateString("nb-NO")}</span>
                        {s.trial_ends_at && s.status === "trial" && (
                          <><span>·</span><span>Trial til {new Date(s.trial_ends_at).toLocaleDateString("nb-NO")}</span></>
                        )}
                        {s.source && <><span>·</span><span>{s.source}</span></>}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit/Create Sheet */}
      <Sheet open={!!editSub} onOpenChange={o => { if (!o) setEditSub(null); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editSub?._isNew ? "Tildel plan til tenant" : `Abonnement: ${editSub?.tenants?.name || ""}`}</SheetTitle>
          </SheetHeader>
          {editSub && (
            <form className="space-y-5 mt-6" onSubmit={e => {
              e.preventDefault();
              if (editSub._isNew) {
                const plan = plans?.find(p => p.id === editSub.plan_id);
                const trialEnd = plan ? new Date(Date.now() + plan.trial_days * 86400000).toISOString() : null;
                createMutation.mutate({
                  tenant_id: editSub.tenant_id, plan_id: editSub.plan_id,
                  status: editSub.status, source: editSub.source, notes: editSub.notes,
                  trial_ends_at: editSub.status === "trial" ? trialEnd : null,
                });
              } else {
                updateMutation.mutate({
                  plan_id: editSub.plan_id, status: editSub.status,
                  trial_ends_at: editSub.trial_ends_at, billing_starts_at: editSub.billing_starts_at,
                  notes: editSub.notes,
                  converted_at: editSub.status === "active" && editSub._origStatus === "trial" ? new Date().toISOString() : editSub.converted_at,
                });
              }
            }}>
              {editSub._isNew && (
                <div className="space-y-2">
                  <Label>Tenant *</Label>
                  <Select value={editSub.tenant_id} onValueChange={v => setEditSub((s: any) => ({ ...s, tenant_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Velg tenant..." /></SelectTrigger>
                    <SelectContent>
                      {tenantsWithoutSub?.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Plan *</Label>
                <Select value={editSub.plan_id} onValueChange={v => setEditSub((s: any) => ({ ...s, plan_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Velg plan..." /></SelectTrigger>
                  <SelectContent>
                    {plans?.map(p => <SelectItem key={p.id} value={p.id}>{p.name} – {p.price_monthly} kr/mnd</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editSub.status} onValueChange={v => setEditSub((s: any) => ({ ...s, status: v, _origStatus: s.status }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {!editSub._isNew && editSub.status === "trial" && (
                <div className="space-y-2">
                  <Label>Trial utløper</Label>
                  <Input type="date" value={editSub.trial_ends_at ? new Date(editSub.trial_ends_at).toISOString().split("T")[0] : ""}
                    onChange={e => setEditSub((s: any) => ({ ...s, trial_ends_at: e.target.value ? new Date(e.target.value).toISOString() : null }))} />
                </div>
              )}
              <div className="space-y-2">
                <Label>Kilde</Label>
                <Input value={editSub.source || ""} onChange={e => setEditSub((s: any) => ({ ...s, source: e.target.value }))} placeholder="manual, website, sales" />
              </div>
              <div className="space-y-2">
                <Label>Notater</Label>
                <Textarea value={editSub.notes || ""} onChange={e => setEditSub((s: any) => ({ ...s, notes: e.target.value }))} rows={3} />
              </div>

              {!editSub._isNew && editSub.status === "trial" && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Trial-handlinger</p>
                  <div className="flex gap-2 mt-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => {
                      const newEnd = new Date(Date.now() + 14 * 86400000).toISOString();
                      setEditSub((s: any) => ({ ...s, trial_ends_at: newEnd }));
                      toast.info("Trial forlenget med 14 dager – husk å lagre");
                    }}>Forleng 14 dager</Button>
                    <Button type="button" size="sm" onClick={() => {
                      setEditSub((s: any) => ({ ...s, status: "active", _origStatus: s.status, billing_starts_at: new Date().toISOString() }));
                      toast.info("Status satt til aktiv – husk å lagre");
                    }}>Konverter til betalt</Button>
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={updateMutation.isPending || createMutation.isPending}>
                {(updateMutation.isPending || createMutation.isPending) ? "Lagrer..." : editSub._isNew ? "Opprett abonnement" : "Lagre endringer"}
              </Button>
            </form>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
