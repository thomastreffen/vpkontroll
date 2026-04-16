import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Plus, Pencil, Package, Users, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const ALL_MODULES = ["crm", "postkontoret", "ressursplanlegger"] as const;
const moduleLabels: Record<string, string> = {
  crm: "CRM", postkontoret: "Postkontoret", ressursplanlegger: "Ressursplanlegger",
};

interface PlanForm {
  name: string;
  slug: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  trial_days: number;
  included_modules: string[];
  max_users: number | null;
  is_active: boolean;
  is_visible: boolean;
  sort_order: number;
}

const emptyForm: PlanForm = {
  name: "", slug: "", description: "", price_monthly: 0, price_yearly: 0,
  trial_days: 14, included_modules: ["crm"], max_users: null, is_active: true,
  is_visible: true, sort_order: 0,
};

export default function PlansPage() {
  const qc = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PlanForm>(emptyForm);

  const { data: plans, isLoading } = useQuery({
    queryKey: ["saas_plans"],
    queryFn: async () => {
      const { data, error } = await supabase.from("saas_plans").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: subCounts } = useQuery({
    queryKey: ["sub_counts_by_plan"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenant_subscriptions").select("plan_id, status");
      if (error) throw error;
      const counts: Record<string, { total: number; trial: number; active: number }> = {};
      data?.forEach((s) => {
        if (!counts[s.plan_id]) counts[s.plan_id] = { total: 0, trial: 0, active: 0 };
        counts[s.plan_id].total++;
        if (s.status === "trial") counts[s.plan_id].trial++;
        if (s.status === "active") counts[s.plan_id].active++;
      });
      return counts;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const slug = form.slug || form.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const payload = { ...form, slug, max_users: form.max_users || null };
      if (editingId) {
        const { error } = await supabase.from("saas_plans").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("saas_plans").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saas_plans"] });
      toast.success(editingId ? "Plan oppdatert" : "Plan opprettet");
      setSheetOpen(false);
      setEditingId(null);
      setForm(emptyForm);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openEdit = (p: any) => {
    setEditingId(p.id);
    setForm({
      name: p.name, slug: p.slug, description: p.description || "",
      price_monthly: p.price_monthly, price_yearly: p.price_yearly,
      trial_days: p.trial_days, included_modules: p.included_modules || [],
      max_users: p.max_users, is_active: p.is_active, is_visible: p.is_visible,
      sort_order: p.sort_order,
    });
    setSheetOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Planer</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Pakker og prismodeller for VPKontroll</p>
        </div>
        <Button onClick={() => { setEditingId(null); setForm(emptyForm); setSheetOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Ny plan
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <Card className="col-span-full"><CardContent className="p-8 text-center text-muted-foreground">Laster...</CardContent></Card>
        ) : !plans?.length ? (
          <Card className="col-span-full"><CardContent className="p-12 text-center">
            <Package className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Ingen planer opprettet ennå</p>
          </CardContent></Card>
        ) : plans.map((p) => {
          const counts = subCounts?.[p.id] || { total: 0, trial: 0, active: 0 };
          return (
            <Card key={p.id} className={cn("border-border/50 relative", !p.is_active && "opacity-60")}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{p.name}</CardTitle>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">{p.description}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="text-2xl font-bold">{p.price_monthly?.toLocaleString("nb-NO")} kr</span>
                  <span className="text-sm text-muted-foreground"> /mnd</span>
                  {p.price_yearly > 0 && (
                    <p className="text-xs text-muted-foreground">{p.price_yearly?.toLocaleString("nb-NO")} kr/år</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {(p.included_modules as string[] || []).map((m: string) => (
                    <Badge key={m} variant="secondary" className="text-[10px]">{moduleLabels[m] || m}</Badge>
                  ))}
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-border/50">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {p.trial_days}d trial</span>
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {p.max_users || "∞"} brukere</span>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <Badge variant="outline" className={counts.active > 0 ? "bg-accent/10 text-accent border-accent/20" : ""}>
                    {counts.active} aktive
                  </Badge>
                  <Badge variant="outline" className={counts.trial > 0 ? "bg-yellow-50 text-yellow-700 border-yellow-200" : ""}>
                    {counts.trial} trial
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  {!p.is_active && <Badge variant="destructive" className="text-[10px]">Inaktiv</Badge>}
                  {!p.is_visible && <Badge variant="outline" className="text-[10px]">Skjult</Badge>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Sheet open={sheetOpen} onOpenChange={(o) => { setSheetOpen(o); if (!o) { setEditingId(null); setForm(emptyForm); } }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>{editingId ? "Rediger plan" : "Ny plan"}</SheetTitle></SheetHeader>
          <form className="space-y-5 mt-6" onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }}>
            <div className="space-y-2">
              <Label>Navn *</Label>
              <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input value={form.slug} onChange={(e) => setForm(f => ({ ...f, slug: e.target.value }))}
                placeholder={form.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")} />
            </div>
            <div className="space-y-2">
              <Label>Beskrivelse</Label>
              <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pris/mnd (NOK)</Label>
                <Input type="number" value={form.price_monthly} onChange={(e) => setForm(f => ({ ...f, price_monthly: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Pris/år (NOK)</Label>
                <Input type="number" value={form.price_yearly} onChange={(e) => setForm(f => ({ ...f, price_yearly: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Trial-dager</Label>
                <Input type="number" value={form.trial_days} onChange={(e) => setForm(f => ({ ...f, trial_days: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Maks brukere</Label>
                <Input type="number" value={form.max_users ?? ""} onChange={(e) => setForm(f => ({ ...f, max_users: e.target.value ? Number(e.target.value) : null }))} placeholder="Ubegrenset" />
              </div>
            </div>
            <div className="space-y-3">
              <Label>Inkluderte moduler</Label>
              {ALL_MODULES.map((m) => (
                <div key={m} className="flex items-center gap-2">
                  <Checkbox id={`plan-mod-${m}`} checked={form.included_modules.includes(m)}
                    onCheckedChange={(c) => setForm(f => ({
                      ...f, included_modules: c ? [...f.included_modules, m] : f.included_modules.filter(x => x !== m),
                    }))} />
                  <label htmlFor={`plan-mod-${m}`} className="text-sm">{moduleLabels[m]}</label>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={(c) => setForm(f => ({ ...f, is_active: c }))} />
                <Label>Aktiv</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_visible} onCheckedChange={(c) => setForm(f => ({ ...f, is_visible: c }))} />
                <Label>Synlig</Label>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Sorteringsrekkefølge</Label>
              <Input type="number" value={form.sort_order} onChange={(e) => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} />
            </div>
            <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Lagrer..." : editingId ? "Lagre endringer" : "Opprett plan"}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
