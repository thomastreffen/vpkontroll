import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Plus, Building2, Pencil, Trash2, Users, Plug, ArrowRight, Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

type Tenant = Tables<"tenants">;
type TenantStatus = Tenant["status"];

const statusLabels: Record<TenantStatus, string> = {
  trial: "Prøveperiode", active: "Aktiv", inactive: "Inaktiv", suspended: "Suspendert",
};
const statusColors: Record<string, string> = {
  active: "bg-accent/10 text-accent border-accent/20",
  trial: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400",
  inactive: "bg-muted text-muted-foreground",
  suspended: "bg-destructive/10 text-destructive border-destructive/20",
};

const ALL_MODULES = ["postkontoret", "ressursplanlegger", "crm"] as const;
const moduleLabels: Record<string, string> = {
  postkontoret: "Postkontoret", ressursplanlegger: "Ressursplanlegger", crm: "CRM",
};

interface TenantFormData {
  name: string;
  slug: string;
  domain: string;
  status: TenantStatus;
  initialModules: string[];
  adminEmail: string;
  notes: string;
}

const emptyForm: TenantFormData = { name: "", slug: "", domain: "", status: "trial", initialModules: ["crm"], adminEmail: "", notes: "" };

export default function TenantsPage() {
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<TenantFormData>(emptyForm);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: tenants, isLoading } = useQuery({
    queryKey: ["tenants"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Tenant[];
    },
  });

  const { data: modules } = useQuery({
    queryKey: ["tenant_modules"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenant_modules").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: credentials } = useQuery({
    queryKey: ["tenant_credentials"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenant_credentials").select("*");
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const slug = form.slug || form.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const { data: newTenant, error } = await supabase.from("tenants").insert({
        name: form.name, slug, domain: form.domain || null, status: form.status,
      }).select().single();
      if (error) throw error;

      // Create initial modules
      if (form.initialModules.length > 0 && newTenant) {
        const moduleRows = form.initialModules.map((m) => ({
          tenant_id: newTenant.id,
          module_name: m as any,
          is_active: true,
          activated_at: new Date().toISOString(),
        }));
        const { error: mErr } = await supabase.from("tenant_modules").insert(moduleRows);
        if (mErr) console.error("Module init error:", mErr);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      queryClient.invalidateQueries({ queryKey: ["tenant_modules"] });
      toast.success("Tenant opprettet");
      setSheetOpen(false);
      setForm(emptyForm);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingId) return;
      const { error } = await supabase.from("tenants").update({
        name: form.name, slug: form.slug, domain: form.domain || null, status: form.status,
      }).eq("id", editingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      toast.success("Tenant oppdatert");
      setSheetOpen(false);
      setEditingId(null);
      setForm(emptyForm);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      const { error } = await supabase.from("tenants").delete().eq("id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      toast.success("Tenant slettet");
      setDeleteId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setSheetOpen(true);
  };

  const openEdit = (t: Tenant) => {
    setEditingId(t.id);
    setForm({ name: t.name, slug: t.slug, domain: t.domain || "", status: t.status, initialModules: [], adminEmail: "", notes: "" });
    setSheetOpen(true);
  };

  const getActiveModuleCount = (tid: string) => modules?.filter((m) => m.tenant_id === tid && m.is_active).length ?? 0;
  const getUserCount = (tid: string) => profiles?.filter((p) => p.tenant_id === tid).length ?? 0;
  const getIntegrationCount = (tid: string) => credentials?.filter((c) => c.tenant_id === tid).length ?? 0;

  const filtered = tenants?.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.slug.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const isEditing = !!editingId;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tenants</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {tenants?.length ?? 0} selskaper registrert
          </p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Ny tenant</Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Søk etter navn eller slug..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle statuser</SelectItem>
            {Object.entries(statusLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Tenant list */}
      <div className="space-y-2">
        {isLoading ? (
          <Card className="border-border/50"><CardContent className="p-8 text-center text-muted-foreground">Laster...</CardContent></Card>
        ) : !filtered?.length ? (
          <Card className="border-border/50">
            <CardContent className="p-12 text-center">
              <Building2 className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">{search || statusFilter !== "all" ? "Ingen tenants matcher søket" : "Ingen tenants ennå"}</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((t) => (
            <Card key={t.id} className="border-border/50 hover:border-border transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <Link to={`/admin/tenants/${t.id}`} className="flex items-center gap-3 min-w-0 flex-1 group">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                      {t.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm group-hover:text-primary transition-colors truncate">{t.name}</p>
                        <Badge variant="outline" className={cn("text-[10px] shrink-0", statusColors[t.status])}>
                          {statusLabels[t.status]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                        <span>{t.slug}</span>
                        <span>·</span>
                        <span>{getUserCount(t.id)} brukere</span>
                        <span>·</span>
                        <span>{getActiveModuleCount(t.id)} moduler</span>
                        <span>·</span>
                        <span>{getIntegrationCount(t.id)} intgr.</span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </Link>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(t.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create/Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={(o) => { setSheetOpen(o); if (!o) { setEditingId(null); setForm(emptyForm); } }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{isEditing ? "Rediger tenant" : "Opprett ny tenant"}</SheetTitle>
          </SheetHeader>
          <form
            className="space-y-5 mt-6"
            onSubmit={(e) => {
              e.preventDefault();
              isEditing ? updateMutation.mutate() : createMutation.mutate();
            }}
          >
            <div className="space-y-2">
              <Label>Selskapsnavn *</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Slug (URL-vennlig)</Label>
              <Input
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder={form.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}
              />
              <p className="text-[11px] text-muted-foreground">Brukes i URL-er. Genereres automatisk fra navn hvis tom.</p>
            </div>
            <div className="space-y-2">
              <Label>Domene</Label>
              <Input value={form.domain} onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))} placeholder="firma.no" />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as TenantStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {!isEditing && (
              <>
                <div className="space-y-3">
                  <Label>Initiale moduler</Label>
                  <div className="space-y-2">
                    {ALL_MODULES.map((m) => (
                      <div key={m} className="flex items-center gap-2">
                        <Checkbox
                          id={`mod-${m}`}
                          checked={form.initialModules.includes(m)}
                          onCheckedChange={(checked) => {
                            setForm((f) => ({
                              ...f,
                              initialModules: checked
                                ? [...f.initialModules, m]
                                : f.initialModules.filter((x) => x !== m),
                            }));
                          }}
                        />
                        <label htmlFor={`mod-${m}`} className="text-sm">{moduleLabels[m]}</label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Første admin-e-post (valgfritt)</Label>
                  <Input
                    type="email"
                    value={form.adminEmail}
                    onChange={(e) => setForm((f) => ({ ...f, adminEmail: e.target.value }))}
                    placeholder="admin@firma.no"
                  />
                  <p className="text-[11px] text-muted-foreground">Brukeren må registrere seg separat. Feltet er til informasjon.</p>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Notater</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Interne notater om denne tenanten..."
                rows={3}
              />
            </div>

            <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
              {(createMutation.isPending || updateMutation.isPending) ? "Lagrer..." : isEditing ? "Lagre endringer" : "Opprett tenant"}
            </Button>
          </form>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slett tenant?</AlertDialogTitle>
            <AlertDialogDescription>
              Dette vil permanent slette tenant og alle tilhørende data. Denne handlingen kan ikke angres.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Sletter..." : "Slett"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
