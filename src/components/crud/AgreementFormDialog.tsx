import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { AGREEMENT_INTERVAL_LABELS, AGREEMENT_STATUS_LABELS } from "@/lib/domain-labels";

interface AgreementFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  agreement?: any;
  sites?: { id: string; name: string | null; address: string | null }[];
  assets?: { id: string; manufacturer: string | null; model: string | null }[];
}

const EMPTY = {
  interval: "annual", start_date: "", end_date: "", annual_price: "",
  scope_description: "", notes: "", status: "active", site_id: "", asset_id: "",
};

export function AgreementFormDialog({ open, onOpenChange, companyId, agreement, sites, assets }: AgreementFormDialogProps) {
  const { tenantId } = useAuth();
  const qc = useQueryClient();
  const isEdit = !!agreement;
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (agreement) {
      setForm({
        interval: agreement.interval || "annual",
        start_date: agreement.start_date || "",
        end_date: agreement.end_date || "",
        annual_price: agreement.annual_price?.toString() || "",
        scope_description: agreement.scope_description || "",
        notes: agreement.notes || "",
        status: agreement.status || "active",
        site_id: agreement.site_id || "",
        asset_id: agreement.asset_id || "",
      });
    } else {
      setForm(EMPTY);
    }
  }, [agreement, open]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        interval: form.interval,
        start_date: form.start_date,
        end_date: form.end_date || null,
        annual_price: form.annual_price ? parseFloat(form.annual_price) : null,
        scope_description: form.scope_description || null,
        notes: form.notes || null,
        status: form.status,
        site_id: form.site_id || null,
        asset_id: form.asset_id || null,
        next_visit_due: form.start_date || null,
      };
      if (isEdit) {
        const { error } = await supabase.from("service_agreements").update(payload).eq("id", agreement.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("service_agreements").insert({
          ...payload,
          company_id: companyId,
          tenant_id: tenantId!,
          agreement_number: "SA-TEMP",
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-agreements", companyId] });
      qc.invalidateQueries({ queryKey: ["site-agreements"] });
      qc.invalidateQueries({ queryKey: ["agreement"] });
      onOpenChange(false);
      toast.success(isEdit ? "Avtale oppdatert" : "Avtale opprettet");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-lg w-full overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Rediger serviceavtale" : "Ny serviceavtale"}</SheetTitle>
        </SheetHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Intervall *</Label>
              <Select value={form.interval} onValueChange={v => set("interval", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(AGREEMENT_INTERVAL_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isEdit && (
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(AGREEMENT_STATUS_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Startdato *</Label><Input type="date" value={form.start_date} onChange={e => set("start_date", e.target.value)} /></div>
            <div><Label>Sluttdato</Label><Input type="date" value={form.end_date} onChange={e => set("end_date", e.target.value)} /></div>
          </div>
          <div><Label>Årspris (NOK)</Label><Input type="number" value={form.annual_price} onChange={e => set("annual_price", e.target.value)} /></div>
          {sites && sites.length > 0 && (
            <div>
              <Label>Anleggssted</Label>
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
          {assets && assets.length > 0 && (
            <div>
              <Label>Anlegg</Label>
              <Select value={form.asset_id} onValueChange={v => set("asset_id", v)}>
                <SelectTrigger><SelectValue placeholder="Velg anlegg" /></SelectTrigger>
                <SelectContent>
                  {assets.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.manufacturer} {a.model || ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div><Label>Omfang</Label><Textarea value={form.scope_description} onChange={e => set("scope_description", e.target.value)} rows={2} placeholder="Hva dekkes av avtalen..." /></div>
          <div><Label>Notater</Label><Textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} /></div>
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Avbryt</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.start_date}>
            {mutation.isPending ? "Lagrer..." : isEdit ? "Oppdater" : "Opprett"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
