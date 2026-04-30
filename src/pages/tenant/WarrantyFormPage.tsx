import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronRight, Loader2, ShieldAlert, Info } from "lucide-react";
import { toast } from "sonner";
import { WARRANTY_STATUS_LABELS } from "@/lib/domain-labels";
import { cn } from "@/lib/utils";

const EMPTY_FORM = {
  issue_description: "",
  status: "open",
  manufacturer_ref: "",
  resolution: "",
  company_id: "",
  asset_id: "",
};

const STATUS_HELP: Record<string, string> = {
  open: "Saken er registrert og venter på behandling.",
  investigating: "Feil er bekreftet og saken undersøkes av produsent eller tekniker.",
  approved: "Garantikravet er godkjent av produsenten.",
  rejected: "Garantikravet er avvist. Dokumenter årsak i løsningsfeltet.",
  resolved: "Saken er løst og avsluttet.",
};

export default function WarrantyFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { tenantId, user } = useAuth();

  const [form, setForm] = useState(EMPTY_FORM);
  const [warrantyNumber, setWarrantyNumber] = useState("");
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [assets, setAssets] = useState<{ id: string; manufacturer: string | null; model: string | null }[]>([]);

  useEffect(() => {
    if (!tenantId) return;
    supabase.from("crm_companies").select("id, name").eq("tenant_id", tenantId).is("deleted_at", null).order("name")
      .then(({ data }) => setCompanies(data || []));
  }, [tenantId]);

  useEffect(() => {
    if (!form.company_id || !tenantId) { setAssets([]); return; }
    supabase.from("customer_sites").select("id").eq("company_id", form.company_id).is("deleted_at", null)
      .then(({ data: sitesData }) => {
        if (!sitesData || sitesData.length === 0) { setAssets([]); return; }
        const siteIds = sitesData.map(s => s.id);
        supabase.from("hvac_assets").select("id, manufacturer, model").in("site_id", siteIds).eq("tenant_id", tenantId).is("deleted_at", null)
          .then(({ data }) => setAssets(data || []));
      });
  }, [form.company_id, tenantId]);

  useEffect(() => {
    if (!isEdit || !tenantId) return;
    supabase.from("warranty_cases").select("*, site:hvac_assets(site:customer_sites(company_id))").eq("id", id!).eq("tenant_id", tenantId).single()
      .then(({ data, error }) => {
        if (error || !data) { toast.error("Garantisak ikke funnet"); navigate("/tenant/crm/warranties"); return; }
        setWarrantyNumber(data.warranty_number || "");
        const companyId = (data as any).site?.site?.company_id || "";
        setForm({
          issue_description: data.issue_description || "",
          status: data.status || "open",
          manufacturer_ref: data.manufacturer_ref || "",
          resolution: data.resolution || "",
          company_id: companyId,
          asset_id: data.asset_id || "",
        });
        setLoading(false);
      });
  }, [id, isEdit, tenantId, navigate]);

  const set = (key: keyof typeof EMPTY_FORM, value: string) => setForm(f => ({ ...f, [key]: value }));
  const setCompany = (val: string) => setForm(f => ({ ...f, company_id: val, asset_id: "" }));

  const save = async () => {
    if (!tenantId || !form.issue_description.trim()) return;
    setSaving(true);
    try {
      const payload: any = {
        issue_description: form.issue_description.trim(),
        status: form.status as any,
        manufacturer_ref: form.manufacturer_ref || null,
        resolution: form.resolution || null,
        company_id: form.company_id || null,
        asset_id: form.asset_id || null,
      };
      let savedId = id;
      if (isEdit) {
        if (form.status === "resolved") payload.resolved_at = new Date().toISOString();
        const { error } = await supabase.from("warranty_cases").update(payload).eq("id", id!);
        if (error) throw error;
      } else {
        const genNumber = `GAR-${Date.now().toString(36).toUpperCase()}`;
        const { data: created, error } = await supabase.from("warranty_cases")
          .insert({ ...payload, tenant_id: tenantId, warranty_number: genNumber, created_by: user?.id } as any)
          .select("id").single();
        if (error) throw error;
        savedId = created.id;
      }
      toast.success(isEdit ? "Garantisak oppdatert" : "Garantisak opprettet");
      navigate(`/tenant/crm/warranty/${savedId}`);
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("row-level security") || msg.includes("policy")) {
        toast.error("Du har ikke tilgang til å utføre denne handlingen.");
      } else {
        toast.error("Kunne ikke lagre");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const pageTitle = isEdit ? `Rediger ${warrantyNumber || "garantisak"}` : "Ny garantisak";

  const SaveButton = () => (
    <Button onClick={save} disabled={saving || !form.issue_description.trim()} className="gap-2">
      {saving && <Loader2 className="h-4 w-4 animate-spin" />}
      {isEdit ? "Lagre endringer" : "Opprett garantisak"}
    </Button>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Topprad */}
      <div className="flex items-center justify-between gap-4">
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground min-w-0">
          <Link to="/tenant/crm/warranties" className="hover:text-foreground transition-colors shrink-0">Garantisaker</Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          <span className="text-foreground font-medium truncate">{pageTitle}</span>
        </nav>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" onClick={() => navigate(isEdit ? `/tenant/crm/warranty/${id}` : "/tenant/crm/warranties")}>
            Avbryt
          </Button>
          <SaveButton />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* Venstre: skjema */}
        <div className="lg:col-span-2 space-y-4">

          {/* Saksinformasjon */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <p className="text-sm font-semibold">Saksinformasjon</p>
            <div className="space-y-1.5">
              <Label>Feilbeskrivelse <span className="text-destructive">*</span></Label>
              <Textarea
                value={form.issue_description}
                onChange={e => set("issue_description", e.target.value)}
                placeholder="Beskriv feilen eller problemet kunden opplever..."
                rows={3}
                className={cn(!form.issue_description.trim() && "border-destructive/40")}
                autoFocus={!isEdit}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
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
              <div className="space-y-1.5">
                <Label>Produsentens referanse</Label>
                <Input
                  value={form.manufacturer_ref}
                  onChange={e => set("manufacturer_ref", e.target.value)}
                  placeholder="Saksnr hos produsent..."
                />
              </div>
            </div>
          </div>

          {/* Kunde og anlegg */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <p className="text-sm font-semibold">Kunde og anlegg</p>
            <div className="space-y-1.5">
              <Label>Kunde</Label>
              <Select value={form.company_id || "none"} onValueChange={v => setCompany(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Velg kunde..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ingen kunde</SelectItem>
                  {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Anlegg (varmepumpe)</Label>
              <Select
                value={form.asset_id || "none"}
                onValueChange={v => set("asset_id", v === "none" ? "" : v)}
                disabled={!form.company_id || assets.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={!form.company_id ? "Velg kunde først" : assets.length === 0 ? "Ingen anlegg funnet" : "Velg anlegg..."} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Intet anlegg</SelectItem>
                  {assets.map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      {[a.manufacturer, a.model].filter(Boolean).join(" ") || "Ukjent anlegg"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Løsning */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <p className="text-sm font-semibold">Løsning og oppfølging</p>
            <div className="space-y-1.5">
              <Label>Løsning / resultat</Label>
              <Textarea
                value={form.resolution}
                onChange={e => set("resolution", e.target.value)}
                placeholder="Hva ble utfallet av garantisaken..."
                rows={3}
              />
            </div>
          </div>

          {/* Bunn */}
          <div className="flex items-center justify-end gap-2 pt-2 pb-6">
            <Button variant="outline" onClick={() => navigate(isEdit ? `/tenant/crm/warranty/${id}` : "/tenant/crm/warranties")}>
              Avbryt
            </Button>
            <SaveButton />
          </div>
        </div>

        {/* Høyre: hjelpepanel */}
        <div className="lg:col-span-1 space-y-4">

          {/* Status-hjelp */}
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <ShieldAlert className="h-3.5 w-3.5 text-primary" />
              </div>
              <p className="text-sm font-semibold">{WARRANTY_STATUS_LABELS[form.status] || "Status"}</p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {STATUS_HELP[form.status] || ""}
            </p>
          </div>

          {/* Hva dekkes */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs font-medium text-muted-foreground">Hva dekkes av garanti?</p>
            </div>
            <div className="space-y-1.5 text-xs text-muted-foreground leading-relaxed">
              <p>✓ Fabrikasjonsfeil og materialsvikt</p>
              <p>✓ Kompressorfeil innen garantiperioden</p>
              <p>✗ Frostskader og feilmontering</p>
              <p>✗ Slitasjedeler (filter, fjernkontroll)</p>
              <p>✗ Skader etter inngrep av ukvalifisert personell</p>
            </div>
          </div>

          {/* Tips */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Tips</p>
            <div className="space-y-1.5 text-xs text-muted-foreground leading-relaxed">
              <p>Ta bilde av feilkoden før du registrerer saken.</p>
              <p>Noter produsentens referansenummer så snart du har det.</p>
              <p>Koble til riktig anlegg for å hente serienummer og garantihistorikk automatisk.</p>
            </div>
          </div>

          {/* Obligatoriske felt */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Obligatoriske felt</p>
            <div className={cn("flex items-center gap-1.5 text-xs", form.issue_description.trim() ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", form.issue_description.trim() ? "bg-emerald-500" : "bg-muted-foreground/30")} />
              Feilbeskrivelse {form.issue_description.trim() ? "✓" : "(påkrevd)"}
            </div>
            <p className="text-xs text-muted-foreground/60">Alle andre felt er valgfrie</p>
          </div>
        </div>
      </div>
    </div>
  );
}
