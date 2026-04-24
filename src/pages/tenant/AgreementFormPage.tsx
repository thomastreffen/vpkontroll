import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronRight, Loader2, ScrollText, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import {
  AGREEMENT_STATUS_LABELS,
  AGREEMENT_INTERVAL_LABELS,
  getIntervalMonths,
} from "@/lib/domain-labels";
import { cn } from "@/lib/utils";
import { addMonths, format } from "date-fns";

const EMPTY_FORM = {
  status: "active",
  start_date: "",
  end_date: "",
  company_id: "",
  site_id: "",
  asset_id: "",
  interval: "annual",
  custom_interval_months: "",
  annual_price: "",
  scope_description: "",
  notes: "",
  service_template_id: "",
};

const INTERVAL_DESCRIPTIONS: Record<string, string> = {
  monthly:     "Service én gang per måned. Egnet for kritiske kommersielle installasjoner med høy driftstid.",
  quarterly:   "Service fire ganger i året. For intensivt brukte varmepumper i næringsbygg.",
  semi_annual: "Service to ganger i året. Anbefalt for de fleste varmepumper i private boliger.",
  annual:      "Én full service per år. Den vanligste typen for private eneboliger og leiligheter.",
  biennial:    "Service hvert annet år. Egnet for nyere anlegg med lett bruk og god historikk.",
  custom:      "Tilpasset intervall – angi antall måneder mellom hvert servicebesøk.",
};

const STATUS_FLOW: { key: string; label: string }[] = [
  { key: "active",    label: "Aktiv" },
  { key: "paused",    label: "Pauset" },
  { key: "expired",   label: "Utløpt" },
  { key: "cancelled", label: "Kansellert" },
];

export default function AgreementFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { tenantId, user } = useAuth();

  const [form, setForm] = useState(EMPTY_FORM);
  const [originalNumber, setOriginalNumber] = useState("");
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  const [companies,  setCompanies]  = useState<{ id: string; name: string }[]>([]);
  const [sites,      setSites]      = useState<{ id: string; name: string | null; address: string | null }[]>([]);
  const [assets,     setAssets]     = useState<{ id: string; manufacturer: string | null; model: string | null }[]>([]);
  const [templates,  setTemplates]  = useState<{ id: string; name: string; is_default: boolean }[]>([]);

  // Load companies + templates on mount
  useEffect(() => {
    if (!tenantId) return;
    supabase.from("crm_companies").select("id, name").eq("tenant_id", tenantId).is("deleted_at", null).order("name")
      .then(({ data }) => setCompanies(data || []));
    supabase.from("service_templates" as any).select("id, name, is_default").eq("tenant_id", tenantId).eq("is_active", true).order("name")
      .then(({ data }) => setTemplates((data as any[]) || []));
  }, [tenantId]);

  // Load sites when company changes
  useEffect(() => {
    if (!form.company_id) { setSites([]); return; }
    supabase.from("customer_sites").select("id, name, address").eq("company_id", form.company_id).is("deleted_at", null).order("name")
      .then(({ data }) => setSites(data || []));
  }, [form.company_id]);

  // Load assets when site changes
  useEffect(() => {
    if (!form.site_id) { setAssets([]); return; }
    supabase.from("hvac_assets").select("id, manufacturer, model").eq("site_id", form.site_id).is("deleted_at", null)
      .then(({ data }) => setAssets(data || []));
  }, [form.site_id]);

  // Load agreement in edit mode
  useEffect(() => {
    if (!isEdit || !tenantId) return;
    supabase.from("service_agreements").select("*").eq("id", id!).eq("tenant_id", tenantId).single()
      .then(({ data, error }) => {
        if (error || !data) { toast.error("Avtale ikke funnet"); navigate("/tenant/crm/agreements"); return; }
        setOriginalNumber((data as any).agreement_number || "");
        setForm({
          status:                (data as any).status || "active",
          start_date:            (data as any).start_date || "",
          end_date:              (data as any).end_date || "",
          company_id:            (data as any).company_id || "",
          site_id:               (data as any).site_id || "",
          asset_id:              (data as any).asset_id || "",
          interval:              (data as any).interval || "annual",
          custom_interval_months: (data as any).custom_interval_months?.toString() || "",
          annual_price:          (data as any).annual_price?.toString() || "",
          scope_description:     (data as any).scope_description || "",
          notes:                 (data as any).notes || "",
          service_template_id:   (data as any).service_template_id || "",
        });
        setLoading(false);
      });
  }, [id, isEdit, tenantId, navigate]);

  const set = (key: keyof typeof EMPTY_FORM, value: string) => setForm(f => ({ ...f, [key]: value }));

  const setCompany = (val: string) => setForm(f => ({ ...f, company_id: val, site_id: "", asset_id: "" }));
  const setSite    = (val: string) => setForm(f => ({ ...f, site_id: val, asset_id: "" }));

  const save = async () => {
    if (!tenantId || !form.company_id || !form.start_date) return;
    setSaving(true);
    try {
      const payload: any = {
        tenant_id:             tenantId,
        status:                form.status,
        start_date:            form.start_date,
        end_date:              form.end_date   || null,
        company_id:            form.company_id,
        site_id:               form.site_id    || null,
        asset_id:              form.asset_id   || null,
        interval:              form.interval,
        custom_interval_months: form.interval === "custom" ? (parseInt(form.custom_interval_months) || null) : null,
        annual_price:          form.annual_price ? parseFloat(form.annual_price) : null,
        scope_description:     form.scope_description || null,
        notes:                 form.notes       || null,
        service_template_id:   form.service_template_id || null,
      };

      let savedId = id;

      if (isEdit) {
        const { error } = await supabase.from("service_agreements").update(payload).eq("id", id!);
        if (error) throw error;
      } else {
        const { data: created, error } = await supabase
          .from("service_agreements")
          .insert({ ...payload, agreement_number: "SA-TEMP", next_visit_due: form.start_date, created_by: user?.id })
          .select("id")
          .single();
        if (error) throw error;
        savedId = created.id;
      }

      toast.success(isEdit ? "Avtale oppdatert" : "Serviceavtale opprettet");
      navigate(`/tenant/crm/agreements/${savedId}`);
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
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const pageTitle = isEdit ? `Rediger ${originalNumber || "avtale"}` : "Ny serviceavtale";
  const canSave   = !!form.company_id && !!form.start_date;

  // Next visit projection
  const nextVisitDate = form.start_date
    ? format(
        addMonths(
          new Date(form.start_date),
          isEdit ? getIntervalMonths(form.interval, parseInt(form.custom_interval_months) || null) : 0,
        ),
        "dd.MM.yyyy",
      )
    : null;

  const firstVisitDate = form.start_date ? format(new Date(form.start_date), "dd.MM.yyyy") : null;

  const currentStatusIndex = STATUS_FLOW.findIndex(s => s.key === form.status);

  const SaveButton = () => (
    <Button onClick={save} disabled={saving || !canSave} className="gap-2">
      {saving && <Loader2 className="h-4 w-4 animate-spin" />}
      {isEdit ? "Lagre endringer" : "Opprett avtale"}
    </Button>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Topptekst */}
      <div className="flex items-center justify-between gap-4">
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground min-w-0">
          <Link to="/tenant/crm/agreements" className="hover:text-foreground transition-colors shrink-0">Serviceavtaler</Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          <span className="text-foreground font-medium truncate">{pageTitle}</span>
        </nav>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" onClick={() => navigate(isEdit ? `/tenant/crm/agreements/${id}` : "/tenant/crm/agreements")}>
            Avbryt
          </Button>
          <SaveButton />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* Venstre: skjema (2/3) */}
        <div className="lg:col-span-2 space-y-4">

          {/* Avtaleinformasjon */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <p className="text-sm font-semibold">Avtaleinformasjon</p>
            {isEdit && originalNumber && (
              <div className="space-y-1.5">
                <Label>Avtalenummer</Label>
                <Input value={originalNumber} readOnly className="bg-muted/40 text-muted-foreground" />
              </div>
            )}
            {!isEdit && (
              <div className="space-y-1.5">
                <Label>Avtalenummer</Label>
                <Input value="Genereres automatisk" readOnly className="bg-muted/40 text-muted-foreground" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
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
              <div className="space-y-1.5">
                <Label>Servicemal</Label>
                <Select value={form.service_template_id || "none"} onValueChange={v => set("service_template_id", v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Ingen mal valgt" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ingen mal</SelectItem>
                    {templates.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}{t.is_default ? " ★" : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Startdato <span className="text-destructive">*</span></Label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={e => set("start_date", e.target.value)}
                  className={cn(!form.start_date && "border-destructive/40")}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Sluttdato</Label>
                <Input
                  type="date"
                  value={form.end_date}
                  onChange={e => set("end_date", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">La stå tom for løpende avtale</p>
              </div>
            </div>
          </div>

          {/* Kunde og anlegg */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <p className="text-sm font-semibold">Kunde og anlegg</p>
            <div className="space-y-1.5">
              <Label>Kunde <span className="text-destructive">*</span></Label>
              <Select
                value={form.company_id || "none"}
                onValueChange={v => setCompany(v === "none" ? "" : v)}
              >
                <SelectTrigger className={cn(!form.company_id && "border-destructive/40")}>
                  <SelectValue placeholder="Velg kunde..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ingen kunde</SelectItem>
                  {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Anleggssted</Label>
              <Select
                value={form.site_id || "none"}
                onValueChange={v => setSite(v === "none" ? "" : v)}
                disabled={!form.company_id || sites.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    !form.company_id ? "Velg kunde først"
                    : sites.length === 0 ? "Ingen anleggssteder"
                    : "Velg anleggssted..."
                  } />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Intet sted</SelectItem>
                  {sites.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name || s.address || s.id}{s.name && s.address ? ` — ${s.address}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Anlegg (varmepumpe)</Label>
              <Select
                value={form.asset_id || "none"}
                onValueChange={v => set("asset_id", v === "none" ? "" : v)}
                disabled={!form.site_id || assets.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    !form.site_id ? "Velg anleggssted først"
                    : assets.length === 0 ? "Ingen anlegg"
                    : "Velg anlegg..."
                  } />
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

          {/* Serviceintervall */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <p className="text-sm font-semibold">Serviceintervall</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Intervall</Label>
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
                <div className="space-y-1.5">
                  <Label>Antall måneder</Label>
                  <Input
                    type="number"
                    min="1"
                    max="60"
                    value={form.custom_interval_months}
                    onChange={e => set("custom_interval_months", e.target.value)}
                    placeholder="F.eks. 18"
                  />
                  {form.custom_interval_months && (
                    <p className="text-xs text-muted-foreground">Service hver {form.custom_interval_months}. måned</p>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label>Neste besøk (dato)</Label>
                  <Input
                    type="date"
                    value={form.start_date}
                    readOnly
                    className="bg-muted/40 text-muted-foreground"
                  />
                  <p className="text-xs text-muted-foreground">Settes til startdato, oppdateres etter hvert besøk</p>
                </div>
              )}
            </div>
          </div>

          {/* Pris og fakturering */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <p className="text-sm font-semibold">Pris og fakturering</p>
            <div className="space-y-1.5">
              <Label>Pris per år (NOK)</Label>
              <Input
                type="number"
                min="0"
                step="100"
                value={form.annual_price}
                onChange={e => set("annual_price", e.target.value)}
                placeholder="F.eks. 2500"
              />
              <p className="text-xs text-muted-foreground">Oppgis eks. mva. Fakturering håndteres utenfor systemet.</p>
            </div>
          </div>

          {/* Notater og tilleggsinformasjon */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <p className="text-sm font-semibold">Notater og tilleggsinformasjon</p>
            <div className="space-y-1.5">
              <Label>Omfang / hva avtalen dekker</Label>
              <Textarea
                value={form.scope_description}
                onChange={e => set("scope_description", e.target.value)}
                placeholder="F.eks. Full service inkl. filter, drenering, trykktest og funksjonskontroll..."
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Interne notater</Label>
              <Textarea
                value={form.notes}
                onChange={e => set("notes", e.target.value)}
                placeholder="Interne notater — vises ikke til kunden"
                rows={2}
              />
            </div>
          </div>

          {/* Bunn: lagre */}
          <div className="flex items-center justify-end gap-2 pt-2 pb-6">
            <Button variant="outline" onClick={() => navigate(isEdit ? `/tenant/crm/agreements/${id}` : "/tenant/crm/agreements")}>
              Avbryt
            </Button>
            <SaveButton />
          </div>
        </div>

        {/* Høyre: hjelpepanel (1/3) */}
        <div className="lg:col-span-1 space-y-4">

          {/* Intervall-forklaring */}
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <ScrollText className="h-3.5 w-3.5 text-primary" />
              </div>
              <p className="text-sm font-semibold">{AGREEMENT_INTERVAL_LABELS[form.interval] || "Intervall"}</p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {INTERVAL_DESCRIPTIONS[form.interval] || ""}
            </p>
          </div>

          {/* Neste besøk-beregning */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs font-medium text-muted-foreground">Serviceplan</p>
            </div>
            {form.start_date ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                  <span className="text-foreground font-medium">Første besøk: {firstVisitDate}</span>
                </div>
                {!isEdit && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/20 shrink-0" />
                    <span>
                      Neste etter: {format(
                        addMonths(new Date(form.start_date), getIntervalMonths(form.interval, parseInt(form.custom_interval_months) || null)),
                        "dd.MM.yyyy"
                      )}
                    </span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground/60 pt-1">
                  Servicebesøk genereres automatisk daglig basert på intervall og forfall.
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground/60">Velg startdato for å se serviceplan</p>
            )}
          </div>

          {/* Avtalen inkluderer */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">En serviceavtale inkluderer</p>
            <ul className="space-y-1.5">
              {[
                "Automatisk generering av servicebesøk",
                "Servicebesøk med rapport og signering",
                "Historikk over alle utførte besøk",
                "Integrert ressursplanlegging",
              ].map(item => (
                <li key={item} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Obligatoriske felt */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Obligatoriske felt</p>
            <div className={cn("flex items-center gap-1.5 text-xs", form.company_id ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", form.company_id ? "bg-emerald-500" : "bg-muted-foreground/30")} />
              Kunde {form.company_id ? "✓" : "(påkrevd)"}
            </div>
            <div className={cn("flex items-center gap-1.5 text-xs", form.start_date ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", form.start_date ? "bg-emerald-500" : "bg-muted-foreground/30")} />
              Startdato {form.start_date ? "✓" : "(påkrevd)"}
            </div>
            <p className="text-xs text-muted-foreground/60">Alle andre felt er valgfrie</p>
          </div>
        </div>
      </div>
    </div>
  );
}
