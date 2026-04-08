import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Search, Building2, MoreHorizontal, Globe, Phone, Mail, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type Company = {
  id: string; tenant_id: string; name: string; org_number: string | null;
  industry: string | null; website: string | null; phone: string | null;
  email: string | null; address: string | null; city: string | null;
  postal_code: string | null; country: string | null; notes: string | null;
  created_at: string; contact_count?: number; deal_count?: number;
};

export default function CrmCompaniesPage() {
  const { tenantId, user } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCompany, setEditCompany] = useState<Company | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "", org_number: "", industry: "varmepumpe", customer_type: "private", website: "", phone: "",
    email: "", address: "", city: "", postal_code: "", notes: "",
  });

  const fetchData = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    const { data } = await supabase.from("crm_companies").select("*").eq("tenant_id", tenantId).order("name");
    setCompanies((data || []) as unknown as Company[]);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openNew = () => {
    setEditCompany(null);
    setForm({ name: "", org_number: "", industry: "varmepumpe", customer_type: "private", website: "", phone: "", email: "", address: "", city: "", postal_code: "", notes: "" });
    setDialogOpen(true);
  };

  const openEdit = (c: Company) => {
    setEditCompany(c);
    setForm({
      name: c.name, org_number: c.org_number || "", industry: c.industry || "",
      customer_type: (c as any).customer_type || "private",
      website: c.website || "", phone: c.phone || "", email: c.email || "",
      address: c.address || "", city: c.city || "", postal_code: c.postal_code || "", notes: c.notes || "",
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!tenantId || !form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        tenant_id: tenantId, name: form.name.trim(),
        org_number: form.org_number || null, industry: form.industry || null,
        customer_type: form.customer_type as any,
        website: form.website || null, phone: form.phone || null,
        email: form.email || null, address: form.address || null,
        city: form.city || null, postal_code: form.postal_code || null,
        notes: form.notes || null,
      };
      if (editCompany) {
        await supabase.from("crm_companies").update(payload as any).eq("id", editCompany.id);
        toast.success("Kunde oppdatert");
      } else {
        const { data: created } = await supabase.from("crm_companies").insert({ ...payload, created_by: user?.id } as any).select("id").single();
        toast.success("Kunde opprettet", {
          action: created ? { label: "Åpne kunde", onClick: () => navigate(`/tenant/crm/companies/${created.id}`) } : undefined,
        });
      }
      setDialogOpen(false);
      fetchData();
    } catch { toast.error("Kunne ikke lagre"); }
    finally { setSaving(false); }
  };

  const filtered = companies.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.city || "").toLowerCase().includes(q) || (c.org_number || "").includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kunder</h1>
          <p className="text-sm text-muted-foreground mt-1">{companies.length} kunder totalt</p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" /> Ny kunde
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Søk kunder..." className="pl-9" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        search ? (
          <div className="text-center py-20"><p className="text-sm text-muted-foreground">Ingen treff på «{search}»</p></div>
        ) : (
          <EmptyState
            icon={Building2}
            title="Ingen kunder ennå"
            description="Start med å legge til din første kunde – enten privatkunde eller bedrift. Kunden er utgangspunktet for kontaktpersoner, anlegg, deals og jobber."
            actionLabel="Ny kunde"
            onAction={openNew}
            hint="Kunde → Kontaktperson → Anleggssted → Anlegg → Deal → Jobb"
          />
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <Card key={c.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer group" onClick={() => navigate(`/tenant/crm/companies/${c.id}`)}>
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                    {c.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{c.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {(c as any).customer_type && (
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${CUSTOMER_TYPE_COLORS[(c as any).customer_type] || ""}`}>
                        {CUSTOMER_TYPE_LABELS[(c as any).customer_type] || (c as any).customer_type}
                      </Badge>
                    )}
                    {c.industry && <span className="text-xs text-muted-foreground capitalize">{c.industry}</span>}
                  </div>
                  <div className="flex flex-col gap-1 mt-2">
                    {c.email && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Mail className="h-3 w-3" /> {c.email}
                      </span>
                    )}
                    {c.phone && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Phone className="h-3 w-3" /> {c.phone}
                      </span>
                    )}
                    {c.city && (
                      <span className="text-xs text-muted-foreground">{c.postal_code} {c.city}</span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editCompany ? "Rediger kunde" : "Ny kunde"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Navn *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Kundetype</Label>
                <Select value={form.customer_type} onValueChange={(v) => setForm({ ...form, customer_type: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CUSTOMER_TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Org.nummer</Label>
                <Input value={form.org_number} onChange={(e) => setForm({ ...form, org_number: e.target.value })} placeholder="999 999 999" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>E-post</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Telefon</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Nettside</Label>
              <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Adresse</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Postnr</Label>
                <Input value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>By</Label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notater</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <SheetFooter className="flex flex-row justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Avbryt</Button>
            <Button onClick={save} disabled={saving || !form.name.trim()}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editCompany ? "Lagre" : "Opprett"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
