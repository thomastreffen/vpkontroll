import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronRight, Loader2, Cpu } from "lucide-react";
import { toast } from "sonner";
import { ENERGY_SOURCE_LABELS, ASSET_STATUS_LABELS } from "@/lib/domain-labels";
import { cn } from "@/lib/utils";

const EMPTY_FORM = {
  manufacturer: "",
  model: "",
  serial_number: "",
  energy_source: "air_water",
  nominal_kw: "",
  indoor_unit_model: "",
  refrigerant_type: "",
  refrigerant_kg: "",
  outdoor_unit_location: "",
  installed_at: "",
  warranty_expires_at: "",
  status: "operational",
  notes: "",
  company_id: "",
  site_id: "",
};

const COMMON_MANUFACTURERS = [
  "Mitsubishi Electric", "Daikin", "Panasonic", "LG",
  "Samsung", "Hitachi", "Fujitsu", "Bosch", "Nibe", "Vaillant",
];

export default function AssetFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { tenantId, user } = useAuth();

  const [form, setForm] = useState(EMPTY_FORM);
  const [originalLabel, setOriginalLabel] = useState("");
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [sites, setSites] = useState<{ id: string; name: string | null; address: string | null }[]>([]);

  useEffect(() => {
    if (!tenantId) return;
    supabase.from("crm_companies").select("id, name").eq("tenant_id", tenantId).is("deleted_at", null).order("name")
      .then(({ data }) => setCompanies(data || []));
  }, [tenantId]);

  useEffect(() => {
    if (!form.company_id) { setSites([]); return; }
    supabase.from("customer_sites").select("id, name, address").eq("company_id", form.company_id).is("deleted_at", null).order("name")
      .then(({ data }) => setSites(data || []));
  }, [form.company_id]);

  useEffect(() => {
    if (!isEdit || !tenantId) return;
    supabase.from("hvac_assets")
      .select("*, site:customer_sites(id, name, address, company_id)")
      .eq("id", id!).eq("tenant_id", tenantId).single()
      .then(({ data, error }) => {
        if (error || !data) { toast.error("Anlegg ikke funnet"); navigate("/tenant/crm/assets"); return; }
        const label = [data.manufacturer, data.model].filter(Boolean).join(" ") || data.serial_number || "anlegg";
        setOriginalLabel(label);
        setForm({
          manufacturer: data.manufacturer || "",
          model: data.model || "",
          serial_number: data.serial_number || "",
          energy_source: data.energy_source || "air_water",
          nominal_kw: data.nominal_kw?.toString() || "",
          indoor_unit_model: data.indoor_unit_model || "",
          refrigerant_type: data.refrigerant_type || "",
          refrigerant_kg: data.refrigerant_kg?.toString() || "",
          outdoor_unit_location: data.outdoor_unit_location || "",
          installed_at: data.installed_at || "",
          warranty_expires_at: data.warranty_expires_at || "",
          status: data.status || "operational",
          notes: data.notes || "",
          company_id: (data as any).site?.company_id || "",
          site_id: data.site_id || "",
        });
        setLoading(false);
      });
  }, [id, isEdit, tenantId, navigate]);

  const set = (key: keyof typeof EMPTY_FORM, value: string) => setForm(f => ({ ...f, [key]: value }));
  const setCompany = (val: string) => setForm(f => ({ ...f, company_id: val, site_id: "" }));

  const save = async () => {
    if (!tenantId || !form.site_id) return;
    setSaving(true);
    try {
      const payload: any = {
        manufacturer: form.manufacturer || null,
        model: form.model || null,
        serial_number: form.serial_number || null,
        energy_source: form.energy_source as any,
        nominal_kw: form.nominal_kw ? parseFloat(form.nominal_kw) : null,
        indoor_unit_model: form.indoor_unit_model || null,
        refrigerant_type: form.refrigerant_type || null,
        refrigerant_kg: form.refrigerant_kg ? parseFloat(form.refrigerant_kg) : null,
        outdoor_unit_location: form.outdoor_unit_location || null,
        installed_at: form.installed_at || null,
        warranty_expires_at: form.warranty_expires_at || null,
        status: form.status as any,
        notes: form.notes || null,
        site_id: form.site_id,
      };
      let savedId = id;
      if (isEdit) {
        const { error } = await supabase.from("hvac_assets").update(payload).eq("id", id!);
        if (error) throw error;
      } else {
        const { data: created, error } = await supabase.from("hvac_assets")
          .insert({ ...payload, tenant_id: tenantId, created_by: user?.id })
          .select("id").single();
        if (error) throw error;
        savedId = created.id;
      }
      toast.success(isEdit ? "Anlegg oppdatert" : "Anlegg opprettet");
      navigate(`/tenant/crm/assets/${savedId}`);
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

  const pageTitle = isEdit ? `Rediger ${originalLabel}` : "Nytt anlegg";

  const SaveButton = () => (
    <Button onClick={save} disabled={saving || !form.site_id} className="gap-2">
      {saving && <Loader2 className="h-4 w-4 animate-spin" />}
      {isEdit ? "Lagre endringer" : "Opprett anlegg"}
    </Button>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Topprad */}
      <div className="flex items-center justify-between gap-4">
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground min-w-0">
          <Link to="/tenant/crm/assets" className="hover:text-foreground transition-colors shrink-0">Anlegg</Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          <span className="text-foreground font-medium truncate">{pageTitle}</span>
        </nav>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" onClick={() => navigate(isEdit ? `/tenant/crm/assets/${id}` : "/tenant/crm/assets")}>
            Avbryt
          </Button>
          <SaveButton />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* Venstre: skjema */}
        <div className="lg:col-span-2 space-y-4">

          {/* Anleggsinformasjon */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <p className="text-sm font-semibold">Anleggsinformasjon</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Produsent</Label>
                <Input value={form.manufacturer} onChange={e => set("manufacturer", e.target.value)} placeholder="F.eks. Mitsubishi Electric" />
              </div>
              <div className="space-y-1.5">
                <Label>Modell (utedel)</Label>
                <Input value={form.model} onChange={e => set("model", e.target.value)} placeholder="F.eks. SUZ-SWK50VA" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Serienummer</Label>
                <Input value={form.serial_number} onChange={e => set("serial_number", e.target.value)} placeholder="Finnes på typeplate utedel" />
              </div>
              <div className="space-y-1.5">
                <Label>Innedel modell</Label>
                <Input value={form.indoor_unit_model} onChange={e => set("indoor_unit_model", e.target.value)} placeholder="F.eks. MSZ-LN50VGW" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Type (energikilde)</Label>
              <Select value={form.energy_source} onValueChange={v => set("energy_source", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ENERGY_SOURCE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Plassering */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <p className="text-sm font-semibold">
              Plassering{" "}
              <span className="text-xs font-normal text-destructive">(anleggssted påkrevd)</span>
            </p>
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
              <Label>Anleggssted <span className="text-destructive">*</span></Label>
              <Select
                value={form.site_id || "none"}
                onValueChange={v => set("site_id", v === "none" ? "" : v)}
                disabled={!form.company_id || sites.length === 0}
              >
                <SelectTrigger className={cn(!form.site_id && "border-destructive/40")}>
                  <SelectValue placeholder={
                    !form.company_id ? "Velg kunde først"
                      : sites.length === 0 ? "Ingen anleggssteder"
                        : "Velg anleggssted..."
                  } />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Velg anleggssted</SelectItem>
                  {sites.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}{s.address ? ` — ${s.address}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Utedel plassering</Label>
              <Input value={form.outdoor_unit_location} onChange={e => set("outdoor_unit_location", e.target.value)} placeholder="F.eks. Sydvegg, baksiden av huset" />
            </div>
          </div>

          {/* Tekniske detaljer */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <p className="text-sm font-semibold">Tekniske detaljer</p>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Effekt (kW)</Label>
                <Input type="number" step="0.1" value={form.nominal_kw} onChange={e => set("nominal_kw", e.target.value)} placeholder="5.0" />
              </div>
              <div className="space-y-1.5">
                <Label>Kuldemedium</Label>
                <Input value={form.refrigerant_type} onChange={e => set("refrigerant_type", e.target.value)} placeholder="R32, R410A..." />
              </div>
              <div className="space-y-1.5">
                <Label>Mengde (kg)</Label>
                <Input type="number" step="0.01" value={form.refrigerant_kg} onChange={e => set("refrigerant_kg", e.target.value)} placeholder="1.1" />
              </div>
            </div>
            <div className="space-y-1.5">
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
          </div>

          {/* Garanti og service */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <p className="text-sm font-semibold">Garanti og service</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Installasjonsdato</Label>
                <Input type="date" value={form.installed_at} onChange={e => set("installed_at", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Garantiutløp</Label>
                <Input type="date" value={form.warranty_expires_at} onChange={e => set("warranty_expires_at", e.target.value)} />
              </div>
            </div>
          </div>

          {/* Notater */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <p className="text-sm font-semibold">Notater</p>
            <div className="space-y-1.5">
              <Label>Interne notater</Label>
              <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Tilleggsinformasjon om anlegget..." rows={3} />
            </div>
          </div>

          {/* Bunn */}
          <div className="flex items-center justify-end gap-2 pt-2 pb-6">
            <Button variant="outline" onClick={() => navigate(isEdit ? `/tenant/crm/assets/${id}` : "/tenant/crm/assets")}>
              Avbryt
            </Button>
            <SaveButton />
          </div>
        </div>

        {/* Høyre: hjelpepanel */}
        <div className="lg:col-span-1 space-y-4">

          {/* Intro */}
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Cpu className="h-3.5 w-3.5 text-primary" />
              </div>
              <p className="text-sm font-semibold">{isEdit ? "Rediger anlegg" : "Nytt anlegg"}</p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Et anlegg er en varmepumpe eller HVAC-enhet installert hos en kunde. Det knyttes til et anleggssted og brukes for servicehistorikk, garantisaker og planlagte besøk.
            </p>
          </div>

          {/* Vanlige produsenter */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <p className="text-xs font-medium text-muted-foreground">Vanlige produsenter</p>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_MANUFACTURERS.map(m => (
                <button
                  key={m}
                  type="button"
                  className={cn(
                    "px-2 py-1 text-xs rounded border transition-all",
                    form.manufacturer === m
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border hover:border-primary/40"
                  )}
                  onClick={() => set("manufacturer", m)}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Tips om utfylling</p>
            <div className="space-y-1.5 text-xs text-muted-foreground leading-relaxed">
              <p>Serienummer finnes på typeplaten på utedelen.</p>
              <p>Kuldemedium og mengde er påkrevd i f-gass-sertifisering og refyllingslogg.</p>
              <p>Sett riktig garantiutløp for automatisk varsling ved garantisaker.</p>
            </div>
          </div>

          {/* Obligatoriske felt */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Obligatoriske felt</p>
            <div className={cn("flex items-center gap-1.5 text-xs", form.site_id ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", form.site_id ? "bg-emerald-500" : "bg-muted-foreground/30")} />
              Anleggssted {form.site_id ? "✓" : "(påkrevd)"}
            </div>
            <p className="text-xs text-muted-foreground/60">Alle andre felt er valgfrie</p>
          </div>
        </div>
      </div>
    </div>
  );
}
