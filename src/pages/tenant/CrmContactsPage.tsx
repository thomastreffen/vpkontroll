import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Plus, Search, Phone, Mail, Building2, MoreHorizontal,
  User, MapPin, Loader2,
} from "lucide-react";

type Contact = {
  id: string; tenant_id: string; company_id: string | null;
  first_name: string; last_name: string | null; title: string | null;
  email: string | null; phone: string | null; mobile: string | null;
  address: string | null; city: string | null; postal_code: string | null;
  notes: string | null; is_primary_contact: boolean;
  created_at: string; company_name?: string;
};

type Company = { id: string; name: string };

export default function CrmContactsPage() {
  const { tenantId, user } = useAuth();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [saving, setSaving] = useState(false);

  // Form
  const [form, setForm] = useState({
    first_name: "", last_name: "", title: "", email: "", phone: "",
    mobile: "", company_id: "", address: "", city: "", postal_code: "", notes: "",
  });

  const fetch = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    const [{ data: c }, { data: co }] = await Promise.all([
      supabase.from("crm_contacts").select("*").eq("tenant_id", tenantId).order("first_name"),
      supabase.from("crm_companies").select("id, name").eq("tenant_id", tenantId).order("name"),
    ]);
    // Join company names
    const companyMap = new Map((co || []).map((x: any) => [x.id, x.name]));
    setContacts((c || []).map((x: any) => ({ ...x, company_name: companyMap.get(x.company_id) || null })));
    setCompanies((co || []) as Company[]);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { fetch(); }, [fetch]);

  const openNew = () => {
    setEditContact(null);
    setForm({ first_name: "", last_name: "", title: "", email: "", phone: "", mobile: "", company_id: "", address: "", city: "", postal_code: "", notes: "" });
    setDialogOpen(true);
  };

  const openEdit = (c: Contact) => {
    setEditContact(c);
    setForm({
      first_name: c.first_name, last_name: c.last_name || "", title: c.title || "",
      email: c.email || "", phone: c.phone || "", mobile: c.mobile || "",
      company_id: c.company_id || "", address: c.address || "", city: c.city || "",
      postal_code: c.postal_code || "", notes: c.notes || "",
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!tenantId || !form.first_name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        tenant_id: tenantId,
        first_name: form.first_name.trim(),
        last_name: form.last_name || null,
        title: form.title || null,
        email: form.email || null,
        phone: form.phone || null,
        mobile: form.mobile || null,
        company_id: form.company_id || null,
        address: form.address || null,
        city: form.city || null,
        postal_code: form.postal_code || null,
        notes: form.notes || null,
      };
      if (editContact) {
        await supabase.from("crm_contacts").update(payload as any).eq("id", editContact.id);
        toast.success("Kontakt oppdatert");
      } else {
        await supabase.from("crm_contacts").insert({ ...payload, created_by: user?.id } as any);
        toast.success("Kontakt opprettet");
      }
      setDialogOpen(false);
      fetch();
    } catch { toast.error("Kunne ikke lagre"); }
    finally { setSaving(false); }
  };

  const filtered = contacts.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return `${c.first_name} ${c.last_name}`.toLowerCase().includes(q)
      || (c.email || "").toLowerCase().includes(q)
      || (c.company_name || "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kontakter</h1>
          <p className="text-sm text-muted-foreground mt-1">{contacts.length} kontakter totalt</p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" /> Ny kontakt
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Søk kontakter..." className="pl-9" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <User className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">{search ? "Ingen treff" : "Ingen kontakter lagt til ennå"}</p>
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Navn</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden md:table-cell">Bedrift</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden sm:table-cell">E-post</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden lg:table-cell">Telefon</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden lg:table-cell">By</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => navigate(`/tenant/crm/contacts/${c.id}`)}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {c.first_name[0]}{(c.last_name || "")[0] || ""}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{c.first_name} {c.last_name || ""}</p>
                          {c.title && <p className="text-xs text-muted-foreground">{c.title}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell">
                      {c.company_name ? (
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <Building2 className="h-3 w-3 text-muted-foreground" /> {c.company_name}
                        </span>
                      ) : <span className="text-muted-foreground/50">–</span>}
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell text-muted-foreground">{c.email || "–"}</td>
                    <td className="py-3 px-4 hidden lg:table-cell text-muted-foreground">{c.phone || c.mobile || "–"}</td>
                    <td className="py-3 px-4 hidden lg:table-cell text-muted-foreground">{c.city || "–"}</td>
                    <td className="py-3 px-4"><MoreHorizontal className="h-4 w-4 text-muted-foreground" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editContact ? "Rediger kontakt" : "Ny kontakt"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Fornavn *</Label>
                <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Etternavn</Label>
                <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tittel</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Daglig leder" />
              </div>
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
            </div>
            <div className="space-y-1.5">
              <Label>E-post</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Telefon</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Mobil</Label>
                <Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
              </div>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Avbryt</Button>
            <Button onClick={save} disabled={saving || !form.first_name.trim()}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editContact ? "Lagre" : "Opprett"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
