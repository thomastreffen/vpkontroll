import { useState, useEffect } from "react";
import { useNavigate, useParams, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronRight, Loader2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { DEAL_STAGE_LABELS, DEAL_STAGE_ORDER, DEAL_STAGE_BG, formatCurrency, type DealStage } from "@/lib/crm-labels";
import { ENERGY_SOURCE_LABELS } from "@/lib/domain-labels";

const EMPTY_FORM = {
  title: "",
  stage: "lead" as DealStage,
  value: "",
  expected_close_date: "",
  company_id: "",
  contact_id: "",
  energy_source: "",
  estimated_kw: "",
  description: "",
  owner_user_id: "",
};

const STAGE_INFO: Record<DealStage, { probability: number; tip: string; description: string }> = {
  lead: {
    probability: 10,
    description: "Et innkommende lead eller identifisert salgsmulighet som ikke er kvalifisert ennå.",
    tip: "Registrer grunnleggende informasjon og ta kontakt for å avklare behov og budsjett.",
  },
  qualified: {
    probability: 25,
    description: "Kunden har bekreftet behov og budsjett. Verdt å investere tid i.",
    tip: "Book befaring og samle teknisk informasjon om eksisterende anlegg.",
  },
  site_visit: {
    probability: 45,
    description: "Befaring er planlagt eller gjennomført. Teknisk vurdering pågår.",
    tip: "Fyll ut befaringsskjema og dokumenter funn. Bruk dette som grunnlag for tilbudet.",
  },
  quote_sent: {
    probability: 60,
    description: "Tilbud er sendt til kunden og avventer svar.",
    tip: "Følg opp etter 3–5 dager. Vær klar til å svare på spørsmål om pris og løsning.",
  },
  negotiation: {
    probability: 75,
    description: "Aktiv forhandling om pris, leveringstid eller løsning.",
    tip: "Vær fleksibel på levering, ikke bare pris. Fokuser på verdien løsningen gir.",
  },
  won: {
    probability: 100,
    description: "Salget er vunnet! Kunden har akseptert tilbudet.",
    tip: "Opprett jobb fra dette salget og start planlegging av installasjon.",
  },
  lost: {
    probability: 0,
    description: "Salget gikk ikke igjennom.",
    tip: "Registrer tapsgrunnen for å lære av erfaring og forbedre fremtidige salg.",
  },
};

export default function SalgFormPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { tenantId, user } = useAuth();

  const [form, setForm] = useState({ ...EMPTY_FORM, company_id: searchParams.get("company_id") || "" });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [contacts, setContacts] = useState<{ id: string; first_name: string; last_name: string | null; company_id: string | null }[]>([]);
  const [technicians, setTechnicians] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!tenantId) return;
    supabase.from("crm_companies").select("id, name").eq("tenant_id", tenantId).is("deleted_at", null).order("name")
      .then(({ data }) => setCompanies(data || []));
    supabase.from("technicians").select("id, name").eq("tenant_id", tenantId).eq("is_active", true).order("name")
      .then(({ data }) => setTechnicians(data || []));
    supabase.from("crm_contacts").select("id, first_name, last_name, company_id").eq("tenant_id", tenantId).is("deleted_at", null).order("first_name")
      .then(({ data }) => setContacts(data || []));
  }, [tenantId]);

  useEffect(() => {
    if (!isEdit || !id || !tenantId) return;
    supabase.from("crm_deals").select("*").eq("id", id).single().then(({ data }) => {
      if (!data) { setLoading(false); return; }
      setForm({
        title: data.title || "",
        stage: data.stage || "lead",
        value: data.value?.toString() || "",
        expected_close_date: data.expected_close_date || "",
        company_id: data.company_id || "",
        contact_id: data.contact_id || "",
        energy_source: data.energy_source || "",
        estimated_kw: data.estimated_kw?.toString() || "",
        description: data.description || "",
        owner_user_id: data.owner_user_id || "",
      });
      setLoading(false);
    });
  }, [isEdit, id, tenantId]);

  const filteredContacts = form.company_id
    ? contacts.filter(c => !c.company_id || c.company_id === form.company_id)
    : contacts;

  const stageInfo = STAGE_INFO[form.stage];
  const currentStageIndex = DEAL_STAGE_ORDER.indexOf(form.stage);

  const save = async () => {
    if (!tenantId || !form.title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        tenant_id: tenantId,
        title: form.title.trim(),
        stage: form.stage,
        value: form.value ? parseFloat(form.value) : null,
        expected_close_date: form.expected_close_date || null,
        company_id: form.company_id || null,
        contact_id: form.contact_id || null,
        energy_source: form.energy_source || null,
        estimated_kw: form.estimated_kw ? parseFloat(form.estimated_kw) : null,
        description: form.description || null,
        owner_user_id: form.owner_user_id || null,
        closed_at: (form.stage === "won" || form.stage === "lost") ? new Date().toISOString() : null,
      };
      if (isEdit) {
        const { error } = await supabase.from("crm_deals").update(payload as any).eq("id", id!);
        if (error) throw error;
        toast.success("Salg oppdatert");
      } else {
        const { error } = await supabase.from("crm_deals").insert({ ...payload, created_by: user?.id } as any);
        if (error) throw error;
        toast.success("Salg opprettet");
      }
      navigate("/tenant/crm/deals");
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("row-level security") || msg.includes("policy")) {
        toast.error("Du har ikke tilgang til å utføre denne handlingen.");
      } else {
        toast.error("Kunne ikke lagre: " + msg);
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

  const SaveButton = ({ className }: { className?: string }) => (
    <Button onClick={save} disabled={saving || !form.title.trim()} className={className}>
      {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
      {isEdit ? "Lagre endringer" : "Opprett salg"}
    </Button>
  );

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link to="/tenant/crm/deals" className="hover:text-foreground transition-colors">Salg</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">
          {isEdit ? `Rediger salg` : "Nytt salg"}
        </span>
      </nav>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEdit ? "Rediger salg" : "Nytt salg"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isEdit ? "Oppdater informasjonen om salget." : "Registrer en ny salgsmulighet i pipelinen."}
          </p>
        </div>
        <SaveButton />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left column: form */}
        <div className="lg:col-span-2 space-y-6">

          {/* Salgsinformasjon */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Salgsinformasjon</h2>

            <div className="space-y-1.5">
              <Label htmlFor="title">Tittel *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="F.eks. Daikin Altherma installasjon – Hansen"
                autoFocus={!isEdit}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Fase</Label>
                <Select value={form.stage} onValueChange={v => setForm(f => ({ ...f, stage: v as DealStage }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEAL_STAGE_ORDER.map(s => (
                      <SelectItem key={s} value={s}>{DEAL_STAGE_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="value">Verdi (NOK)</Label>
                <Input
                  id="value"
                  type="number"
                  value={form.value}
                  onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                  placeholder="150 000"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="expected_close_date">Forventet avslutningsdato</Label>
              <Input
                id="expected_close_date"
                type="date"
                value={form.expected_close_date}
                onChange={e => setForm(f => ({ ...f, expected_close_date: e.target.value }))}
              />
            </div>
          </div>

          {/* Kunde */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Kunde</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Kunde</Label>
                <Select value={form.company_id || "none"} onValueChange={v => setForm(f => ({ ...f, company_id: v === "none" ? "" : v, contact_id: "" }))}>
                  <SelectTrigger><SelectValue placeholder="Velg kunde" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ingen kunde</SelectItem>
                    {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Kontaktperson</Label>
                <Select value={form.contact_id || "none"} onValueChange={v => setForm(f => ({ ...f, contact_id: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Velg kontakt" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ingen kontakt</SelectItem>
                    {filteredContacts.map(c => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name || ""}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Produkt */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Produkt og teknisk</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Energikilde / varmepumpe-type</Label>
                <Select value={form.energy_source || "none"} onValueChange={v => setForm(f => ({ ...f, energy_source: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Velg type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ikke valgt</SelectItem>
                    {Object.entries(ENERGY_SOURCE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="estimated_kw">Estimert kapasitet (kW)</Label>
                <Input
                  id="estimated_kw"
                  type="number"
                  value={form.estimated_kw}
                  onChange={e => setForm(f => ({ ...f, estimated_kw: e.target.value }))}
                  placeholder="F.eks. 8"
                />
              </div>
            </div>
          </div>

          {/* Ansvarlig og notater */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Ansvarlig og notater</h2>

            {technicians.length > 0 && (
              <div className="space-y-1.5">
                <Label>Ansvarlig selger</Label>
                <Select value={form.owner_user_id || "none"} onValueChange={v => setForm(f => ({ ...f, owner_user_id: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Velg ansvarlig" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ikke tildelt</SelectItem>
                    {technicians.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="description">Notater / beskrivelse</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={4}
                placeholder="Detaljer om kunden, behov, spesielle hensyn..."
              />
            </div>
          </div>

          <div className="flex justify-end pb-6">
            <SaveButton />
          </div>
        </div>

        {/* Right column: help panel */}
        <div className="space-y-4">
          {/* Stage visual progress */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Salgsfase</h3>
            </div>

            {/* Progress steps */}
            <div className="space-y-1.5">
              {DEAL_STAGE_ORDER.map((s, i) => {
                const isActive = s === form.stage;
                const isPast = i < currentStageIndex;
                const info = STAGE_INFO[s];
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, stage: s }))}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors text-sm ${
                      isActive
                        ? "bg-primary/10 text-foreground font-medium ring-1 ring-primary/30"
                        : isPast
                          ? "bg-muted/50 text-muted-foreground"
                          : "hover:bg-muted/30 text-muted-foreground"
                    }`}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: isActive ? DEAL_STAGE_BG[s] : isPast ? DEAL_STAGE_BG[s] + "80" : undefined }}
                      {...(!isActive && !isPast ? { className: "w-2.5 h-2.5 rounded-full shrink-0 bg-muted-foreground/20" } : {})}
                    />
                    <span className="flex-1">{DEAL_STAGE_LABELS[s]}</span>
                    <span className={`text-[10px] tabular-nums ${isActive ? "text-primary font-semibold" : "text-muted-foreground/60"}`}>
                      {info.probability}%
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Probability bar */}
            <div>
              <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                <span>Sannsynlighet</span>
                <span className="font-semibold text-foreground">{stageInfo.probability}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${stageInfo.probability}%`,
                    backgroundColor: DEAL_STAGE_BG[form.stage],
                  }}
                />
              </div>
            </div>

            {/* Expected value */}
            {form.value && !isNaN(parseFloat(form.value)) && (
              <div className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
                <p className="text-muted-foreground text-xs">Vektet verdi</p>
                <p className="font-semibold">
                  {formatCurrency(parseFloat(form.value) * stageInfo.probability / 100)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {formatCurrency(parseFloat(form.value))} × {stageInfo.probability}%
                </p>
              </div>
            )}
          </div>

          {/* Phase tip */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h3 className="text-sm font-semibold">
              {DEAL_STAGE_LABELS[form.stage]} — hva nå?
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{stageInfo.description}</p>
            <div className="rounded-lg bg-primary/5 border border-primary/15 px-3 py-2.5">
              <p className="text-xs font-medium text-primary mb-0.5">Tips</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{stageInfo.tip}</p>
            </div>
          </div>

          {/* Required fields hint */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold mb-2">Krav</h3>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li className={`flex items-center gap-2 ${form.title.trim() ? "text-emerald-600" : ""}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${form.title.trim() ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
                Tittel
              </li>
              <li className={`flex items-center gap-2 ${form.company_id ? "text-emerald-600" : ""}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${form.company_id ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
                Kunde (anbefalt)
              </li>
              <li className={`flex items-center gap-2 ${form.value ? "text-emerald-600" : ""}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${form.value ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
                Verdi (anbefalt)
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
