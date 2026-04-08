import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { SITE_TYPE_LABELS } from "@/lib/domain-labels";

interface SiteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  site?: any;
}

type SiteType = "residential" | "commercial" | "industrial" | "cabin";
const EMPTY = { name: "", address: "", postal_code: "", city: "", site_type: "residential" as SiteType, access_info: "", notes: "" };

export function SiteFormDialog({ open, onOpenChange, companyId, site }: SiteFormDialogProps) {
  const { tenantId } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const isEdit = !!site;
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (site) {
      setForm({
        name: site.name || "",
        address: site.address || "",
        postal_code: site.postal_code || "",
        city: site.city || "",
        site_type: site.site_type || "residential",
        access_info: site.access_info || "",
        notes: site.notes || "",
      });
    } else {
      setForm(EMPTY);
    }
  }, [site, open]);

  const mutation = useMutation({
    mutationFn: async () => {
      
      const typedForm = { ...form, site_type: form.site_type as SiteType };
      if (isEdit) {
        const { error } = await supabase.from("customer_sites").update(typedForm).eq("id", site.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("customer_sites").insert({ ...typedForm, company_id: companyId, tenant_id: tenantId! });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? "Anleggssted oppdatert" : "Anleggssted opprettet");
      qc.invalidateQueries({ queryKey: ["company-sites", companyId] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Rediger anleggssted" : "Nytt anleggssted"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Navn</Label><Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="F.eks. Hovedkontor" /></div>
            <div>
              <Label>Type</Label>
              <Select value={form.site_type} onValueChange={v => set("site_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SITE_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Adresse</Label><Input value={form.address} onChange={e => set("address", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Postnummer</Label><Input value={form.postal_code} onChange={e => set("postal_code", e.target.value)} /></div>
            <div><Label>Sted</Label><Input value={form.city} onChange={e => set("city", e.target.value)} /></div>
          </div>
          <div><Label>Adkomstinfo</Label><Input value={form.access_info} onChange={e => set("access_info", e.target.value)} placeholder="Nøkkelboks, port, etc." /></div>
          <div><Label>Notater</Label><Textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Avbryt</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.address}>
            {mutation.isPending ? "Lagrer..." : isEdit ? "Oppdater" : "Opprett"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
