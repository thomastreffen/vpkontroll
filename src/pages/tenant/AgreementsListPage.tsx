import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, FileText, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { AGREEMENT_STATUS_LABELS, AGREEMENT_STATUS_COLORS, AGREEMENT_INTERVAL_LABELS, formatDate } from "@/lib/domain-labels";

export default function AgreementsListPage() {
  const { tenantId } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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
    if (!search) return true;
    const q = search.toLowerCase();
    return a.agreement_number?.toLowerCase().includes(q) || (a.company?.name || "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Serviceavtaler</h1>
        <p className="text-sm text-muted-foreground mt-1">{items.length} avtaler totalt</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="relative max-w-sm flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Søk avtaler..." className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle statuser</SelectItem>
            {Object.entries(AGREEMENT_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        search || statusFilter !== "all" ? (
          <div className="text-center py-20"><p className="text-sm text-muted-foreground">Ingen treff</p></div>
        ) : (
          <EmptyState
            icon={FileText}
            title="Ingen serviceavtaler ennå"
            description="Serviceavtaler opprettes fra en bedrifts- eller anleggsside, og styrer automatisk generering av servicebesøk og jobber."
            hint="Bedrift → Anleggssted → Anlegg → Serviceavtale"
          />
        )
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Avtalenr</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Intervall</TableHead>
                <TableHead>Bedrift</TableHead>
                <TableHead>Anlegg</TableHead>
                <TableHead>Neste besøk</TableHead>
                <TableHead>Start</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((a) => (
                <TableRow key={a.id} className="cursor-pointer" onClick={() => navigate(`/tenant/crm/agreements/${a.id}`)}>
                  <TableCell className="font-mono text-xs">{a.agreement_number}</TableCell>
                  <TableCell><Badge variant="secondary" className={AGREEMENT_STATUS_COLORS[a.status]}>{AGREEMENT_STATUS_LABELS[a.status] || a.status}</Badge></TableCell>
                  <TableCell className="text-sm">{AGREEMENT_INTERVAL_LABELS[a.interval] || a.interval}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{a.company?.name || "–"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{a.asset ? `${a.asset.manufacturer || ""} ${a.asset.model || ""}`.trim() : "–"}</TableCell>
                  <TableCell className="text-sm font-medium">{formatDate(a.next_visit_due)}</TableCell>
                  <TableCell className="text-sm">{formatDate(a.start_date)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
