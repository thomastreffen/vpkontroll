import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Clock, AlertTriangle, CheckCircle2, ArrowRight, CalendarPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

function daysUntil(date: string | null): number | null {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function TrialsPage() {
  const qc = useQueryClient();

  const { data: trials, isLoading } = useQuery({
    queryKey: ["active_trials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_subscriptions")
        .select("*, saas_plans(*), tenants(*)")
        .eq("status", "trial")
        .order("trial_ends_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: recentConverted } = useQuery({
    queryKey: ["recent_conversions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_subscriptions")
        .select("*, saas_plans(*), tenants(*)")
        .eq("status", "active")
        .not("converted_at", "is", null)
        .order("converted_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const extendMutation = useMutation({
    mutationFn: async ({ id, days }: { id: string; days: number }) => {
      const sub = trials?.find(t => t.id === id);
      const currentEnd = sub?.trial_ends_at ? new Date(sub.trial_ends_at) : new Date();
      const newEnd = new Date(Math.max(currentEnd.getTime(), Date.now()) + days * 86400000);
      const { error } = await supabase.from("tenant_subscriptions").update({ trial_ends_at: newEnd.toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["active_trials"] }); toast.success("Trial forlenget"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const convertMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tenant_subscriptions").update({
        status: "active" as any,
        converted_at: new Date().toISOString(),
        billing_starts_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["active_trials"] });
      qc.invalidateQueries({ queryKey: ["recent_conversions"] });
      toast.success("Konvertert til betalt");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const expiring = trials?.filter(t => {
    const d = daysUntil(t.trial_ends_at);
    return d !== null && d <= 7;
  }) || [];

  const healthy = trials?.filter(t => {
    const d = daysUntil(t.trial_ends_at);
    return d === null || d > 7;
  }) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Trials</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{trials?.length || 0} aktive prøveperioder</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50"><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30"><Clock className="w-4 h-4 text-yellow-600" /></div>
          <div><p className="text-xl font-bold">{trials?.length || 0}</p><p className="text-xs text-muted-foreground">Aktive trials</p></div>
        </CardContent></Card>
        <Card className={cn("border-border/50", expiring.length > 0 && "border-orange-300")}><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30"><AlertTriangle className="w-4 h-4 text-orange-600" /></div>
          <div><p className="text-xl font-bold">{expiring.length}</p><p className="text-xs text-muted-foreground">Utløper snart (≤7d)</p></div>
        </CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent/10"><CheckCircle2 className="w-4 h-4 text-accent" /></div>
          <div><p className="text-xl font-bold">{recentConverted?.length || 0}</p><p className="text-xs text-muted-foreground">Nylig konvertert</p></div>
        </CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted"><CalendarPlus className="w-4 h-4 text-muted-foreground" /></div>
          <div><p className="text-xl font-bold">–</p><p className="text-xs text-muted-foreground">Snitt konvertering</p></div>
        </CardContent></Card>
      </div>

      {/* Expiring soon */}
      {expiring.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2 text-orange-700 dark:text-orange-400">
            <AlertTriangle className="w-4 h-4" /> Utløper snart
          </h2>
          {expiring.map((s: any) => {
            const days = daysUntil(s.trial_ends_at)!;
            return (
              <Card key={s.id} className="border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center text-orange-700 text-sm font-bold shrink-0">
                        {(s.tenants?.name || "?").substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{s.tenants?.name}</p>
                        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                          <span>{s.saas_plans?.name}</span>
                          <span>·</span>
                          <span className="font-semibold text-orange-700 dark:text-orange-400">
                            {days <= 0 ? "Utløpt!" : `${days} dager igjen`}
                          </span>
                          <span>·</span>
                          <span>Utløper {new Date(s.trial_ends_at).toLocaleDateString("nb-NO")}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => extendMutation.mutate({ id: s.id, days: 14 })}
                        disabled={extendMutation.isPending}>Forleng</Button>
                      <Button size="sm" onClick={() => convertMutation.mutate(s.id)}
                        disabled={convertMutation.isPending}>Konverter</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Active trials */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Aktive trials</h2>
        {isLoading ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">Laster...</CardContent></Card>
        ) : !healthy.length && !expiring.length ? (
          <Card><CardContent className="p-12 text-center">
            <Clock className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Ingen aktive trials</p>
          </CardContent></Card>
        ) : healthy.map((s: any) => {
          const days = daysUntil(s.trial_ends_at);
          return (
            <Card key={s.id} className="border-border/50 hover:border-border transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                      {(s.tenants?.name || "?").substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{s.tenants?.name}</p>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                        <span>{s.saas_plans?.name}</span>
                        {days !== null && <><span>·</span><span>{days} dager igjen</span></>}
                        <span>·</span>
                        <span>Startet {new Date(s.started_at).toLocaleDateString("nb-NO")}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => extendMutation.mutate({ id: s.id, days: 14 })}
                      disabled={extendMutation.isPending}>Forleng</Button>
                    <Button size="sm" variant="ghost" onClick={() => convertMutation.mutate(s.id)}
                      disabled={convertMutation.isPending}>Konverter</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent conversions */}
      {(recentConverted?.length ?? 0) > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2 text-accent">
            <CheckCircle2 className="w-4 h-4" /> Nylig konvertert
          </h2>
          {recentConverted?.map((s: any) => (
            <Card key={s.id} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent text-xs font-bold">
                      {(s.tenants?.name || "?").substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{s.tenants?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.saas_plans?.name} · Konvertert {new Date(s.converted_at).toLocaleDateString("nb-NO")}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20 text-[10px]">Aktiv</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
