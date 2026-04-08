import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClipboardList, Plus, Loader2, Pencil, ToggleLeft, ToggleRight } from "lucide-react";
import { formatDate } from "@/lib/domain-labels";
import TemplateEditorSheet from "@/components/service/TemplateEditorSheet";

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
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [categoryFilter, setCategoryFilter] = useState("all");

  const fetchTemplates = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    let q = supabase
      .from("service_templates" as any)
      .select("*")
      .eq("tenant_id", tenantId)
      .order("name");
    if (categoryFilter !== "all") q = q.eq("category", categoryFilter);
    const { data } = await q;
    setTemplates(data || []);
    setLoading(false);
  }, [tenantId, categoryFilter]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const toggleActive = async (id: string, currentActive: boolean) => {
    await supabase.from("service_templates" as any).update({ is_active: !currentActive }).eq("id", id);
    toast.success(currentActive ? "Mal deaktivert" : "Mal aktivert");
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
        <Button onClick={() => { setEditingTemplate(null); setEditorOpen(true); }}>
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
          <Button onClick={() => { setEditingTemplate(null); setEditorOpen(true); }}>
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
                <TableHead>Beskrivelse</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Opprettet</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={CATEGORY_COLORS[t.category] || ""}>
                      {CATEGORY_LABELS[t.category] || t.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[250px] truncate">{t.description || "–"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={t.is_active ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}>
                      {t.is_active ? "Aktiv" : "Inaktiv"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{formatDate(t.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingTemplate(t); setEditorOpen(true); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleActive(t.id, t.is_active)}>
                        {t.is_active ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <TemplateEditorSheet
        open={editorOpen}
        onOpenChange={setEditorOpen}
        template={editingTemplate}
        onSaved={fetchTemplates}
      />
    </div>
  );
}
