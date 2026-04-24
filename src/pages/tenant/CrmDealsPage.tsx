import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  Plus, TrendingUp, Loader2, Building2, List, LayoutGrid, Pencil,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { useCanDo } from "@/hooks/useCanDo";
import {
  DEAL_STAGE_LABELS, DEAL_STAGE_ORDER, DEAL_STAGE_BG,
  PIPELINE_STAGES, formatCurrency, type DealStage,
} from "@/lib/crm-labels";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

type Deal = {
  id: string; tenant_id: string; company_id: string | null; contact_id: string | null;
  title: string; stage: DealStage; value: number | null; currency: string;
  expected_close_date: string | null; owner_user_id: string | null;
  description: string | null; lost_reason: string | null; case_id: string | null;
  created_at: string; updated_at: string; closed_at: string | null;
  company_name?: string; contact_name?: string;
};

export default function CrmDealsPage() {
  const navigate = useNavigate();
  const { tenantId } = useAuth();
  const { canDo } = useCanDo();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"pipeline" | "list">("pipeline");

  const fetchAll = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    const [{ data: d }, { data: co }, { data: ct }] = await Promise.all([
      supabase.from("crm_deals").select("*").eq("tenant_id", tenantId).order("updated_at", { ascending: false }),
      supabase.from("crm_companies").select("id, name").eq("tenant_id", tenantId).order("name"),
      supabase.from("crm_contacts").select("id, first_name, last_name, company_id").eq("tenant_id", tenantId).order("first_name"),
    ]);
    const companyMap = new Map((co || []).map((x: any) => [x.id, x.name]));
    const contactMap = new Map((ct || []).map((x: any) => [x.id, `${x.first_name} ${x.last_name || ""}`.trim()]));
    setDeals((d || []).map((x: any) => ({
      ...x,
      company_name: companyMap.get(x.company_id) || null,
      contact_name: contactMap.get(x.contact_id) || null,
    })));
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (!tenantId) return;
    const ch = supabase.channel("deals-rt").on("postgres_changes", { event: "*", schema: "public", table: "crm_deals" }, () => fetchAll()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchAll, tenantId]);

  const stageDeals = (stage: DealStage) => deals.filter((d) => d.stage === stage);
  const stageTotal = (stage: DealStage) => stageDeals(stage).reduce((sum, d) => sum + (d.value || 0), 0);

  const totalPipelineValue = PIPELINE_STAGES.reduce((sum, s) => sum + stageTotal(s), 0);
  const wonValue = stageTotal("won");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Salg</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {deals.length} salg · Pipeline: {formatCurrency(totalPipelineValue)} · Vunnet: {formatCurrency(wonValue)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-border rounded-md overflow-hidden">
            <Button variant={view === "pipeline" ? "default" : "ghost"} size="sm" className="rounded-none gap-1.5" onClick={() => setView("pipeline")}>
              <LayoutGrid className="h-3.5 w-3.5" /> Pipeline
            </Button>
            <Button variant={view === "list" ? "default" : "ghost"} size="sm" className="rounded-none gap-1.5" onClick={() => setView("list")}>
              <List className="h-3.5 w-3.5" /> Liste
            </Button>
          </div>
          {canDo("deals.create") && (
            <Button onClick={() => navigate("/tenant/crm/deals/new")} className="gap-2">
              <Plus className="h-4 w-4" /> Nytt salg
            </Button>
          )}
        </div>
      </div>

      {deals.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="Ingen salg ennå"
          description="Salg representerer salgsmuligheter. Opprett et salg fra en kundeside eller legg til ett her for å starte salgsprosessen."
          actionLabel={canDo("deals.create") ? "Nytt salg" : undefined}
          onAction={canDo("deals.create") ? () => navigate("/tenant/crm/deals/new") : undefined}
          hint="Kunde → Salg → Tilbud → Jobb"
        />
      ) : view === "pipeline" ? (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {PIPELINE_STAGES.map((stage) => {
            const ds = stageDeals(stage);
            const total = stageTotal(stage);
            return (
              <div key={stage} className="flex-1 min-w-[240px] max-w-[320px]">
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: DEAL_STAGE_BG[stage] }} />
                    <span className="text-xs font-semibold uppercase tracking-wider">{DEAL_STAGE_LABELS[stage]}</span>
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5">{ds.length}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">{formatCurrency(total)}</span>
                </div>
                <div className="space-y-2 min-h-[100px] bg-muted/30 rounded-lg p-2">
                  {ds.map((d) => (
                    <Card key={d.id} className="p-3 cursor-pointer hover:shadow-md transition-shadow group relative" onClick={() => navigate(`/tenant/crm/deals/${d.id}`)}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium truncate flex-1">{d.title}</p>
                        {canDo("deals.edit") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0 text-muted-foreground hover:text-foreground -mt-0.5 -mr-0.5"
                            onClick={e => { e.stopPropagation(); navigate(`/tenant/crm/deals/${d.id}/edit`); }}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      {d.company_name && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Building2 className="h-3 w-3" /> {d.company_name}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm font-semibold text-primary">{formatCurrency(d.value)}</span>
                        {d.expected_close_date && (
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(d.expected_close_date), "d. MMM", { locale: nb })}
                          </span>
                        )}
                      </div>
                    </Card>
                  ))}
                  {canDo("deals.create") && (
                    <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground gap-1" onClick={() => navigate(`/tenant/crm/deals/new`)}>
                      <Plus className="h-3 w-3" /> Legg til
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Salg</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden md:table-cell">Kunde</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Fase</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Verdi</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden lg:table-cell">Forventet</th>
                  {canDo("deals.edit") && <th className="w-0" />}
                </tr>
              </thead>
              <tbody>
                {deals.map((d) => (
                  <tr key={d.id} className="border-b last:border-0 hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/tenant/crm/deals/${d.id}`)}>
                    <td className="py-3 px-4">
                      <p className="font-medium">{d.title}</p>
                      {d.contact_name && <p className="text-xs text-muted-foreground">{d.contact_name}</p>}
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell text-muted-foreground">{d.company_name || "–"}</td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="text-[10px]" style={{ borderColor: DEAL_STAGE_BG[d.stage] + "40", color: DEAL_STAGE_BG[d.stage] }}>
                        {DEAL_STAGE_LABELS[d.stage]}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right font-medium">{formatCurrency(d.value)}</td>
                    <td className="py-3 px-4 hidden lg:table-cell text-muted-foreground text-xs">
                      {d.expected_close_date ? format(new Date(d.expected_close_date), "d. MMM yyyy", { locale: nb }) : "–"}
                    </td>
                    {canDo("deals.edit") && (
                      <td onClick={e => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => navigate(`/tenant/crm/deals/${d.id}/edit`)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Won/Lost sections */}
      {(stageDeals("won").length > 0 || stageDeals("lost").length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stageDeals("won").length > 0 && (
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--crm-won))]" />
                <span className="text-sm font-semibold">Vunnet ({stageDeals("won").length})</span>
                <span className="text-xs text-muted-foreground ml-auto">{formatCurrency(stageTotal("won"))}</span>
              </div>
              <div className="space-y-2">
                {stageDeals("won").map((d) => (
                  <div key={d.id} className="flex items-center justify-between p-2 rounded bg-muted/30 cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/tenant/crm/deals/${d.id}`)}>
                    <span className="text-sm">{d.title}</span>
                    <span className="text-sm font-medium text-[hsl(var(--crm-won))]">{formatCurrency(d.value)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
          {stageDeals("lost").length > 0 && (
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--crm-lost))]" />
                <span className="text-sm font-semibold">Tapt ({stageDeals("lost").length})</span>
              </div>
              <div className="space-y-2">
                {stageDeals("lost").map((d) => (
                  <div key={d.id} className="flex items-center justify-between p-2 rounded bg-muted/30 cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/tenant/crm/deals/${d.id}`)}>
                    <span className="text-sm line-through text-muted-foreground">{d.title}</span>
                    <span className="text-sm text-muted-foreground">{formatCurrency(d.value)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
