import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Plus, TrendingUp, Loader2, DollarSign, Calendar, User, Building2,
  GripVertical, List, LayoutGrid,
} from "lucide-react";
import {
  DEAL_STAGE_LABELS, DEAL_STAGE_ORDER, DEAL_STAGE_BG,
  PIPELINE_STAGES, formatCurrency, type DealStage,
} from "@/lib/crm-labels";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

type Deal = {
  id: string; tenant_id: string; company_id: string | null; contact_id: string | null;
  title: string; stage: DealStage; value: number | null; currency: string;
  expected_close_date: string | null; owner_user_id: string | null;
  description: string | null; lost_reason: string | null; case_id: string | null;
  created_at: string; updated_at: string; closed_at: string | null;
  company_name?: string; contact_name?: string;
};

type Company = { id: string; name: string };
type Contact = { id: string; first_name: string; last_name: string | null; company_id: string | null };

export default function CrmDealsPage() {
  const navigate = useNavigate();
  const { tenantId, user } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"pipeline" | "list">("pipeline");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDeal, setEditDeal] = useState<Deal | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "", stage: "lead" as DealStage, value: "", company_id: "", contact_id: "",
    expected_close_date: "", description: "",
  });

  const fetchAll = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    const [{ data: d }, { data: co }, { data: ct }] = await Promise.all([
      supabase.from("crm_deals").select("*").eq("tenant_id", tenantId).order("updated_at", { ascending: false }),
      supabase.from("crm_companies").select("id, name").eq("tenant_id", tenantId).order("name"),
      supabase.from("crm_contacts").select("id, first_name, last_name, company_id").eq("tenant_id", tenantId).order("first_name"),
    ]);
    const companyMap = new Map((co || []).map((x: any) => [x.id, x.name]));
    const contactMap = new Map((ct || []).map((x: any) => [x.id, `${x.first_name} ${x.last_name || ""}`.trim()]));
    setDeals((d || []).map((x: any) => ({
      ...x,
      company_name: companyMap.get(x.company_id) || null,
      contact_name: contactMap.get(x.contact_id) || null,
    })));
    setCompanies((co || []) as Company[]);
    setContacts((ct || []) as Contact[]);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Realtime
  useEffect(() => {
    if (!tenantId) return;
    const ch = supabase.channel("deals-rt").on("postgres_changes", { event: "*", schema: "public", table: "crm_deals" }, () => fetchAll()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchAll, tenantId]);

  const openNew = (stage?: DealStage) => {
    setEditDeal(null);
    setForm({ title: "", stage: stage || "lead", value: "", company_id: "", contact_id: "", expected_close_date: "", description: "" });
    setDialogOpen(true);
  };

  const openEdit = (d: Deal) => {
    setEditDeal(d);
    setForm({
      title: d.title, stage: d.stage, value: d.value?.toString() || "",
      company_id: d.company_id || "", contact_id: d.contact_id || "",
      expected_close_date: d.expected_close_date || "", description: d.description || "",
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!tenantId || !form.title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        tenant_id: tenantId, title: form.title.trim(), stage: form.stage,
        value: form.value ? parseFloat(form.value) : null,
        company_id: form.company_id || null, contact_id: form.contact_id || null,
        expected_close_date: form.expected_close_date || null,
        description: form.description || null,
        closed_at: (form.stage === "won" || form.stage === "lost") ? new Date().toISOString() : null,
      };
      if (editDeal) {
        await supabase.from("crm_deals").update(payload as any).eq("id", editDeal.id);
        toast.success("Deal oppdatert");
      } else {
        await supabase.from("crm_deals").insert({ ...payload, created_by: user?.id, owner_user_id: user?.id } as any);
        toast.success("Deal opprettet");
      }
      setDialogOpen(false);
      fetchAll();
    } catch { toast.error("Kunne ikke lagre"); }
    finally { setSaving(false); }
  };

  const moveStage = async (dealId: string, newStage: DealStage) => {
    await supabase.from("crm_deals").update({
      stage: newStage,
      closed_at: (newStage === "won" || newStage === "lost") ? new Date().toISOString() : null,
    } as any).eq("id", dealId);
    fetchAll();
  };

  const stageDeals = (stage: DealStage) => deals.filter((d) => d.stage === stage);
  const stageTotal = (stage: DealStage) => stageDeals(stage).reduce((sum, d) => sum + (d.value || 0), 0);

  const totalPipelineValue = PIPELINE_STAGES.reduce((sum, s) => sum + stageTotal(s), 0);
  const wonValue = stageTotal("won");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Deals</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {deals.length} deals · Pipeline: {formatCurrency(totalPipelineValue)} · Vunnet: {formatCurrency(wonValue)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-border rounded-md overflow-hidden">
            <Button variant={view === "pipeline" ? "default" : "ghost"} size="sm" className="rounded-none gap-1.5" onClick={() => setView("pipeline")}>
              <LayoutGrid className="h-3.5 w-3.5" /> Pipeline
            </Button>
            <Button variant={view === "list" ? "default" : "ghost"} size="sm" className="rounded-none gap-1.5" onClick={() => setView("list")}>
              <List className="h-3.5 w-3.5" /> Liste
            </Button>
          </div>
          <Button onClick={() => openNew()} className="gap-2">
            <Plus className="h-4 w-4" /> Ny deal
          </Button>
        </div>
      </div>

      {deals.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="Ingen deals ennå"
          description="Deals representerer salgsmuligheter. Opprett en deal fra en bedriftsside eller legg til en ny her for å starte salgsprosessen."
          actionLabel="Ny deal"
          onAction={() => openNew()}
          hint="Bedrift → Deal → Tilbud → Jobb"
        />
      ) : view === "pipeline" ? (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {PIPELINE_STAGES.map((stage) => {
            const ds = stageDeals(stage);
            const total = stageTotal(stage);
            return (
              <div key={stage} className="flex-1 min-w-[240px] max-w-[320px]">
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: DEAL_STAGE_BG[stage] }} />
                    <span className="text-xs font-semibold uppercase tracking-wider">{DEAL_STAGE_LABELS[stage]}</span>
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5">{ds.length}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">{formatCurrency(total)}</span>
                </div>
                <div className="space-y-2 min-h-[100px] bg-muted/30 rounded-lg p-2">
                  {ds.map((d) => (
                    <Card key={d.id} className="p-3 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/tenant/crm/deals/${d.id}`)}>
                      <p className="text-sm font-medium truncate">{d.title}</p>
                      {d.company_name && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Building2 className="h-3 w-3" /> {d.company_name}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm font-semibold text-primary">{formatCurrency(d.value)}</span>
                        {d.expected_close_date && (
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(d.expected_close_date), "d. MMM", { locale: nb })}
                          </span>
                        )}
                      </div>
                    </Card>
                  ))}
                  <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground gap-1" onClick={() => openNew(stage)}>
                    <Plus className="h-3 w-3" /> Legg til
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Deal</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden md:table-cell">Bedrift</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Fase</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Verdi</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden lg:table-cell">Forventet</th>
                </tr>
              </thead>
              <tbody>
                {deals.map((d) => (
                  <tr key={d.id} className="border-b last:border-0 hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/tenant/crm/deals/${d.id}`)}>
                    <td className="py-3 px-4">
                      <p className="font-medium">{d.title}</p>
                      {d.contact_name && <p className="text-xs text-muted-foreground">{d.contact_name}</p>}
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell text-muted-foreground">{d.company_name || "–"}</td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="text-[10px]" style={{ borderColor: DEAL_STAGE_BG[d.stage] + "40", color: DEAL_STAGE_BG[d.stage] }}>
                        {DEAL_STAGE_LABELS[d.stage]}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right font-medium">{formatCurrency(d.value)}</td>
                    <td className="py-3 px-4 hidden lg:table-cell text-muted-foreground text-xs">
                      {d.expected_close_date ? format(new Date(d.expected_close_date), "d. MMM yyyy", { locale: nb }) : "–"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Won/Lost sections */}
      {(stageDeals("won").length > 0 || stageDeals("lost").length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stageDeals("won").length > 0 && (
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--crm-won))]" />
                <span className="text-sm font-semibold">Vunnet ({stageDeals("won").length})</span>
                <span className="text-xs text-muted-foreground ml-auto">{formatCurrency(stageTotal("won"))}</span>
              </div>
              <div className="space-y-2">
                {stageDeals("won").map((d) => (
                   <div key={d.id} className="flex items-center justify-between p-2 rounded bg-muted/30 cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/tenant/crm/deals/${d.id}`)}>
                    <span className="text-sm">{d.title}</span>
                    <span className="text-sm font-medium text-[hsl(var(--crm-won))]">{formatCurrency(d.value)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
          {stageDeals("lost").length > 0 && (
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--crm-lost))]" />
                <span className="text-sm font-semibold">Tapt ({stageDeals("lost").length})</span>
              </div>
              <div className="space-y-2">
                {stageDeals("lost").map((d) => (
                  <div key={d.id} className="flex items-center justify-between p-2 rounded bg-muted/30 cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/tenant/crm/deals/${d.id}`)}>
                    <span className="text-sm line-through text-muted-foreground">{d.title}</span>
                    <span className="text-sm text-muted-foreground">{formatCurrency(d.value)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Deal Sheet */}
      <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editDeal ? "Rediger deal" : "Ny deal"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label>Tittel *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="F.eks. Daikin Altherma installasjon" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Fase</Label>
                <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v as DealStage })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEAL_STAGE_ORDER.map((s) => (
                      <SelectItem key={s} value={s}>{DEAL_STAGE_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Verdi (NOK)</Label>
                <Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="150000" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Bedrift</Label>
                <Select value={form.company_id} onValueChange={(v) => setForm({ ...form, company_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Velg bedrift" /></SelectTrigger>
                  <SelectContent>
                    {companies.map((co) => (
                      <SelectItem key={co.id} value={co.id}>{co.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Kontakt</Label>
                <Select value={form.contact_id} onValueChange={(v) => setForm({ ...form, contact_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Velg kontakt" /></SelectTrigger>
                  <SelectContent>
                    {contacts.map((ct) => (
                      <SelectItem key={ct.id} value={ct.id}>{ct.first_name} {ct.last_name || ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Forventet lukkedato</Label>
              <Input type="date" value={form.expected_close_date} onChange={(e) => setForm({ ...form, expected_close_date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Beskrivelse</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Detaljer om dealen..." />
            </div>
          </div>
          <SheetFooter className="flex flex-row justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Avbryt</Button>
            <Button onClick={save} disabled={saving || !form.title.trim()}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editDeal ? "Lagre" : "Opprett"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
