import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ChevronRight, Building2, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { CUSTOMER_TYPE_LABELS } from "@/lib/domain-labels";
import { cn } from "@/lib/utils";

const EMPTY_FORM = {
  name: "",
  org_number: "",
  customer_type: "private",
  email: "",
  phone: "",
  website: "",
  address: "",
  postal_code: "",
  city: "",
  notes: "",
  enova_registered: false,
};

export default function CompanyFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { tenantId, user } = useAuth();

  const [form, setForm] = useState(EMPTY_FORM);
  const [originalName, setOriginalName] = useState("");
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit || !tenantId) return;
    supabase
      .from("crm_companies")
      .select("*")
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { toast.error("Kunde ikke funnet"); navigate("/tenant/crm/companies"); return; }
        setOriginalName(data.name);
        setForm({
          name: data.name || "",
          org_number: data.org_number || "",
          customer_type: (data as any).customer_type || "private",
          email: data.email || "",
          phone: data.phone || "",
          website: data.website || "",
          address: data.address || "",
          postal_code: data.postal_code || "",
          city: data.city || "",
          notes: data.notes || "",
          enova_registered: (data as any).enova_registered || false,
        });
        setLoading(false);
      });
  }, [id, isEdit, tenantId, navigate]);

  const set = (key: keyof typeof EMPTY_FORM, value: string | boolean) =>
    setForm(f => ({ ...f, [key]: value }));

  const save = async () => {
    if (!tenantId || !form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        tenant_id: tenantId,
        name: form.name.trim(),
        org_number: form.org_number || null,
        customer_type: form.customer_type as any,
        email: form.email || null,
        phone: form.phone || null,
        website: form.website || null,
        address: form.address || null,
        postal_code: form.postal_code || null,
        city: form.city || null,
        notes: form.notes || null,
        enova_registered: form.enova_registered,
      };

      if (isEdit) {
        const { error } = await supabase.from("crm_companies").update(payload as any).eq("id", id);
        if (error) throw error;
        toast.success("Kunde oppdatert");
        navigate(`/tenant/crm/companies/${id}`);
      } else {
        const { data: created, error } = await supabase
          .from("crm_companies")
          .insert({ ...payload, created_by: user?.id } as any)
          .select("id")
          .single();
        if (error) throw error;
        toast.success("Kunde opprettet");
        navigate(`/tenant/crm/companies/${created.id}`);
      }
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

  const pageTitle = isEdit ? `Rediger ${originalName || "kunde"}` : "Ny kunde";

  const SaveButton = ({ size = "default" }: { size?: "default" | "sm" }) => (
    <Button size={size} onClick={save} disabled={saving || !form.name.trim()} className="gap-2">
      {saving && <Loader2 className="h-4 w-4 animate-spin" />}
      {isEdit ? "Lagre endringer" : "Opprett kunde"}
    </Button>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Topptekst: breadcrumb + primær lagre-knapp */}
      <div className="flex items-center justify-between gap-4">
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground min-w-0">
          <Link to="/tenant/crm/companies" className="hover:text-foreground transition-colors shrink-0">
            Kunder
          </Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          <span className="text-foreground font-medium truncate">{pageTitle}</span>
        </nav>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" onClick={() => navigate(isEdit ? `/tenant/crm/companies/${id}` : "/tenant/crm/companies")}>
            Avbryt
          </Button>
          <SaveButton />
        </div>
      </div>

      {/* To-kolonne layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* Venstre: skjemafelt (2/3) */}
        <div className="lg:col-span-2 space-y-4">

          {/* Kundeinformasjon */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <p className="text-sm font-semibold text-foreground">Kundeinformasjon</p>
            <div className="space-y-1.5">
              <Label>Navn <span className="text-destructive">*</span></Label>
              <Input
                value={form.name}
                onChange={e => set("name", e.target.value)}
                placeholder="Kundens fulle navn eller selskapsnavn"
                className={cn(!form.name.trim() && "border-destructive/40")}
                autoFocus={!isEdit}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Kundetype</Label>
                <Select value={form.customer_type} onValueChange={v => set("customer_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CUSTOMER_TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Org.nummer</Label>
                <Input
                  value={form.org_number}
                  onChange={e => set("org_number", e.target.value)}
                  placeholder="999 999 999"
                />
              </div>
            </div>
          </div>

          {/* Kontaktinformasjon */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <p className="text-sm font-semibold text-foreground">Kontaktinformasjon</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>E-post</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={e => set("email", e.target.value)}
                  placeholder="epost@eksempel.no"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Telefon</Label>
                <Input
                  value={form.phone}
                  onChange={e => set("phone", e.target.value)}
                  placeholder="+47 000 00 000"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Nettside</Label>
              <Input
                value={form.website}
                onChange={e => set("website", e.target.value)}
                placeholder="https://eksempel.no"
              />
            </div>
          </div>

          {/* Adresse */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <p className="text-sm font-semibold text-foreground">Adresse</p>
            <div className="space-y-1.5">
              <Label>Gateadresse</Label>
              <AddressAutocomplete
                value={form.address}
                onChange={v => set("address", v)}
                onSelect={r => setForm(f => ({ ...f, address: r.address, postal_code: r.postalCode, city: r.city }))}
              />
              <p className="text-xs text-muted-foreground">Søk via Kartverket — postnr og by fylles automatisk</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Postnummer</Label>
                <Input
                  value={form.postal_code}
                  onChange={e => set("postal_code", e.target.value)}
                  placeholder="0000"
                  maxLength={4}
                />
              </div>
              <div className="space-y-1.5">
                <Label>By</Label>
                <Input
                  value={form.city}
                  onChange={e => set("city", e.target.value)}
                  placeholder="Oslo"
                />
              </div>
            </div>
          </div>

          {/* Tilleggsinfo */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <p className="text-sm font-semibold text-foreground">Tilleggsinformasjon</p>
            <div className="flex items-center gap-2.5">
              <Checkbox
                id="enova"
                checked={form.enova_registered}
                onCheckedChange={v => set("enova_registered", !!v)}
              />
              <Label htmlFor="enova" className="font-normal cursor-pointer">
                Enova-registrert
              </Label>
            </div>
            <div className="space-y-1.5">
              <Label>Notater</Label>
              <Textarea
                value={form.notes}
                onChange={e => set("notes", e.target.value)}
                placeholder="Interne notater om kunden — vises kun for dere"
                rows={3}
              />
            </div>
          </div>

          {/* Bunn: sekundær lagre-knapp */}
          <div className="flex items-center justify-end gap-2 pt-2 pb-6">
            <Button variant="outline" onClick={() => navigate(isEdit ? `/tenant/crm/companies/${id}` : "/tenant/crm/companies")}>
              Avbryt
            </Button>
            <SaveButton />
          </div>
        </div>

        {/* Høyre: hjelpetekst (1/3) */}
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Lightbulb className="h-3.5 w-3.5 text-primary" />
              </div>
              <p className="text-sm font-semibold">{isEdit ? "Redigerer kunde" : "Ny kunde"}</p>
            </div>
            <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
              {isEdit ? (
                <>
                  <p>Endringer lagres umiddelbart og vises overalt der kunden er referert — jobber, deals, serviceavtaler og kontakter.</p>
                  <p>Adressefeltet bruker Kartverket — søk på gateadresse for automatisk utfylling av postnr og by.</p>
                </>
              ) : (
                <>
                  <p>Kunden er utgangspunktet i VPKontroll. Etter opprettelse kan du legge til kontaktpersoner, anleggssteder, anlegg, deals og jobber.</p>
                  <p className="font-medium text-foreground/70">Typisk oppsett:</p>
                  <ol className="space-y-1 list-decimal list-inside">
                    <li>Opprett kunde ← du er her</li>
                    <li>Legg til kontaktperson</li>
                    <li>Registrer anleggssted og varmepumpe</li>
                    <li>Knytt til deal eller jobb</li>
                  </ol>
                </>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs font-medium text-muted-foreground">Obligatoriske felt</p>
            </div>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li className={cn("flex items-center gap-1.5", form.name.trim() ? "text-emerald-600 dark:text-emerald-400" : "")}>
                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", form.name.trim() ? "bg-emerald-500" : "bg-muted-foreground/30")} />
                Navn {form.name.trim() ? "✓" : "(påkrevd)"}
              </li>
              <li className="flex items-center gap-1.5 text-muted-foreground/60">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/20 shrink-0" />
                Alle andre felt er valgfrie
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
