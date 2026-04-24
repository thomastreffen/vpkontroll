import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronRight, Loader2, Briefcase, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { JOB_TYPE_LABELS, JOB_STATUS_LABELS, JOB_STATUS_COLORS } from "@/lib/domain-labels";
import { CASE_PRIORITY_LABELS } from "@/lib/case-labels";
import { cn } from "@/lib/utils";

const EMPTY_FORM = {
  title: "",
  job_type: "installation",
  status: "planned",
  priority: "normal",
  company_id: "",
  site_id: "",
  asset_id: "",
  scheduled_start: "",
  scheduled_end: "",
  estimated_hours: "",
  description: "",
  notes: "",
};

const JOB_TYPE_DESCRIPTIONS: Record<string, string> = {
  installation:  "Montering av ny varmepumpe. Opprettes typisk fra en vunnet deal.",
  service:       "Planlagt vedlikehold. Genereres automatisk fra serviceavtaler.",
  repair:        "Akutt feilsøking og utbedring av eksisterende anlegg.",
  warranty:      "Garantiarbeid koblet til et anlegg. Opprettes fra garantisaker.",
  inspection:    "Befaring og tilstandsvurdering uten montasjearbeid.",
  decommission:  "Demontering og avvikling av anlegg som tas ut av drift.",
};

const STATUS_FLOW: { key: string; label: string }[] = [
  { key: "planned",     label: "Planlagt" },
  { key: "scheduled",   label: "Planlagt tid" },
  { key: "in_progress", label: "Under arbeid" },
  { key: "completed",   label: "Fullført" },
];

export default function JobFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { tenantId, user } = useAuth();

  const [form, setForm] = useState(EMPTY_FORM);
  const [technicianId, setTechnicianId] = useState("none");
  const [originalNumber, setOriginalNumber] = useState("");
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  const [companies, setCompanies]   = useState<{ id: string; name: string }[]>([]);
  const [sites, setSites]           = useState<{ id: string; name: string; address: string | null }[]>([]);
  const [assets, setAssets]         = useState<{ id: string; manufacturer: string | null; model: string | null }[]>([]);
  const [technicians, setTechnicians] = useState<{ id: string; name: string }[]>([]);

  // Load companies + technicians on mount
  useEffect(() => {
    if (!tenantId) return;
    supabase.from("crm_companies").select("id, name").eq("tenant_id", tenantId).is("deleted_at", null).order("name")
      .then(({ data }) => setCompanies(data || []));
    supabase.from("technicians").select("id, name").eq("tenant_id", tenantId).eq("is_active", true).order("name")
      .then(({ data }) => setTechnicians(data || []));
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

  // Load job in edit mode
  useEffect(() => {
    if (!isEdit || !tenantId) return;
    Promise.all([
      supabase.from("jobs").select("*").eq("id", id!).eq("tenant_id", tenantId).single(),
      supabase.from("job_technicians").select("technician_id").eq("job_id", id!).limit(1),
    ]).then(([{ data, error }, { data: jt }]) => {
      if (error || !data) { toast.error("Jobb ikke funnet"); navigate("/tenant/crm/jobs"); return; }
      setOriginalNumber(data.job_number || "");
      setForm({
        title:           data.title || "",
        job_type:        (data as any).job_type || "installation",
        status:          (data as any).status || "planned",
        priority:        (data as any).priority || "normal",
        company_id:      (data as any).company_id || "",
        site_id:         (data as any).site_id || "",
        asset_id:        (data as any).asset_id || "",
        scheduled_start: data.scheduled_start ? (data.scheduled_start as string).slice(0, 16) : "",
        scheduled_end:   data.scheduled_end   ? (data.scheduled_end   as string).slice(0, 16) : "",
        estimated_hours: (data as any).estimated_hours != null ? String((data as any).estimated_hours) : "",
        description:     (data as any).description || "",
        notes:           (data as any).notes || "",
      });
      if (jt && jt.length > 0) setTechnicianId(jt[0].technician_id);
      setLoading(false);
    });
  }, [id, isEdit, tenantId, navigate]);

  const set = (key: keyof typeof EMPTY_FORM, value: string) => setForm(f => ({ ...f, [key]: value }));

  const setCompany = (val: string) => setForm(f => ({ ...f, company_id: val, site_id: "", asset_id: "" }));
  const setSite    = (val: string) => setForm(f => ({ ...f, site_id: val, asset_id: "" }));

  const save = async () => {
    if (!tenantId || !form.title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        tenant_id:       tenantId,
        title:           form.title.trim(),
        job_type:        form.job_type        as any,
        status:          form.status          as any,
        priority:        form.priority        as any,
        company_id:      form.company_id      || null,
        site_id:         form.site_id         || null,
        asset_id:        form.asset_id        || null,
        scheduled_start: form.scheduled_start || null,
        scheduled_end:   form.scheduled_end   || null,
        estimated_hours: form.estimated_hours ? Number(form.estimated_hours) : null,
        description:     form.description     || null,
        notes:           form.notes           || null,
      };

      let savedId = id;

      if (isEdit) {
        const { error } = await supabase.from("jobs").update(payload as any).eq("id", id!);
        if (error) throw error;
        // Update technician
        await supabase.from("job_technicians").delete().eq("job_id", id!);
        if (technicianId && technicianId !== "none") {
          await supabase.from("job_technicians").insert({ job_id: id!, technician_id: technicianId } as any);
        }
      } else {
        const { data: created, error } = await supabase
          .from("jobs")
          .insert({ ...payload, created_by: user?.id } as any)
          .select("id")
          .single();
        if (error) throw error;
        savedId = created.id;
        if (technicianId && technicianId !== "none") {
          await supabase.from("job_technicians").insert({ job_id: savedId!, technician_id: technicianId } as any);
        }
      }

      toast.success(isEdit ? "Jobb oppdatert" : "Jobb opprettet");
      navigate(`/tenant/crm/jobs/${savedId}`);
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

  const pageTitle = isEdit
    ? `Rediger ${originalNumber || "jobb"}`
    : "Ny jobb";

  const SaveButton = () => (
    <Button onClick={save} disabled={saving || !form.title.trim()} className="gap-2">
      {saving && <Loader2 className="h-4 w-4 animate-spin" />}
      {isEdit ? "Lagre endringer" : "Opprett jobb"}
    </Button>
  );

  const currentFlowIndex = STATUS_FLOW.findIndex(s => s.key === form.status);

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Topprad */}
      <div className="flex items-center justify-between gap-4">
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground min-w-0">
          <Link to="/tenant/crm/jobs" className="hover:text-foreground transition-colors shrink-0">Jobber</Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          <span className="text-foreground font-medium truncate">{pageTitle}</span>
        </nav>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" onClick={() => navigate(isEdit ? `/tenant/crm/jobs/${id}` : "/tenant/crm/jobs")}>
            Avbryt
          </Button>
          <SaveButton />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* Venstre: skjema */}
        <div className="lg:col-span-2 space-y-4">

          {/* Jobbinformasjon */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <p className="text-sm font-semibold">Jobbinformasjon</p>
            <div className="space-y-1.5">
              <Label>Tittel <span className="text-destructive">*</span></Label>
              <Input
                value={form.title}
                onChange={e => set("title", e.target.value)}
                placeholder="F.eks. Installasjon luft-luft varmepumpe"
                className={cn(!form.title.trim() && "border-destructive/40")}
                autoFocus={!isEdit}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Jobbtype</Label>
                <Select value={form.job_type} onValueChange={v => set("job_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(JOB_TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(JOB_STATUS_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Prioritet</Label>
                <Select value={form.priority} onValueChange={v => set("priority", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CASE_PRIORITY_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Kunde og sted */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <p className="text-sm font-semibold">Kunde og sted</p>
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
              <Label>Anleggssted</Label>
              <Select
                value={form.site_id || "none"}
                onValueChange={v => setSite(v === "none" ? "" : v)}
                disabled={!form.company_id || sites.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={!form.company_id ? "Velg kunde først" : sites.length === 0 ? "Ingen anleggssteder" : "Velg sted..."} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Intet sted</SelectItem>
                  {sites.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}{s.address ? ` — ${s.address}` : ""}
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
                  <SelectValue placeholder={!form.site_id ? "Velg anleggssted først" : assets.length === 0 ? "Ingen anlegg" : "Velg anlegg..."} />
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

          {/* Planlegging */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <p className="text-sm font-semibold">Planlegging</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Planlagt start</Label>
                <Input type="datetime-local" value={form.scheduled_start} onChange={e => set("scheduled_start", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Planlagt slutt</Label>
                <Input type="datetime-local" value={form.scheduled_end} onChange={e => set("scheduled_end", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Estimert tid (timer)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={form.estimated_hours}
                  onChange={e => set("estimated_hours", e.target.value)}
                  placeholder="F.eks. 3"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tildelt tekniker</Label>
                <Select value={technicianId} onValueChange={setTechnicianId}>
                  <SelectTrigger><SelectValue placeholder="Velg tekniker..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ingen tekniker</SelectItem>
                    {technicians.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Beskrivelse */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <p className="text-sm font-semibold">Beskrivelse og notater</p>
            <div className="space-y-1.5">
              <Label>Beskrivelse</Label>
              <Textarea
                value={form.description}
                onChange={e => set("description", e.target.value)}
                placeholder="Beskriv hva som skal gjøres..."
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
            <Button variant="outline" onClick={() => navigate(isEdit ? `/tenant/crm/jobs/${id}` : "/tenant/crm/jobs")}>
              Avbryt
            </Button>
            <SaveButton />
          </div>
        </div>

        {/* Høyre: hjelpepanel */}
        <div className="lg:col-span-1 space-y-4">

          {/* Jobbtype-forklaring */}
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Briefcase className="h-3.5 w-3.5 text-primary" />
              </div>
              <p className="text-sm font-semibold">{JOB_TYPE_LABELS[form.job_type] || "Jobbtype"}</p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {JOB_TYPE_DESCRIPTIONS[form.job_type] || ""}
            </p>
          </div>

          {/* Status-flyt */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <p className="text-xs font-medium text-muted-foreground">Status-flyt</p>
            <div className="space-y-1.5">
              {STATUS_FLOW.map((s, i) => {
                const isCurrent = s.key === form.status;
                const isPast = i < currentFlowIndex;
                return (
                  <div key={s.key} className="flex items-center gap-2">
                    <div className={cn(
                      "w-2 h-2 rounded-full shrink-0",
                      isCurrent ? "bg-primary" : isPast ? "bg-emerald-500" : "bg-muted-foreground/20"
                    )} />
                    <span className={cn(
                      "text-xs",
                      isCurrent ? "font-semibold text-foreground" : isPast ? "text-muted-foreground line-through" : "text-muted-foreground/60"
                    )}>
                      {s.label}
                    </span>
                    {i < STATUS_FLOW.length - 1 && (
                      <ArrowRight className="h-3 w-3 text-muted-foreground/20 ml-auto shrink-0" />
                    )}
                  </div>
                );
              })}
              {(form.status === "cancelled" || form.status === "on_hold") && (
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
                  <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                    {JOB_STATUS_LABELS[form.status]}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Obligatoriske felt */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Obligatoriske felt</p>
            <div className={cn("flex items-center gap-1.5 text-xs", form.title.trim() ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", form.title.trim() ? "bg-emerald-500" : "bg-muted-foreground/30")} />
              Tittel {form.title.trim() ? "✓" : "(påkrevd)"}
            </div>
            <p className="text-xs text-muted-foreground/60">Alle andre felt er valgfrie</p>
          </div>
        </div>
      </div>
    </div>
  );
}
