import { useState, useEffect } from "react";
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
import { ENERGY_SOURCE_LABELS, ASSET_STATUS_LABELS } from "@/lib/domain-labels";

interface AssetFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteId: string;
  asset?: any;
  /** Available sites for site picker when creating from company context */
  sites?: { id: string; name: string | null; address: string | null }[];
}

const EMPTY = {
  manufacturer: "", model: "", serial_number: "", energy_source: "air_water",
  nominal_kw: "", indoor_unit_model: "", refrigerant_type: "", refrigerant_kg: "",
  outdoor_unit_location: "", installed_at: "", warranty_expires_at: "", status: "operational",
  notes: "", site_id: "",
};

export function AssetFormDialog({ open, onOpenChange, siteId, asset, sites }: AssetFormDialogProps) {
  const { tenantId } = useAuth();
  const qc = useQueryClient();
  const isEdit = !!asset;
  const [form, setForm] = useState({ ...EMPTY, site_id: siteId });

  useEffect(() => {
    if (asset) {
      setForm({
        manufacturer: asset.manufacturer || "",
        model: asset.model || "",
        serial_number: asset.serial_number || "",
        energy_source: asset.energy_source || "air_water",
        nominal_kw: asset.nominal_kw?.toString() || "",
        indoor_unit_model: asset.indoor_unit_model || "",
        refrigerant_type: asset.refrigerant_type || "",
        refrigerant_kg: asset.refrigerant_kg?.toString() || "",
        outdoor_unit_location: asset.outdoor_unit_location || "",
        installed_at: asset.installed_at || "",
        warranty_expires_at: asset.warranty_expires_at || "",
        status: asset.status || "operational",
        notes: asset.notes || "",
        site_id: asset.site_id || siteId,
      });
    } else {
      setForm({ ...EMPTY, site_id: siteId });
    }
  }, [asset, siteId, open]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        manufacturer: form.manufacturer || null,
        model: form.model || null,
        serial_number: form.serial_number || null,
        energy_source: form.energy_source,
        nominal_kw: form.nominal_kw ? parseFloat(form.nominal_kw) : null,
        indoor_unit_model: form.indoor_unit_model || null,
        refrigerant_type: form.refrigerant_type || null,
        refrigerant_kg: form.refrigerant_kg ? parseFloat(form.refrigerant_kg) : null,
        outdoor_unit_location: form.outdoor_unit_location || null,
        installed_at: form.installed_at || null,
        warranty_expires_at: form.warranty_expires_at || null,
        status: form.status,
        notes: form.notes || null,
        site_id: form.site_id,
      };
      if (isEdit) {
        const { error } = await supabase.from("hvac_assets").update(payload).eq("id", asset.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("hvac_assets").insert({ ...payload, tenant_id: tenantId! });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? "Anlegg oppdatert" : "Anlegg opprettet");
      qc.invalidateQueries({ queryKey: ["company-assets"] });
      qc.invalidateQueries({ queryKey: ["asset"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Rediger anlegg" : "Nytt anlegg"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          {/* Site picker if multiple sites */}
          {!isEdit && sites && sites.length > 0 && (
            <div>
              <Label>Anleggssted *</Label>
              <Select value={form.site_id} onValueChange={v => set("site_id", v)}>
                <SelectTrigger><SelectValue placeholder="Velg anleggssted" /></SelectTrigger>
                <SelectContent>
                  {sites.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name || s.address || s.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Produsent</Label><Input value={form.manufacturer} onChange={e => set("manufacturer", e.target.value)} placeholder="Mitsubishi, Daikin..." /></div>
            <div><Label>Modell</Label><Input value={form.model} onChange={e => set("model", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Energikilde *</Label>
              <Select value={form.energy_source} onValueChange={v => set("energy_source", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ENERGY_SOURCE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Nominell effekt (kW)</Label><Input type="number" value={form.nominal_kw} onChange={e => set("nominal_kw", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Serienummer</Label><Input value={form.serial_number} onChange={e => set("serial_number", e.target.value)} /></div>
            <div><Label>Innedel modell</Label><Input value={form.indoor_unit_model} onChange={e => set("indoor_unit_model", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Kuldemedium</Label><Input value={form.refrigerant_type} onChange={e => set("refrigerant_type", e.target.value)} placeholder="R32, R410A..." /></div>
            <div><Label>Mengde (kg)</Label><Input type="number" value={form.refrigerant_kg} onChange={e => set("refrigerant_kg", e.target.value)} /></div>
            <div><Label>Utedel plassering</Label><Input value={form.outdoor_unit_location} onChange={e => set("outdoor_unit_location", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Installert dato</Label><Input type="date" value={form.installed_at} onChange={e => set("installed_at", e.target.value)} /></div>
            <div><Label>Garanti utløper</Label><Input type="date" value={form.warranty_expires_at} onChange={e => set("warranty_expires_at", e.target.value)} /></div>
          </div>
          {isEdit && (
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ASSET_STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div><Label>Notater</Label><Textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Avbryt</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.site_id}>
            {mutation.isPending ? "Lagrer..." : isEdit ? "Oppdater" : "Opprett"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
