import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClipboardList, Plus, Loader2, Pencil, ToggleLeft, ToggleRight } from "lucide-react";
import { formatDate } from "@/lib/domain-labels";
import TemplateEditorSheet from "@/components/service/TemplateEditorSheet";

export default function ServiceTemplatesPage() {
  const { tenantId } = useAuth();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);

  const fetch = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    const { data } = await supabase
      .from("service_templates" as any)
      .select("*")
      .eq("tenant_id", tenantId)
      .order("name");
    setTemplates(data || []);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { fetch(); }, [fetch]);

  const toggleActive = async (id: string, currentActive: boolean) => {
    await supabase.from("service_templates" as any).update({ is_active: !currentActive }).eq("id", id);
    toast.success(currentActive ? "Mal deaktivert" : "Mal aktivert");
    fetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Servicemaler</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Definer maler for servicepunkter som brukes ved utfylling av servicerapporter.
          </p>
        </div>
        <Button onClick={() => { setEditingTemplate(null); setEditorOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Ny mal
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center max-w-md mx-auto">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <ClipboardList className="h-7 w-7 text-primary" />
          </div>
          <h3 className="text-lg font-semibold tracking-tight mb-1">Ingen servicemaler ennå</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            Servicemaler definerer sjekkpunkter, målinger og vurderinger som montøren fyller ut ved servicebesøk. Opprett din første mal for å standardisere servicerapporter.
          </p>
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
                  <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">{t.description || "–"}</TableCell>
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
        onSaved={fetch}
      />
    </div>
  );
}
