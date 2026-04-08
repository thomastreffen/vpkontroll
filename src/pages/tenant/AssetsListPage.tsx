import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Cpu, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ASSET_STATUS_LABELS, ASSET_STATUS_COLORS, ENERGY_SOURCE_LABELS, formatDate } from "@/lib/domain-labels";

export default function AssetsListPage() {
  const { tenantId } = useAuth();
  const navigate = useNavigate();
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetch = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    let q = supabase
      .from("hvac_assets")
      .select("*, site:customer_sites(name, address, city, company:crm_companies(name))")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (statusFilter !== "all") q = q.eq("status", statusFilter as any);
    const { data } = await q;
    setAssets(data || []);
    setLoading(false);
  }, [tenantId, statusFilter]);

  useEffect(() => { fetch(); }, [fetch]);

  const filtered = assets.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (a.manufacturer || "").toLowerCase().includes(q) || (a.model || "").toLowerCase().includes(q) || (a.serial_number || "").toLowerCase().includes(q) || (a.site?.company?.name || "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Anlegg</h1>
        <p className="text-sm text-muted-foreground mt-1">{assets.length} anlegg totalt</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="relative max-w-sm flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Søk anlegg..." className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle statuser</SelectItem>
            {Object.entries(ASSET_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
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
            icon={Cpu}
            title="Ingen anlegg registrert"
            description="Anlegg (varmepumper) registreres på et anleggssted under en kunde. Gå til en kundeside og legg til anleggssted først."
            hint="Kunde → Anleggssted → Anlegg"
          />
        )
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produsent / Modell</TableHead>
                <TableHead>Serienr</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Energikilde</TableHead>
                <TableHead>Kunde</TableHead>
                <TableHead>Site</TableHead>
                <TableHead>Garanti utløper</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((a) => (
                <TableRow key={a.id} className="cursor-pointer" onClick={() => navigate(`/tenant/crm/assets/${a.id}`)}>
                  <TableCell className="font-medium">{`${a.manufacturer || "–"} ${a.model || ""}`.trim()}</TableCell>
                  <TableCell className="font-mono text-xs">{a.serial_number || "–"}</TableCell>
                  <TableCell><Badge variant="secondary" className={ASSET_STATUS_COLORS[a.status]}>{ASSET_STATUS_LABELS[a.status] || a.status}</Badge></TableCell>
                  <TableCell className="text-sm">{ENERGY_SOURCE_LABELS[a.energy_source] || a.energy_source}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{a.site?.company?.name || "–"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{a.site?.name || a.site?.address || "–"}</TableCell>
                  <TableCell className="text-sm">{formatDate(a.warranty_expires_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
