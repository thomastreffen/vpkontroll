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
import { WARRANTY_STATUS_LABELS } from "@/lib/domain-labels";

interface WarrantyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId?: string;
  assetId?: string;
  caseId?: string;
  warranty?: any;
  assets?: { id: string; manufacturer: string | null; model: string | null }[];
}

const EMPTY = {
  issue_description: "", manufacturer_ref: "", resolution: "",
  status: "open", asset_id: "",
};

export function WarrantyFormDialog({ open, onOpenChange, companyId, assetId, caseId, warranty, assets }: WarrantyFormDialogProps) {
  const { tenantId } = useAuth();
  const qc = useQueryClient();
  const isEdit = !!warranty;
  const [form, setForm] = useState({ ...EMPTY, asset_id: assetId || "" });

  useEffect(() => {
    if (warranty) {
      setForm({
        issue_description: warranty.issue_description || "",
        manufacturer_ref: warranty.manufacturer_ref || "",
        resolution: warranty.resolution || "",
        status: warranty.status || "open",
        asset_id: warranty.asset_id || assetId || "",
      });
    } else {
      setForm({ ...EMPTY, asset_id: assetId || "" });
    }
  }, [warranty, assetId, open]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        issue_description: form.issue_description || null,
        manufacturer_ref: form.manufacturer_ref || null,
        resolution: form.resolution || null,
        status: form.status as any,
        asset_id: form.asset_id || null,
      };
      if (isEdit) {
        if (form.status === "resolved" && !warranty.resolved_at) {
          payload.resolved_at = new Date().toISOString();
        }
        const { error } = await supabase.from("warranty_cases").update(payload).eq("id", warranty.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("warranty_cases").insert({
          ...payload,
          tenant_id: tenantId!,
          company_id: companyId || null,
          case_id: caseId || null,
          warranty_number: "GAR-TEMP",
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? "Garantisak oppdatert" : "Garantisak opprettet");
      qc.invalidateQueries({ queryKey: ["company-warranty"] });
      qc.invalidateQueries({ queryKey: ["asset-warranty"] });
      qc.invalidateQueries({ queryKey: ["warranty"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Rediger garantisak" : "Ny garantisak"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          {isEdit && (
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(WARRANTY_STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {!assetId && assets && assets.length > 0 && (
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
          <div>
            <Label>Feilbeskrivelse *</Label>
            <Textarea value={form.issue_description} onChange={e => set("issue_description", e.target.value)} rows={3} placeholder="Beskriv feilen/problemet..." />
          </div>
          <div>
            <Label>Produsentens referanse</Label>
            <Input value={form.manufacturer_ref} onChange={e => set("manufacturer_ref", e.target.value)} placeholder="Saksnr hos produsent" />
          </div>
          {isEdit && (
            <div>
              <Label>Løsning/resultat</Label>
              <Textarea value={form.resolution} onChange={e => set("resolution", e.target.value)} rows={2} placeholder="Hva ble utfallet..." />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Avbryt</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.issue_description}>
            {mutation.isPending ? "Lagrer..." : isEdit ? "Oppdater" : "Opprett"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
