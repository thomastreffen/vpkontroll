import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { setAsDefault, clearDefault } from "@/hooks/useDefaultTemplate";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ClipboardList, Plus, Loader2, Pencil, ToggleLeft, ToggleRight, MoreHorizontal, Copy, Star, StarOff } from "lucide-react";
import { formatDate } from "@/lib/domain-labels";
import { USE_CONTEXT_LABELS } from "@/lib/template-presets";

const CATEGORY_LABELS: Record<string, string> = {
  service: "Service",
  installation: "Installasjon",
  inspection: "Befaring",
  crm: "Salg og CRM",
  web: "Nettside",
  warranty: "Garanti/reklamasjon",
};

const CATEGORY_COLORS: Record<string, string> = {
  service: "bg-emerald-500/10 text-emerald-600",
  installation: "bg-blue-500/10 text-blue-600",
  inspection: "bg-amber-500/10 text-amber-600",
  crm: "bg-violet-500/10 text-violet-600",
  warranty: "bg-destructive/10 text-destructive",
  web: "bg-cyan-500/10 text-cyan-600",
};

export default function TemplatesPage() {
  const { tenantId } = useAuth();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [contextFilter, setContextFilter] = useState("all");

  const fetchTemplates = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    let q = supabase
      .from("service_templates" as any)
      .select("*")
      .eq("tenant_id", tenantId)
      .order("name");
    if (categoryFilter !== "all") q = q.eq("category", categoryFilter);
    if (contextFilter !== "all") q = q.eq("use_context", contextFilter);
    const { data } = await q;
    setTemplates(data || []);
    setLoading(false);
  }, [tenantId, categoryFilter, contextFilter]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const toggleActive = async (e: React.MouseEvent, id: string, currentActive: boolean) => {
    e.stopPropagation();
    await supabase.from("service_templates" as any).update({ is_active: !currentActive }).eq("id", id);
    toast.success(currentActive ? "Mal deaktivert" : "Mal aktivert");
    fetchTemplates();
  };

  const handleSetDefault = async (e: React.MouseEvent, t: any) => {
    e.stopPropagation();
    if (!tenantId || !t.use_context) {
      toast.error("Malen mangler brukskontekst – sett den først i malbyggeren");
      return;
    }
    await setAsDefault(t.id, t.use_context, tenantId);
    toast.success(`Satt som standard for ${USE_CONTEXT_LABELS[t.use_context] || t.use_context}`);
    fetchTemplates();
  };

  const handleClearDefault = async (e: React.MouseEvent, t: any) => {
    e.stopPropagation();
    await clearDefault(t.id);
    toast.success("Standardmal fjernet");
    fetchTemplates();
  };

  const handleDuplicate = async (e: React.MouseEvent, t: any) => {
    e.stopPropagation();
    if (!tenantId) return;
    const { data, error } = await (supabase.from("service_templates" as any).insert({
      tenant_id: tenantId, name: t.name + " (kopi)", description: t.description,
      category: t.category, template_key: (t.template_key || "") + "_copy",
      use_context: t.use_context, is_active: false,
    }).select("id").single() as any);
    if (error) { toast.error("Kunne ikke duplisere"); return; }
    // Copy fields
    const { data: fields } = await supabase.from("service_template_fields" as any).select("*").eq("template_id", t.id).order("sort_order");
    if (fields && fields.length > 0) {
      const rows = (fields as any[]).map(f => ({
        template_id: data.id, tenant_id: tenantId, field_type: f.field_type,
        field_key: f.field_key, label: f.label, unit: f.unit, help_text: f.help_text,
        is_required: f.is_required, default_value: f.default_value, options: f.options, sort_order: f.sort_order,
      }));
      await supabase.from("service_template_fields" as any).insert(rows);
    }
    toast.success("Mal duplisert");
    fetchTemplates();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Skjemaer og maler</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Definer maler for service, installasjon, befaring, salg og mer.
          </p>
        </div>
        <Button onClick={() => navigate("/tenant/templates/new")}>
          <Plus className="h-4 w-4 mr-2" /> Ny mal
        </Button>
      </div>

      <div className="flex gap-3">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Kategori" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle kategorier</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={contextFilter} onValueChange={setContextFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Brukskontekst" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle kontekster</SelectItem>
            {Object.entries(USE_CONTEXT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center max-w-lg mx-auto">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <ClipboardList className="h-7 w-7 text-primary" />
          </div>
          <h3 className="text-lg font-semibold tracking-tight mb-1">Ingen maler ennå</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            Maler definerer sjekkpunkter, målinger og felt som brukes ved utfylling av skjemaer i systemet. Opprett din første mal for å standardisere arbeidsflyten.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full max-w-md mb-4">
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-card text-xs font-medium">
                <span className={`w-2 h-2 rounded-full ${CATEGORY_COLORS[k]?.split(" ")[0] || "bg-muted"}`} />
                {v}
              </div>
            ))}
          </div>
          <Button onClick={() => navigate("/tenant/templates/new")}>
            <Plus className="h-4 w-4 mr-2" /> Opprett første mal
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Navn</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Brukes til</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Opprettet</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((t: any) => (
                <TableRow key={t.id} className="cursor-pointer" onClick={() => navigate(`/tenant/templates/${t.id}`)}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {t.name}
                      {t.is_default && (
                        <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 text-[10px] gap-1">
                          <Star className="h-2.5 w-2.5" />Standard
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={CATEGORY_COLORS[t.category] || ""}>
                      {CATEGORY_LABELS[t.category] || t.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {t.use_context ? (
                      <Badge variant="outline" className="text-[10px]">
                        {USE_CONTEXT_LABELS[t.use_context] || t.use_context}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">–</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={t.is_active ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}>
                      {t.is_active ? "Aktiv" : "Inaktiv"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{formatDate(t.created_at)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                        <DropdownMenuItem onClick={e => { e.stopPropagation(); navigate(`/tenant/templates/${t.id}`); }}>
                          <Pencil className="h-3.5 w-3.5 mr-2" />Åpne
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={e => handleDuplicate(e, t)}>
                          <Copy className="h-3.5 w-3.5 mr-2" />Dupliser
                        </DropdownMenuItem>
                        {t.is_default ? (
                          <DropdownMenuItem onClick={e => handleClearDefault(e, t)}>
                            <StarOff className="h-3.5 w-3.5 mr-2" />Fjern som standard
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={e => handleSetDefault(e, t)}>
                            <Star className="h-3.5 w-3.5 mr-2" />Sett som standard
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={e => toggleActive(e, t.id, t.is_active)}>
                          {t.is_active ? <ToggleLeft className="h-3.5 w-3.5 mr-2" /> : <ToggleRight className="h-3.5 w-3.5 mr-2" />}
                          {t.is_active ? "Deaktiver" : "Aktiver"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
