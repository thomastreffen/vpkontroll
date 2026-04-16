import { useState, useEffect, useCallback } from "react";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Search, Plus, CalendarIcon, Building2, MapPin, Cpu, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { AGREEMENT_INTERVAL_LABELS, CUSTOMER_TYPE_LABELS } from "@/lib/domain-labels";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

type Step = "customer" | "site" | "details";

export default function AgreementCreateSheet({ open, onOpenChange, onCreated }: Props) {
  const { tenantId, user } = useAuth();
  const [step, setStep] = useState<Step>("customer");
  const [saving, setSaving] = useState(false);

  // Selected entities
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [selectedSite, setSelectedSite] = useState<any>(null);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);

  // Search states
  const [companySearch, setCompanySearch] = useState("");
  const [companies, setCompanies] = useState<any[]>([]);
  const [siteSearch, setSiteSearch] = useState("");
  const [sites, setSites] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);

  // Inline create states
  const [showNewCompany, setShowNewCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyType, setNewCompanyType] = useState("private");
  const [showNewSite, setShowNewSite] = useState(false);
  const [newSiteName, setNewSiteName] = useState("");
  const [newSiteAddress, setNewSiteAddress] = useState("");

  // Agreement details
  const [interval, setInterval] = useState("annual");
  const [customMonths, setCustomMonths] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [annualPrice, setAnnualPrice] = useState("");
  const [scope, setScope] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [templates, setTemplates] = useState<any[]>([]);

  // Load companies
  const fetchCompanies = useCallback(async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from("crm_companies")
      .select("id, name, customer_type, city")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .ilike("name", `%${companySearch}%`)
      .order("name")
      .limit(20);
    setCompanies(data || []);
  }, [tenantId, companySearch]);

  useEffect(() => { if (open && step === "customer") fetchCompanies(); }, [open, step, fetchCompanies]);

  // Load sites for selected company
  const fetchSites = useCallback(async () => {
    if (!tenantId || !selectedCompany) return;
    const { data } = await supabase
      .from("customer_sites")
      .select("id, name, address, city")
      .eq("tenant_id", tenantId)
      .eq("company_id", selectedCompany.id)
      .is("deleted_at", null)
      .order("name");
    setSites(data || []);
  }, [tenantId, selectedCompany]);

  useEffect(() => { if (step === "site" && selectedCompany) fetchSites(); }, [step, selectedCompany, fetchSites]);

  // Load assets for selected site
  const fetchAssets = useCallback(async () => {
    if (!tenantId || !selectedSite) return;
    const { data } = await supabase
      .from("hvac_assets")
      .select("id, manufacturer, model, serial_number, energy_source")
      .eq("tenant_id", tenantId)
      .eq("site_id", selectedSite.id)
      .is("deleted_at", null)
      .order("manufacturer");
    setAssets(data || []);
  }, [tenantId, selectedSite]);

  useEffect(() => { if (step === "site" && selectedSite) fetchAssets(); }, [step, selectedSite, fetchAssets]);

  // Load templates with default detection
  useEffect(() => {
    if (!tenantId || !open) return;
    supabase
      .from("service_templates" as any)
      .select("id, name, is_default, use_context")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("name")
      .then(({ data }) => {
        const all = (data || []) as any[];
        setTemplates(all);
        // Auto-select default service_visit template
        if (!selectedTemplateId) {
          const def = all.find(t => t.is_default && t.use_context === "service_visit");
          if (def) setSelectedTemplateId(def.id);
        }
      });
  }, [tenantId, open]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setStep("customer");
      setSelectedCompany(null);
      setSelectedSite(null);
      setSelectedAsset(null);
      setCompanySearch("");
      setSiteSearch("");
      setShowNewCompany(false);
      setShowNewSite(false);
      setNewCompanyName("");
      setNewSiteName("");
      setNewSiteAddress("");
      setInterval("annual");
      setCustomMonths("");
      setStartDate(new Date());
      setEndDate(undefined);
      setAnnualPrice("");
      setScope("");
      setSelectedTemplateId("");
    }
  }, [open]);

  const createCompany = async () => {
    if (!tenantId || !newCompanyName.trim()) return;
    const { data, error } = await supabase
      .from("crm_companies")
      .insert({ tenant_id: tenantId, name: newCompanyName.trim(), customer_type: newCompanyType as any, created_by: user?.id })
      .select("id, name, customer_type, city")
      .single();
    if (error) { toast.error("Kunne ikke opprette kunde"); return; }
    setSelectedCompany(data);
    setShowNewCompany(false);
    setNewCompanyName("");
    toast.success("Kunde opprettet");
  };

  const createSite = async () => {
    if (!tenantId || !selectedCompany || !newSiteName.trim()) return;
    const { data, error } = await supabase
      .from("customer_sites")
      .insert({ tenant_id: tenantId, company_id: selectedCompany.id, name: newSiteName.trim(), address: newSiteAddress || null, created_by: user?.id })
      .select("id, name, address, city")
      .single();
    if (error) { toast.error("Kunne ikke opprette anleggssted"); return; }
    setSelectedSite(data);
    setShowNewSite(false);
    setNewSiteName("");
    setNewSiteAddress("");
    toast.success("Anleggssted opprettet");
  };

  const handleSave = async () => {
    if (!tenantId || !selectedCompany || !startDate) return;
    setSaving(true);
    const payload: any = {
      tenant_id: tenantId,
      company_id: selectedCompany.id,
      site_id: selectedSite?.id || null,
      asset_id: selectedAsset?.id || null,
      agreement_number: "SA-TEMP",
      interval,
      custom_interval_months: interval === "custom" ? parseInt(customMonths) || null : null,
      start_date: format(startDate, "yyyy-MM-dd"),
      end_date: endDate ? format(endDate, "yyyy-MM-dd") : null,
      annual_price: annualPrice ? parseFloat(annualPrice) : null,
      scope_description: scope || null,
      next_visit_due: format(startDate, "yyyy-MM-dd"),
      status: "active",
      created_by: user?.id,
    };
    if (selectedTemplateId) {
      payload.service_template_id = selectedTemplateId;
    }
    const { error } = await supabase.from("service_agreements").insert(payload);
    setSaving(false);
    if (error) { toast.error("Kunne ikke opprette serviceavtale"); return; }
    toast.success("Serviceavtale opprettet");
    onOpenChange(false);
    onCreated();
  };

  const renderCustomerStep = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          Velg kunde
        </h3>
        <Button variant="outline" size="sm" onClick={() => setShowNewCompany(!showNewCompany)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Ny kunde
        </Button>
      </div>

      {showNewCompany && (
        <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
          <Input placeholder="Kundenavn *" value={newCompanyName} onChange={e => setNewCompanyName(e.target.value)} />
          <Select value={newCompanyType} onValueChange={setNewCompanyType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(CUSTOMER_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={createCompany} disabled={!newCompanyName.trim()}>Opprett kunde</Button>
        </div>
      )}

      {selectedCompany ? (
        <div className="border rounded-lg p-3 bg-primary/5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{selectedCompany.name}</p>
            <p className="text-xs text-muted-foreground">{selectedCompany.city || "Ingen by"}</p>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-primary" />
            <Button variant="ghost" size="sm" onClick={() => { setSelectedCompany(null); setSelectedSite(null); setSelectedAsset(null); }}>Bytt</Button>
          </div>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Søk kunder..." value={companySearch} onChange={e => setCompanySearch(e.target.value)} className="pl-9" />
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {companies.map(c => (
              <button key={c.id} onClick={() => setSelectedCompany(c)} className="w-full text-left px-3 py-2 rounded-md hover:bg-accent/50 text-sm flex justify-between items-center">
                <span>{c.name}</span>
                <span className="text-xs text-muted-foreground">{c.city}</span>
              </button>
            ))}
            {companies.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Ingen kunder funnet</p>}
          </div>
        </>
      )}

      <div className="flex justify-end pt-2">
        <Button onClick={() => setStep("site")} disabled={!selectedCompany}>Neste: Anleggssted</Button>
      </div>
    </div>
  );

  const renderSiteStep = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          Velg anleggssted
        </h3>
        <Button variant="outline" size="sm" onClick={() => setShowNewSite(!showNewSite)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Nytt anleggssted
        </Button>
      </div>

      {showNewSite && (
        <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
          <Input placeholder="Anleggsnavn *" value={newSiteName} onChange={e => setNewSiteName(e.target.value)} />
          <AddressAutocomplete value={newSiteAddress} onChange={setNewSiteAddress} placeholder="Adresse" />
          <Button size="sm" onClick={createSite} disabled={!newSiteName.trim()}>Opprett anleggssted</Button>
        </div>
      )}

      {selectedSite ? (
        <div className="border rounded-lg p-3 bg-primary/5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{selectedSite.name || selectedSite.address}</p>
            <p className="text-xs text-muted-foreground">{selectedSite.address}</p>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-primary" />
            <Button variant="ghost" size="sm" onClick={() => { setSelectedSite(null); setSelectedAsset(null); }}>Bytt</Button>
          </div>
        </div>
      ) : (
        <div className="max-h-36 overflow-y-auto space-y-1">
          {sites.map(s => (
            <button key={s.id} onClick={() => setSelectedSite(s)} className="w-full text-left px-3 py-2 rounded-md hover:bg-accent/50 text-sm">
              <span className="font-medium">{s.name || s.address || "Uten navn"}</span>
              {s.address && <span className="text-xs text-muted-foreground ml-2">{s.address}</span>}
            </button>
          ))}
          {sites.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Ingen anleggssteder for denne kunden</p>}
        </div>
      )}

      {/* Asset selection */}
      {selectedSite && assets.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wide">
            <Cpu className="h-3.5 w-3.5" /> Anlegg (valgfritt)
          </h4>
          <div className="max-h-28 overflow-y-auto space-y-1">
            {assets.map(a => (
              <button
                key={a.id}
                onClick={() => setSelectedAsset(selectedAsset?.id === a.id ? null : a)}
                className={cn("w-full text-left px-3 py-2 rounded-md text-sm flex justify-between items-center", selectedAsset?.id === a.id ? "bg-primary/10 border border-primary/20" : "hover:bg-accent/50")}
              >
                <span>{[a.manufacturer, a.model].filter(Boolean).join(" ") || "Ukjent"}</span>
                {a.serial_number && <span className="text-xs text-muted-foreground font-mono">{a.serial_number}</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={() => setStep("customer")}>Tilbake</Button>
        <Button onClick={() => setStep("details")}>Neste: Avtaledetaljer</Button>
      </div>
    </div>
  );

  const renderDetailsStep = () => (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Avtaledetaljer</h3>

      {/* Summary */}
      <div className="border rounded-lg p-3 bg-muted/30 space-y-1">
        <p className="text-xs"><span className="font-medium">Kunde:</span> {selectedCompany?.name}</p>
        {selectedSite && <p className="text-xs"><span className="font-medium">Anleggssted:</span> {selectedSite.name || selectedSite.address}</p>}
        {selectedAsset && <p className="text-xs"><span className="font-medium">Anlegg:</span> {[selectedAsset.manufacturer, selectedAsset.model].filter(Boolean).join(" ")}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Intervall</Label>
          <Select value={interval} onValueChange={setInterval}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(AGREEMENT_INTERVAL_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {interval === "custom" && (
          <div className="space-y-1.5">
            <Label className="text-xs">Antall måneder</Label>
            <Input type="number" min={1} max={60} value={customMonths} onChange={e => setCustomMonths(e.target.value)} placeholder="f.eks. 18" />
          </div>
        )}
        <div className="space-y-1.5">
          <Label className="text-xs">Startdato</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "dd.MM.yyyy") : "Velg dato"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={startDate} onSelect={setStartDate} className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Sluttdato (valgfri)</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "dd.MM.yyyy") : "Ingen"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={endDate} onSelect={setEndDate} className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Årspris (kr)</Label>
          <Input type="number" value={annualPrice} onChange={e => setAnnualPrice(e.target.value)} placeholder="0" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Servicemal</Label>
          <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
            <SelectTrigger><SelectValue placeholder="Ingen mal valgt" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Ingen mal</SelectItem>
              {templates.map((t: any) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}{t.is_default ? " ★" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedTemplateId && selectedTemplateId !== "none" && (
            <p className="text-[11px] text-muted-foreground">Valgt mal brukes som standard skjema for servicebesøk</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Omfang / beskrivelse</Label>
        <Textarea value={scope} onChange={e => setScope(e.target.value)} placeholder="Hva dekker avtalen?" rows={3} />
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={() => setStep("site")}>Tilbake</Button>
        <Button onClick={handleSave} disabled={saving || !selectedCompany || !startDate}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Opprett serviceavtale
        </Button>
      </div>
    </div>
  );

  const stepLabels: Record<Step, string> = { customer: "Kunde", site: "Anleggssted", details: "Detaljer" };
  const steps: Step[] = ["customer", "site", "details"];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-lg w-full overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Ny serviceavtale</SheetTitle>
        </SheetHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 my-4">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (s === "customer") setStep(s);
                  if (s === "site" && selectedCompany) setStep(s);
                  if (s === "details" && selectedCompany) setStep(s);
                }}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                  step === s ? "bg-primary text-primary-foreground" :
                  steps.indexOf(step) > i ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}
              >
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] border border-current/20">
                  {steps.indexOf(step) > i ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                {stepLabels[s]}
              </button>
              {i < steps.length - 1 && <div className="w-6 h-px bg-border" />}
            </div>
          ))}
        </div>

        <Separator className="mb-4" />

        {step === "customer" && renderCustomerStep()}
        {step === "site" && renderSiteStep()}
        {step === "details" && renderDetailsStep()}
      </SheetContent>
    </Sheet>
  );
}
