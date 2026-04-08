import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, ShieldAlert, Loader2 } from "lucide-react";
import { WARRANTY_STATUS_LABELS, WARRANTY_STATUS_COLORS, formatDate } from "@/lib/domain-labels";

export default function WarrantyListPage() {
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
      .from("warranty_cases")
      .select("*, company:crm_companies(name), asset:hvac_assets(manufacturer, model)")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (statusFilter !== "all") q = q.eq("status", statusFilter);
    const { data } = await q;
    setItems(data || []);
    setLoading(false);
  }, [tenantId, statusFilter]);

  useEffect(() => { fetch(); }, [fetch]);

  const filtered = items.filter((w) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (w.warranty_number || "").toLowerCase().includes(q) || (w.company?.name || "").toLowerCase().includes(q) || (w.manufacturer_ref || "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Garantisaker</h1>
        <p className="text-sm text-muted-foreground mt-1">{items.length} saker totalt</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="relative max-w-sm flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Søk garantisaker..." className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle statuser</SelectItem>
            {Object.entries(WARRANTY_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <ShieldAlert className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">{search || statusFilter !== "all" ? "Ingen treff" : "Ingen garantisaker ennå"}</p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Saksnr</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Bedrift</TableHead>
                <TableHead>Anlegg</TableHead>
                <TableHead>Produsentreferanse</TableHead>
                <TableHead>Opprettet</TableHead>
                <TableHead>Løst</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((w) => (
                <TableRow key={w.id} className="cursor-pointer" onClick={() => navigate(`/tenant/crm/warranty/${w.id}`)}>
                  <TableCell className="font-mono text-xs">{w.warranty_number}</TableCell>
                  <TableCell><Badge variant="secondary" className={WARRANTY_STATUS_COLORS[w.status]}>{WARRANTY_STATUS_LABELS[w.status] || w.status}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{w.company?.name || "–"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{w.asset ? `${w.asset.manufacturer || ""} ${w.asset.model || ""}`.trim() : "–"}</TableCell>
                  <TableCell className="text-sm">{w.manufacturer_ref || "–"}</TableCell>
                  <TableCell className="text-sm">{formatDate(w.created_at)}</TableCell>
                  <TableCell className="text-sm">{formatDate(w.resolved_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
