import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Building2, Pencil, Trash2, Users, Plug } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Tenant = Tables<"tenants">;
type TenantStatus = Tenant["status"];

const statusLabels: Record<TenantStatus, string> = {
  trial: "Prøveperiode",
  active: "Aktiv",
  inactive: "Inaktiv",
  suspended: "Suspendert",
};

const statusColors: Record<string, string> = {
  active: "bg-accent/10 text-accent border-accent/20",
  trial: "bg-yellow-100 text-yellow-700 border-yellow-200",
  inactive: "bg-muted text-muted-foreground",
  suspended: "bg-destructive/10 text-destructive border-destructive/20",
};

interface TenantFormData {
  name: string;
  slug: string;
  domain: string;
  status: TenantStatus;
}

const emptyForm: TenantFormData = { name: "", slug: "", domain: "", status: "trial" };

export default function TenantsPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<TenantFormData>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: tenants, isLoading } = useQuery({
    queryKey: ["tenants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .order("created_at", { ascending: false });
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

  const { data: credentials } = useQuery({
    queryKey: ["tenant_credentials"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenant_credentials").select("*");
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

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tenants").insert({
        name: form.name,
        slug: form.slug || form.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
        domain: form.domain || null,
        status: form.status,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      toast.success("Tenant opprettet");
      setCreateOpen(false);
      setForm(emptyForm);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingId) return;
      const { error } = await supabase
        .from("tenants")
        .update({
          name: form.name,
          slug: form.slug,
          domain: form.domain || null,
          status: form.status,
        })
        .eq("id", editingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      toast.success("Tenant oppdatert");
      setEditOpen(false);
      setEditingId(null);
      setForm(emptyForm);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tenants").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      toast.success("Tenant slettet");
      setDeleteId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const openEdit = (tenant: Tenant) => {
    setForm({
      name: tenant.name,
      slug: tenant.slug,
      domain: tenant.domain || "",
      status: tenant.status,
    });
    setEditingId(tenant.id);
    setEditOpen(true);
  };

  const getActiveModuleCount = (tenantId: string) =>
    modules?.filter((m) => m.tenant_id === tenantId && m.is_active).length ?? 0;

  const getCredentialCount = (tenantId: string) =>
    credentials?.filter((c) => c.tenant_id === tenantId).length ?? 0;

  const getUserCount = (tenantId: string) =>
    profiles?.filter((p) => p.tenant_id === tenantId).length ?? 0;

  const TenantForm = ({ onSubmit, isPending, submitLabel }: { onSubmit: () => void; isPending: boolean; submitLabel: string }) => (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-4">
      <div className="space-y-2">
        <Label>Selskapsnavn</Label>
        <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
      </div>
      <div className="space-y-2">
        <Label>Slug (URL-vennlig)</Label>
        <Input
          value={form.slug}
          onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
          placeholder={form.name.toLowerCase().replace(/\s+/g, "-")}
        />
      </div>
      <div className="space-y-2">
        <Label>Domene (valgfritt)</Label>
        <Input value={form.domain} onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))} placeholder="firma.no" />
      </div>
      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as TenantStatus }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(statusLabels).map(([val, label]) => (
              <SelectItem key={val} value={val}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Lagrer..." : submitLabel}
      </Button>
    </form>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tenants</h1>
          <p className="text-muted-foreground mt-1">Administrer kundeselskaper</p>
        </div>
        <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) setForm(emptyForm); }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Ny tenant</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Opprett ny tenant</DialogTitle></DialogHeader>
            <TenantForm onSubmit={() => createMutation.mutate()} isPending={createMutation.isPending} submitLabel="Opprett tenant" />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-8 text-center text-muted-foreground">Laster...</p>
          ) : !tenants?.length ? (
            <div className="p-12 text-center">
              <Building2 className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">Ingen tenants ennå</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Navn</TableHead>
                  <TableHead className="hidden md:table-cell">Slug</TableHead>
                  <TableHead className="hidden lg:table-cell">Domene</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Moduler</TableHead>
                  <TableHead className="hidden md:table-cell">Intgr.</TableHead>
                  <TableHead className="hidden lg:table-cell">Brukere</TableHead>
                  <TableHead className="hidden lg:table-cell">Opprettet</TableHead>
                  <TableHead className="text-right">Handlinger</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="text-muted-foreground hidden md:table-cell">{t.slug}</TableCell>
                    <TableCell className="text-muted-foreground hidden lg:table-cell">{t.domain || "–"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[t.status] ?? ""}>
                        {statusLabels[t.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-sm text-muted-foreground">{getActiveModuleCount(t.id)}</span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-sm text-muted-foreground">{getCredentialCount(t.id)}</span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-sm text-muted-foreground">{getUserCount(t.id)}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden lg:table-cell">
                      {new Date(t.created_at).toLocaleDateString("nb-NO")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(t.id)} className="text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) { setEditingId(null); setForm(emptyForm); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rediger tenant</DialogTitle></DialogHeader>
          <TenantForm onSubmit={() => updateMutation.mutate()} isPending={updateMutation.isPending} submitLabel="Lagre endringer" />
        </DialogContent>
      </Dialog>

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
