import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Loader2, AlertTriangle, Clock, CheckCircle2, ScrollText, Building2, MapPin, TrendingUp, Plus, ClipboardCheck, Pencil } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { AGREEMENT_STATUS_LABELS, AGREEMENT_STATUS_COLORS, AGREEMENT_INTERVAL_LABELS, formatDate } from "@/lib/domain-labels";
import { formatCurrency } from "@/lib/crm-labels";
import { useCanDo } from "@/hooks/useCanDo";

type DueFilter = "all" | "overdue" | "due_soon" | "ok";

function getDueBadge(nextDue: string | null): { label: string; className: string; filter: DueFilter } {
  if (!nextDue) return { label: "–", className: "", filter: "ok" };
  const days = Math.ceil((new Date(nextDue).getTime() - Date.now()) / 86400000);
  if (days < 0) return { label: "Forfalt", className: "bg-destructive/10 text-destructive", filter: "overdue" };
  if (days <= 30) return { label: `${days}d`, className: "bg-amber-500/10 text-amber-600", filter: "due_soon" };
  return { label: `${days}d`, className: "bg-emerald-500/10 text-emerald-600", filter: "ok" };
}

export default function AgreementsListPage() {
  const { tenantId } = useAuth();
  const { canDo } = useCanDo();
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dueFilter, setDueFilter] = useState<DueFilter>("all");

  const fetch = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    let q = supabase
      .from("service_agreements")
      .select("*, company:crm_companies(name), site:customer_sites(name, address), asset:hvac_assets(manufacturer, model)")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .order("next_visit_due", { ascending: true, nullsFirst: false });
    if (statusFilter !== "all") q = q.eq("status", statusFilter as any);
    const { data } = await q;
    setItems(data || []);
    setLoading(false);
  }, [tenantId, statusFilter]);

  useEffect(() => { fetch(); }, [fetch]);

  const filtered = items.filter((a) => {
    if (search) {
      const q = search.toLowerCase();
      if (!a.agreement_number?.toLowerCase().includes(q) && !(a.company?.name || "").toLowerCase().includes(q)) return false;
    }
    if (dueFilter !== "all") {
      const due = getDueBadge(a.next_visit_due);
      if (due.filter !== dueFilter) return false;
    }
    return true;
  });

  // Stats
  const overdueCount = items.filter(a => getDueBadge(a.next_visit_due).filter === "overdue").length;
  const dueSoonCount = items.filter(a => getDueBadge(a.next_visit_due).filter === "due_soon").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Serviceavtaler</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {items.length} avtaler
            {overdueCount > 0 && <span className="text-destructive font-medium"> · {overdueCount} forfalt</span>}
            {dueSoonCount > 0 && <span className="text-amber-600 font-medium"> · {dueSoonCount} snart</span>}
          </p>
        </div>
        {canDo("agreements.create") && (
          <Button onClick={() => navigate("/tenant/crm/agreements/new")} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" /> Ny serviceavtale
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative max-w-sm flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Søk avtaler..." className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle statuser</SelectItem>
            {Object.entries(AGREEMENT_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={dueFilter} onValueChange={v => setDueFilter(v as DueFilter)}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Forfall" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle</SelectItem>
            <SelectItem value="overdue">Forfalt</SelectItem>
            <SelectItem value="due_soon">Snart (30d)</SelectItem>
            <SelectItem value="ok">OK</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        search || statusFilter !== "all" || dueFilter !== "all" ? (
          <div className="text-center py-20"><p className="text-sm text-muted-foreground">Ingen treff</p></div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center max-w-lg mx-auto">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <ScrollText className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-lg font-semibold tracking-tight mb-1">Ingen serviceavtaler ennå</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              Serviceavtaler opprettes fra en kundeside, anleggsside eller fra et vunnet salg, og styrer automatisk generering av servicebesøk og jobber.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-md">
              <button onClick={() => navigate("/tenant/crm/companies")} className="flex flex-col items-center gap-2 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors text-center">
                <Building2 className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium">Gå til kunder</span>
              </button>
              <button onClick={() => navigate("/tenant/crm/deals")} className="flex flex-col items-center gap-2 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors text-center">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium">Gå til salg</span>
              </button>
              <button onClick={() => navigate("/tenant/crm/assets")} className="flex flex-col items-center gap-2 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors text-center">
                <MapPin className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium">Gå til anlegg</span>
              </button>
            </div>
            <p className="text-xs text-muted-foreground/70 mt-4 italic">Vanlig flyt: Kunde → Anleggssted → Salg → Serviceavtale</p>
          </div>
        )
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Avtalenr</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Forfall</TableHead>
                <TableHead>Intervall</TableHead>
                <TableHead>Kunde</TableHead>
                <TableHead className="hidden md:table-cell">Anlegg</TableHead>
                <TableHead className="hidden lg:table-cell">Mal</TableHead>
                <TableHead className="hidden lg:table-cell">Årspris</TableHead>
                {canDo("agreements.edit") && <TableHead className="w-0" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((a) => {
                const due = getDueBadge(a.next_visit_due);
                return (
                  <TableRow key={a.id} className="cursor-pointer" onClick={() => navigate(`/tenant/crm/agreements/${a.id}`)}>
                    <TableCell className="font-mono text-xs">{a.agreement_number}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={AGREEMENT_STATUS_COLORS[a.status]}>
                        {AGREEMENT_STATUS_LABELS[a.status] || a.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{formatDate(a.next_visit_due)}</span>
                        {due.className && (
                          <Badge variant="outline" className={`text-[10px] ${due.className}`}>
                            {due.label}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{AGREEMENT_INTERVAL_LABELS[a.interval] || a.interval}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.company?.name || "–"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
                      {a.asset ? `${a.asset.manufacturer || ""} ${a.asset.model || ""}`.trim() : "–"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {a.service_template_id ? (
                        <Badge variant="outline" className="text-[10px] gap-1 text-emerald-600 border-emerald-200">
                          <ClipboardCheck className="h-2.5 w-2.5" />Mal
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">–</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm hidden lg:table-cell">{a.annual_price ? formatCurrency(a.annual_price) : "–"}</TableCell>
                    {canDo("agreements.edit") && (
                      <TableCell onClick={e => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => navigate(`/tenant/crm/agreements/${a.id}/edit`)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

    </div>
  );
}
