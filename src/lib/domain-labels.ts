export const ENERGY_SOURCE_LABELS: Record<string, string> = {
  air_air: "Luft-luft",
  air_water: "Luft-vann",
  ground_water: "Grunn-vann",
  ground_brine: "Grunn-brine",
  exhaust_air: "Avtrekksluft",
  hybrid: "Hybrid",
};

export const ASSET_STATUS_LABELS: Record<string, string> = {
  planned: "Planlagt",
  installed: "Installert",
  operational: "I drift",
  needs_service: "Trenger service",
  decommissioned: "Avviklet",
};

export const ASSET_STATUS_COLORS: Record<string, string> = {
  planned: "bg-blue-500/10 text-blue-600",
  installed: "bg-amber-500/10 text-amber-600",
  operational: "bg-emerald-500/10 text-emerald-600",
  needs_service: "bg-orange-500/10 text-orange-600",
  decommissioned: "bg-muted text-muted-foreground",
};

export const JOB_STATUS_LABELS: Record<string, string> = {
  planned: "Planlagt",
  scheduled: "Planlagt tid",
  in_progress: "Under arbeid",
  completed: "Fullført",
  cancelled: "Kansellert",
  on_hold: "På vent",
};

export const JOB_STATUS_COLORS: Record<string, string> = {
  planned: "bg-blue-500/10 text-blue-600",
  scheduled: "bg-indigo-500/10 text-indigo-600",
  in_progress: "bg-amber-500/10 text-amber-600",
  completed: "bg-emerald-500/10 text-emerald-600",
  cancelled: "bg-muted text-muted-foreground",
  on_hold: "bg-orange-500/10 text-orange-600",
};

export const JOB_TYPE_LABELS: Record<string, string> = {
  installation: "Installasjon",
  service: "Service",
  repair: "Reparasjon",
  warranty: "Garanti",
  inspection: "Inspeksjon",
  decommission: "Demontering",
};

export const AGREEMENT_STATUS_LABELS: Record<string, string> = {
  active: "Aktiv",
  paused: "Pauset",
  expired: "Utløpt",
  cancelled: "Kansellert",
};

export const AGREEMENT_STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-600",
  paused: "bg-amber-500/10 text-amber-600",
  expired: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

export const AGREEMENT_INTERVAL_LABELS: Record<string, string> = {
  monthly: "Månedlig",
  quarterly: "Kvartalsvis",
  semi_annual: "Halvårlig",
  annual: "Årlig",
  biennial: "Hvert 2. år",
};

export const WARRANTY_STATUS_LABELS: Record<string, string> = {
  open: "Åpen",
  investigating: "Under utredning",
  approved: "Godkjent",
  rejected: "Avvist",
  resolved: "Løst",
};

export const WARRANTY_STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-500/10 text-blue-600",
  investigating: "bg-amber-500/10 text-amber-600",
  approved: "bg-emerald-500/10 text-emerald-600",
  rejected: "bg-destructive/10 text-destructive",
  resolved: "bg-muted text-muted-foreground",
};

export const VISIT_STATUS_LABELS: Record<string, string> = {
  planned: "Planlagt",
  confirmed: "Bekreftet",
  in_progress: "Pågår",
  completed: "Fullført",
  missed: "Ikke gjennomført",
  cancelled: "Kansellert",
};

export const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  private: "Privatkunde",
  business: "Bedriftskunde",
  housing_coop: "Borettslag",
  public_sector: "Offentlig",
};

export const CUSTOMER_TYPE_COLORS: Record<string, string> = {
  private: "bg-blue-500/10 text-blue-600",
  business: "bg-violet-500/10 text-violet-600",
  housing_coop: "bg-amber-500/10 text-amber-600",
  public_sector: "bg-emerald-500/10 text-emerald-600",
};

export const SITE_TYPE_LABELS: Record<string, string> = {
  residential: "Bolig",
  commercial: "Næring",
  industrial: "Industri",
  cabin: "Hytte",
};

export const DOCUMENT_CATEGORY_LABELS: Record<string, string> = {
  photo: "Foto",
  certificate: "Sertifikat",
  manual: "Manual",
  invoice: "Faktura",
  quote_pdf: "Tilbuds-PDF",
  service_report: "Servicerapport",
  checklist_pdf: "Sjekkliste-PDF",
  warranty_doc: "Garantidokument",
  contract: "Kontrakt",
  other: "Annet",
};

export function formatDate(d: string | null | undefined): string {
  if (!d) return "–";
  return new Date(d).toLocaleDateString("nb-NO");
}

export function formatDateTime(d: string | null | undefined): string {
  if (!d) return "–";
  return new Date(d).toLocaleString("nb-NO", { dateStyle: "short", timeStyle: "short" });
}
