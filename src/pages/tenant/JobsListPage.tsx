import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCanDo } from "@/hooks/useCanDo";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Briefcase, Loader2, Plus, Pencil } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { JOB_STATUS_LABELS, JOB_STATUS_COLORS, JOB_TYPE_LABELS, formatDate } from "@/lib/domain-labels";

export default function JobsListPage() {
  const { tenantId } = useAuth();
  const { canDo } = useCanDo();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetch = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    let q = supabase
      .from("jobs")
      .select("*, company:crm_companies(name), site:customer_sites(name, address, city), asset:hvac_assets(manufacturer, model)")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (statusFilter !== "all") q = q.eq("status", statusFilter as any);
    const { data } = await q;
    setJobs(data || []);
    setLoading(false);
  }, [tenantId, statusFilter]);

  useEffect(() => { fetch(); }, [fetch]);

  const filtered = jobs.filter((j) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return j.job_number?.toLowerCase().includes(q) || j.title?.toLowerCase().includes(q) || j.company?.name?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Jobber</h1>
          <p className="text-sm text-muted-foreground mt-1">{jobs.length} jobber totalt</p>
        </div>
        {canDo("jobs.create") && (
          <Button onClick={() => navigate("/tenant/crm/jobs/new")} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" />Ny jobb
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="relative max-w-sm flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Søk jobber..." className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle statuser</SelectItem>
            {Object.entries(JOB_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
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
            icon={Briefcase}
            title="Ingen jobber ennå"
            description="Jobber opprettes fra en deal når salget er vunnet, eller direkte fra en garantisak. Du kan også opprette en jobb manuelt."
            hint="Deal → Jobb, eller Garantisak → Jobb"
            actionLabel={canDo("jobs.create") ? "Ny jobb" : undefined}
            onAction={canDo("jobs.create") ? () => navigate("/tenant/crm/jobs/new") : undefined}
          />
        )
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Jobbnr</TableHead>
                <TableHead>Tittel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Kunde</TableHead>
                <TableHead>Anlegg</TableHead>
                <TableHead>Planlagt start</TableHead>
                {canDo("jobs.edit") && <TableHead className="w-0" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((j) => (
                <TableRow key={j.id} className="cursor-pointer" onClick={() => navigate(`/tenant/crm/jobs/${j.id}`)}>
                  <TableCell className="font-mono text-xs">{j.job_number}</TableCell>
                  <TableCell className="font-medium max-w-[200px] truncate">{j.title}</TableCell>
                  <TableCell><Badge variant="secondary" className={JOB_STATUS_COLORS[j.status]}>{JOB_STATUS_LABELS[j.status] || j.status}</Badge></TableCell>
                  <TableCell className="text-sm">{JOB_TYPE_LABELS[j.job_type] || j.job_type}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{j.company?.name || "–"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{j.asset ? `${j.asset.manufacturer || ""} ${j.asset.model || ""}`.trim() : "–"}</TableCell>
                  <TableCell className="text-sm">{formatDate(j.scheduled_start)}</TableCell>
                  {canDo("jobs.edit") && (
                    <TableCell onClick={e => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => navigate(`/tenant/crm/jobs/${j.id}/edit`)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
