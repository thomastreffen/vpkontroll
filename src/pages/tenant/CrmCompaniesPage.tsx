import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Building2, Phone, Mail, Loader2, FileUp, ChevronRight } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CUSTOMER_TYPE_LABELS, CUSTOMER_TYPE_COLORS } from "@/lib/domain-labels";
import { useCanDo } from "@/hooks/useCanDo";
import { cn } from "@/lib/utils";

type Company = {
  id: string; tenant_id: string; name: string; org_number: string | null;
  industry: string | null; website: string | null; phone: string | null;
  email: string | null; address: string | null; city: string | null;
  postal_code: string | null; country: string | null; notes: string | null;
  created_at: string; customer_type?: string;
  active_agreements: number; open_deals: number; active_jobs: number;
};

const TYPE_FILTERS = [
  { value: "all", label: "Alle" },
  ...Object.entries(CUSTOMER_TYPE_LABELS).map(([value, label]) => ({ value, label })),
];

function countByCompany(rows: { company_id: string }[]): Record<string, number> {
  return rows.reduce((acc, r) => {
    acc[r.company_id] = (acc[r.company_id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

export default function CrmCompaniesPage() {
  const { tenantId } = useAuth();
  const { canDo } = useCanDo();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const fetchData = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    const [companiesRes, agreeRes, dealsRes, jobsRes] = await Promise.all([
      supabase.from("crm_companies").select("*").eq("tenant_id", tenantId).order("name"),
      supabase.from("service_agreements").select("company_id").eq("tenant_id", tenantId).eq("status", "active").is("deleted_at", null),
      supabase.from("crm_deals").select("company_id").eq("tenant_id", tenantId).not("stage", "in", "(won,lost)").is("deleted_at", null),
      supabase.from("jobs").select("company_id").eq("tenant_id", tenantId).not("status", "in", "(completed,cancelled)").is("deleted_at", null),
    ]);
    const agreeCounts = countByCompany((agreeRes.data || []) as any);
    const dealCounts = countByCompany((dealsRes.data || []) as any);
    const jobCounts = countByCompany((jobsRes.data || []) as any);
    setCompanies(
      ((companiesRes.data || []) as any[]).map(c => ({
        ...c,
        active_agreements: agreeCounts[c.id] || 0,
        open_deals: dealCounts[c.id] || 0,
        active_jobs: jobCounts[c.id] || 0,
      })) as Company[]
    );
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = companies.filter((c) => {
    if (typeFilter !== "all" && c.customer_type !== typeFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.city || "").toLowerCase().includes(q) ||
      (c.phone || "").includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.org_number || "").includes(q)
    );
  });

  return (
    <div className="space-y-5">
      {/* Topprad */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-[Lexend]">Kunder</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{companies.length} kunder totalt</p>
        </div>
        {canDo("companies.create") && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/tenant/crm/customers/import")} className="gap-2 h-9">
              <FileUp className="h-4 w-4" /> Importer
            </Button>
            <Button onClick={() => navigate("/tenant/crm/companies/new")} className="gap-2 h-9">
              <Plus className="h-4 w-4" /> Ny kunde
            </Button>
          </div>
        )}
      </div>

      {/* Søk + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Søk navn, by, tlf, epost..."
            className="pl-9 h-9"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {TYPE_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setTypeFilter(f.value)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                typeFilter === f.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-primary/40"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        search || typeFilter !== "all" ? (
          <div className="text-center py-20">
            <p className="text-sm text-muted-foreground">Ingen treff</p>
          </div>
        ) : (
          <EmptyState
            icon={Building2}
            title="Ingen kunder ennå"
            description="Start med å legge til din første kunde. Kunden er utgangspunktet for kontaktpersoner, anlegg, salg og jobber."
            actionLabel={canDo("companies.create") ? "Ny kunde" : undefined}
            onAction={canDo("companies.create") ? () => navigate("/tenant/crm/companies/new") : undefined}
            hint="Kunde → Kontaktperson → Anleggssted → Anlegg → Salg → Jobb"
          />
        )
      ) : (
        <div className="rounded-xl border border-border overflow-hidden bg-card">
          <div className="px-5 py-2.5 border-b border-border bg-muted/30 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? "kunde" : "kunder"}
              {typeFilter !== "all" && ` · ${CUSTOMER_TYPE_LABELS[typeFilter]}`}
            </span>
          </div>
          {filtered.map((c) => (
            <div
              key={c.id}
              className="flex items-center px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/30 cursor-pointer group transition-colors"
              onClick={() => navigate(`/tenant/crm/companies/${c.id}`)}
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {c.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0 ml-3">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">{c.name}</p>
                  {c.customer_type && (
                    <span className={cn(
                      "inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium shrink-0",
                      CUSTOMER_TYPE_COLORS[c.customer_type] || "bg-muted text-muted-foreground"
                    )}>
                      {CUSTOMER_TYPE_LABELS[c.customer_type] || c.customer_type}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                  {c.city && <span>{c.postal_code} {c.city}</span>}
                  {c.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />{c.phone}
                    </span>
                  )}
                  {c.email && (
                    <span className="hidden md:flex items-center gap-1 max-w-[200px] truncate">
                      <Mail className="h-3 w-3 shrink-0" />{c.email}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 ml-4 shrink-0">
                {c.active_agreements > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    {c.active_agreements} avtale{c.active_agreements !== 1 ? "r" : ""}
                  </span>
                )}
                {c.open_deals > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
                    {c.open_deals} salg
                  </span>
                )}
                {c.active_jobs > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                    {c.active_jobs} jobb{c.active_jobs !== 1 ? "er" : ""}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 ml-3 shrink-0">
                {canDo("companies.edit") && (
                  <button
                    className="hidden group-hover:flex items-center h-7 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                    onClick={(e) => { e.stopPropagation(); navigate(`/tenant/crm/companies/${c.id}/edit`); }}
                  >
                    Rediger
                  </button>
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
