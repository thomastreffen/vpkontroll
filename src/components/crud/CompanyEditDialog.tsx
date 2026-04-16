import { useState, useEffect } from "react";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: any;
  onSaved: () => void;
}

const CUSTOMER_TYPES = [
  { value: "private", label: "Privat" },
  { value: "business", label: "Bedriftskunde" },
  { value: "housing_coop", label: "Borettslag" },
  { value: "public_sector", label: "Offentlig" },
];

export function CompanyEditDialog({ open, onOpenChange, company, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", org_number: "", customer_type: "private",
    email: "", phone: "", website: "",
    address: "", postal_code: "", city: "",
    notes: "", enova_registered: false,
  });

  useEffect(() => {
    if (company && open) {
      setForm({
        name: company.name || "",
        org_number: company.org_number || "",
        customer_type: company.customer_type || "private",
        email: company.email || "",
        phone: company.phone || "",
        website: company.website || "",
        address: company.address || "",
        postal_code: company.postal_code || "",
        city: company.city || "",
        notes: company.notes || "",
        enova_registered: company.enova_registered || false,
      });
    }
  }, [company, open]);

  const save = async () => {
    if (!company || !form.name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("crm_companies").update({
      name: form.name.trim(),
      org_number: form.org_number || null,
      customer_type: form.customer_type as any,
      email: form.email || null,
      phone: form.phone || null,
      website: form.website || null,
      address: form.address || null,
      postal_code: form.postal_code || null,
      city: form.city || null,
      notes: form.notes || null,
      enova_registered: form.enova_registered,
    }).eq("id", company.id);
    setSaving(false);
    if (error) { toast.error("Kunne ikke lagre"); return; }
    toast.success("Kunde oppdatert");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader><SheetTitle>Rediger kunde</SheetTitle></SheetHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label>Navn *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Org.nr</Label>
              <Input value={form.org_number} onChange={e => setForm({ ...form, org_number: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Kundetype</Label>
              <Select value={form.customer_type} onValueChange={v => setForm({ ...form, customer_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CUSTOMER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>E-post</Label>
              <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Telefon</Label>
              <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Nettside</Label>
            <Input value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label>Adresse</Label>
              <AddressAutocomplete value={form.address} onChange={v => setForm({ ...form, address: v })} onSelect={r => setForm(f => ({ ...f, address: r.address, postal_code: r.postalCode, city: r.city }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Postnr.</Label>
              <Input value={form.postal_code} onChange={e => setForm({ ...form, postal_code: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>By</Label>
            <Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={form.enova_registered} onCheckedChange={v => setForm({ ...form, enova_registered: !!v })} id="enova" />
            <Label htmlFor="enova" className="text-sm font-normal">Enova-registrert</Label>
          </div>
          <div className="space-y-1.5">
            <Label>Notater</Label>
            <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} />
          </div>
        </div>
        <SheetFooter className="flex flex-row justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Avbryt</Button>
          <Button onClick={save} disabled={saving || !form.name.trim()}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Lagre
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
