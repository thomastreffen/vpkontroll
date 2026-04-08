import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Building2, MapPin, Zap, Loader2, Star } from "lucide-react";
import { AGREEMENT_INTERVAL_LABELS, AGREEMENT_STATUS_LABELS } from "@/lib/domain-labels";

interface AgreementFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** If provided, locks customer selection */
  companyId?: string;
  agreement?: any;
  sites?: { id: string; name: string | null; address: string | null }[];
  assets?: { id: string; manufacturer: string | null; model: string | null }[];
  /** Pre-select site */
  siteId?: string;
  /** Pre-select asset */
  assetId?: string;
}

const EMPTY = {
  interval: "annual", start_date: "", end_date: "", annual_price: "",
  scope_description: "", notes: "", status: "active", site_id: "", asset_id: "",
  company_id: "", custom_interval_months: "12", service_template_id: "",
};

export function AgreementFormDialog({
  open, onOpenChange, companyId, agreement, sites: externalSites, assets: externalAssets,
  siteId: prefillSiteId, assetId: prefillAssetId,
}: AgreementFormDialogProps) {
  const { tenantId } = useAuth();
  const qc = useQueryClient();
  const isEdit = !!agreement;
  const [form, setForm] = useState(EMPTY);

  // If no companyId locked, allow customer selection
  const needsCustomerPicker = !companyId && !isEdit;

  // Fetch companies for picker
  const companiesQuery = useQuery({
    queryKey: ["all-companies", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("crm_companies").select("id, name")
        .eq("tenant_id", tenantId!).is("deleted_at", null).order("name");
      return data || [];
    },
    enabled: open && needsCustomerPicker && !!tenantId,
  });

  // Resolve effective company
  const effectiveCompanyId = companyId || form.company_id || agreement?.company_id;

  // Fetch sites for the selected company
  const sitesQuery = useQuery({
    queryKey: ["company-sites-for-agreement", effectiveCompanyId],
    queryFn: async () => {
      const { data } = await supabase.from("customer_sites").select("id, name, address")
        .eq("company_id", effectiveCompanyId!).is("deleted_at", null);
      return data || [];
    },
    enabled: open && !!effectiveCompanyId && !externalSites,
  });

  // Fetch assets for the selected company
  const assetsQuery = useQuery({
    queryKey: ["company-assets-for-agreement", effectiveCompanyId, tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("hvac_assets").select("id, manufacturer, model, site_id")
        .eq("tenant_id", tenantId!).is("deleted_at", null);
      // Filter to assets on company sites
      const companySiteIds = (sitesQuery.data || []).map(s => s.id);
      return (data || []).filter(a => companySiteIds.includes(a.site_id));
    },
    enabled: open && !!effectiveCompanyId && !externalAssets && !!sitesQuery.data,
  });

  const availableSites = externalSites || sitesQuery.data || [];
  const availableAssets = externalAssets || assetsQuery.data || [];

  // Fetch service templates
  const templatesQuery = useQuery({
    queryKey: ["service-templates-for-agreement", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("service_templates" as any)
        .select("id, name, is_default, use_context")
        .eq("tenant_id", tenantId!)
        .eq("is_active", true)
        .order("name");
      return (data as any[]) || [];
    },
    enabled: open && !!tenantId,
  });

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
        company_id: agreement.company_id || "",
        custom_interval_months: agreement.custom_interval_months?.toString() || "12",
        service_template_id: agreement.service_template_id || "",
      });
    } else {
      setForm({
        ...EMPTY,
        company_id: companyId || "",
        site_id: prefillSiteId || "",
        asset_id: prefillAssetId || "",
      });
    }
  }, [agreement, open, companyId, prefillSiteId, prefillAssetId]);

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
        custom_interval_months: form.interval === "custom" ? parseInt(form.custom_interval_months) || null : null,
        service_template_id: form.service_template_id || null,
      };
      if (isEdit) {
        const { error } = await supabase.from("service_agreements").update(payload).eq("id", agreement.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("service_agreements").insert({
          ...payload,
          company_id: effectiveCompanyId,
          tenant_id: tenantId!,
          agreement_number: "SA-TEMP",
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-agreements"] });
      qc.invalidateQueries({ queryKey: ["site-agreements"] });
      qc.invalidateQueries({ queryKey: ["agreement"] });
      qc.invalidateQueries({ queryKey: ["asset-agreements"] });
      onOpenChange(false);
      toast.success(isEdit ? "Avtale oppdatert" : "Serviceavtale opprettet");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const canSubmit = form.start_date && effectiveCompanyId;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-lg w-full overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Rediger serviceavtale" : "Ny serviceavtale"}</SheetTitle>
        </SheetHeader>
        <div className="grid gap-4 py-4">
          {/* Customer picker */}
          {needsCustomerPicker && (
            <div>
              <Label>Kunde *</Label>
              <Select value={form.company_id} onValueChange={v => {
                set("company_id", v);
                set("site_id", "");
                set("asset_id", "");
              }}>
                <SelectTrigger><SelectValue placeholder="Velg kunde..." /></SelectTrigger>
                <SelectContent>
                  {companiesQuery.data?.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Context summary when coming from a specific page */}
          {companyId && !isEdit && (
            <Card className="p-3 bg-muted/30">
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Kunde er forhåndsvalgt</span>
              </div>
            </Card>
          )}

          {/* Interval */}
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
            {form.interval === "custom" ? (
              <div>
                <Label>Antall måneder *</Label>
                <Input
                  type="number"
                  min="1"
                  max="60"
                  value={form.custom_interval_months}
                  onChange={e => set("custom_interval_months", e.target.value)}
                  placeholder="F.eks. 18"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Service hver {form.custom_interval_months || "?"} måned
                </p>
              </div>
            ) : isEdit ? (
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
            ) : null}
          </div>

          {/* Status when custom + edit */}
          {form.interval === "custom" && isEdit && (
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

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Startdato *</Label><Input type="date" value={form.start_date} onChange={e => set("start_date", e.target.value)} /></div>
            <div><Label>Sluttdato</Label><Input type="date" value={form.end_date} onChange={e => set("end_date", e.target.value)} /></div>
          </div>

          <div><Label>Årspris (NOK)</Label><Input type="number" value={form.annual_price} onChange={e => set("annual_price", e.target.value)} /></div>

          {/* Site */}
          {availableSites.length > 0 && (
            <div>
              <Label>Anleggssted</Label>
              <Select value={form.site_id} onValueChange={v => set("site_id", v)}>
                <SelectTrigger><SelectValue placeholder="Velg anleggssted" /></SelectTrigger>
                <SelectContent>
                  {availableSites.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name || s.address || s.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Asset */}
          {availableAssets.length > 0 && (
            <div>
              <Label>Anlegg</Label>
              <Select value={form.asset_id} onValueChange={v => set("asset_id", v)}>
                <SelectTrigger><SelectValue placeholder="Velg anlegg" /></SelectTrigger>
                <SelectContent>
                  {availableAssets.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.manufacturer} {a.model || ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Service template */}
          {(templatesQuery.data?.length ?? 0) > 0 && (
            <div>
              <Label>Servicemal</Label>
              <Select value={form.service_template_id} onValueChange={v => set("service_template_id", v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Ingen mal valgt" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ingen mal</SelectItem>
                  {templatesQuery.data!.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}{t.is_default ? " ★" : ""}</SelectItem>
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
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !canSubmit}>
            {mutation.isPending ? "Lagrer..." : isEdit ? "Oppdater" : "Opprett"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
