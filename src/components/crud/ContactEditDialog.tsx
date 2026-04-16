import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ContactEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: any;
  onSaved?: () => void;
}

export function ContactEditDialog({ open, onOpenChange, contact, onSaved }: ContactEditDialogProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    first_name: "", last_name: "", title: "", email: "", phone: "",
    mobile: "", address: "", city: "", postal_code: "", notes: "",
  });

  useEffect(() => {
    if (contact && open) {
      setForm({
        first_name: contact.first_name || "",
        last_name: contact.last_name || "",
        title: contact.title || "",
        email: contact.email || "",
        phone: contact.phone || "",
        mobile: contact.mobile || "",
        address: contact.address || "",
        city: contact.city || "",
        postal_code: contact.postal_code || "",
        notes: contact.notes || "",
      });
    }
  }, [contact, open]);

  const save = async () => {
    if (!form.first_name.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("crm_contacts").update({
        first_name: form.first_name.trim(),
        last_name: form.last_name || null,
        title: form.title || null,
        email: form.email || null,
        phone: form.phone || null,
        mobile: form.mobile || null,
        address: form.address || null,
        city: form.city || null,
        postal_code: form.postal_code || null,
        notes: form.notes || null,
      }).eq("id", contact.id);
      if (error) throw error;
      toast.success("Kontakt oppdatert");
      onOpenChange(false);
      onSaved?.();
    } catch {
      toast.error("Kunne ikke oppdatere kontakt");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Rediger kontakt</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Fornavn *</Label>
              <Input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Etternavn</Label>
              <Input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Tittel</Label>
            <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>E-post</Label>
            <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Telefon</Label>
              <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Mobil</Label>
              <Input value={form.mobile} onChange={e => setForm({ ...form, mobile: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Adresse</Label>
              <AddressAutocomplete value={form.address} onChange={v => setForm({ ...form, address: v })} onSelect={r => setForm(f => ({ ...f, address: r.address, postal_code: r.postalCode, city: r.city }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Postnr</Label>
              <Input value={form.postal_code} onChange={e => setForm({ ...form, postal_code: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>By</Label>
              <Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notater</Label>
            <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
          </div>
        </div>
        <SheetFooter className="flex flex-row justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Avbryt</Button>
          <Button onClick={save} disabled={saving || !form.first_name.trim()}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Lagre
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
