import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search } from "lucide-react";

type EntityType = "company" | "contact" | "site" | "asset" | "job" | "warranty";

interface EntityPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: EntityType;
  onSelect: (id: string) => void;
  /** Optional filter, e.g. companyId for sites/assets/contacts */
  companyId?: string;
}

const ENTITY_LABELS: Record<EntityType, string> = {
  company: "Velg kunde",
  contact: "Velg kontaktperson",
  site: "Velg anlegg/site",
  asset: "Velg varmepumpe",
  job: "Velg jobb",
  warranty: "Velg garantisak",
};

type Result = { id: string; label: string; sub: string };

export function EntityPickerDialog({
  open,
  onOpenChange,
  entityType,
  onSelect,
  companyId,
}: EntityPickerDialogProps) {
  const { tenantId } = useAuth();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !tenantId) return;
    setSearch("");
    fetchResults("");
  }, [open, tenantId, entityType]);

  const fetchResults = async (q: string) => {
    if (!tenantId) return;
    setLoading(true);
    const lq = `%${q}%`;

    try {
      let items: Result[] = [];

      if (entityType === "company") {
        const { data } = await supabase
          .from("crm_companies")
          .select("id, name, org_number, city")
          .eq("tenant_id", tenantId)
          .is("deleted_at", null)
          .or(`name.ilike.${lq},org_number.ilike.${lq}`)
          .order("name")
          .limit(50);
        items = (data || []).map((c) => ({
          id: c.id,
          label: c.name,
          sub: [c.org_number, c.city].filter(Boolean).join(" · "),
        }));
      } else if (entityType === "site") {
        let query = supabase
          .from("customer_sites")
          .select("id, name, address, city, company_id")
          .eq("tenant_id", tenantId)
          .is("deleted_at", null)
          .order("name")
          .limit(50);
        if (companyId) query = query.eq("company_id", companyId);
        if (q) query = query.or(`name.ilike.${lq},address.ilike.${lq}`);
        const { data } = await query;
        items = (data || []).map((s) => ({
          id: s.id,
          label: s.name || s.address || "Uten navn",
          sub: [s.address, s.city].filter(Boolean).join(", "),
        }));
      } else if (entityType === "asset") {
        let query = supabase
          .from("hvac_assets")
          .select("id, manufacturer, model, serial_number, site_id")
          .eq("tenant_id", tenantId)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(50);
        if (q) query = query.or(`manufacturer.ilike.${lq},model.ilike.${lq},serial_number.ilike.${lq}`);
        const { data } = await query;
        items = (data || []).map((a) => ({
          id: a.id,
          label: [a.manufacturer, a.model].filter(Boolean).join(" ") || "Ukjent",
          sub: a.serial_number || "",
        }));
      } else if (entityType === "job") {
        let query = supabase
          .from("jobs")
          .select("id, job_number, title, status")
          .eq("tenant_id", tenantId)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(50);
        if (q) query = query.or(`job_number.ilike.${lq},title.ilike.${lq}`);
        const { data } = await query;
        items = (data || []).map((j) => ({
          id: j.id,
          label: `${j.job_number} — ${j.title}`,
          sub: j.status,
        }));
      } else if (entityType === "warranty") {
        let query = supabase
          .from("warranty_cases")
          .select("id, warranty_number, issue_description, status")
          .eq("tenant_id", tenantId)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(50);
        if (q) query = query.or(`warranty_number.ilike.${lq},issue_description.ilike.${lq}`);
        const { data } = await query;
        items = (data || []).map((w) => ({
          id: w.id,
          label: w.warranty_number,
          sub: (w.issue_description || "").slice(0, 60),
        }));
      }

      setResults(items);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (val: string) => {
    setSearch(val);
    fetchResults(val);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{ENTITY_LABELS[entityType]}</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Søk..."
            className="pl-9"
            autoFocus
          />
        </div>
        <ScrollArea className="max-h-72">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-6">Laster...</p>
          ) : results.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Ingen treff</p>
          ) : (
            <div className="space-y-1">
              {results.map((r) => (
                <button
                  key={r.id}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-muted/50 transition-colors"
                  onClick={() => {
                    onSelect(r.id);
                    onOpenChange(false);
                  }}
                >
                  <p className="text-sm font-medium truncate">{r.label}</p>
                  {r.sub && <p className="text-xs text-muted-foreground truncate">{r.sub}</p>}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
