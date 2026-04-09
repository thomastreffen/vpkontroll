import type { TemplateField } from "@/components/templates/FieldCanvas";

export interface PresetSection {
  label: string;
  help_text?: string;
}

export interface PresetField {
  field_type: string;
  label: string;
  unit?: string;
  help_text?: string;
  options?: { choices: string[] } | null;
  is_required?: boolean;
  /** Which preset section (by label) this field belongs to */
  section: string;
}

export interface PresetProfile {
  sections: PresetSection[];
  fields: PresetField[];
  description: string;
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").substring(0, 40);
}

const SERVICE: PresetProfile = {
  description: "Denne malen brukes på servicebesøk og i serviceavtaler",
  sections: [
    { label: "Generelt" },
    { label: "Sjekkpunkter", help_text: "Kontrollpunkter som skal gjennomgås" },
    { label: "Målinger", help_text: "Registrerte verdier fra anlegget" },
    { label: "Funn og anbefalinger", help_text: "Observasjoner og tiltak" },
  ],
  fields: [
    { field_type: "checkbox", label: "Filter rengjort", section: "Sjekkpunkter", help_text: "Er filteret rengjort eller byttet?" },
    { field_type: "checkbox", label: "Kuldemedium kontrollert", section: "Sjekkpunkter" },
    { field_type: "checkbox", label: "Elektrisk kontroll utført", section: "Sjekkpunkter" },
    { field_type: "checkbox", label: "Kondensavløp sjekket", section: "Sjekkpunkter" },
    { field_type: "measurement", label: "Høytrykk", unit: "bar", section: "Målinger" },
    { field_type: "measurement", label: "Lavtrykk", unit: "bar", section: "Målinger" },
    { field_type: "measurement", label: "Turtemperatur", unit: "°C", section: "Målinger" },
    { field_type: "measurement", label: "Returtemperatur", unit: "°C", section: "Målinger" },
    { field_type: "textarea", label: "Anbefalte tiltak", section: "Funn og anbefalinger", help_text: "Beskriv anbefalte tiltak og oppfølging" },
  ],
};

const INSTALLATION: PresetProfile = {
  description: "Denne malen brukes i installasjonsjobber under fanen Skjema",
  sections: [
    { label: "Kunde og anlegg" },
    { label: "Monteringspunkter", help_text: "Monterings- og plasseringsdetaljer" },
    { label: "Kontroll og test", help_text: "Verifikasjon av funksjon og sikkerhet" },
    { label: "Idriftsettelse" },
    { label: "Overlevering", help_text: "Kundeoverlevering og dokumentasjon" },
  ],
  fields: [
    { field_type: "text", label: "Serienummer utedel", section: "Kunde og anlegg" },
    { field_type: "text", label: "Serienummer innedel", section: "Kunde og anlegg" },
    { field_type: "checkbox", label: "Vakuumtest utført", section: "Kontroll og test" },
    { field_type: "checkbox", label: "Trykktest utført", section: "Kontroll og test" },
    { field_type: "checkbox", label: "Elektrisk kontroll utført", section: "Kontroll og test" },
    { field_type: "checkbox", label: "Oppstart gjennomført", section: "Idriftsettelse" },
    { field_type: "checkbox", label: "Kunde instruert", section: "Overlevering", help_text: "Kunden er informert om bruk og vedlikehold" },
    { field_type: "file", label: "Bilder før/etter", section: "Overlevering", help_text: "Last opp dokumentasjonsbilder" },
    { field_type: "textarea", label: "Avvik ved montasje", section: "Monteringspunkter", help_text: "Beskriv eventuelle avvik fra plan" },
  ],
};

const INSPECTION: PresetProfile = {
  description: "Denne malen brukes på deal/befaring i CRM-modulen",
  sections: [
    { label: "Kunde og sted" },
    { label: "Eksisterende løsning", help_text: "Vurdering av dagens oppvarmingsløsning" },
    { label: "Tekniske observasjoner", help_text: "Observasjoner og vurderinger fra befaringen" },
    { label: "Anbefalt løsning", help_text: "Foreslått tiltak og produkter" },
    { label: "Vedlegg og bilder" },
  ],
  fields: [
    { field_type: "dropdown", label: "Byggtype", section: "Kunde og sted", options: { choices: ["Enebolig", "Tomannsbolig", "Rekkehus", "Leilighet", "Næringsbygg", "Annet"] } },
    { field_type: "dropdown", label: "Eksisterende oppvarming", section: "Eksisterende løsning", options: { choices: ["Elektrisk panelovn", "Oljefyr", "Vedfyring", "Fjernvarme", "Varmepumpe", "Annet"] } },
    { field_type: "checkbox", label: "Plassering utedel vurdert", section: "Tekniske observasjoner" },
    { field_type: "checkbox", label: "Plassering innedel vurdert", section: "Tekniske observasjoner" },
    { field_type: "checkbox", label: "Tilkomst god", section: "Tekniske observasjoner" },
    { field_type: "measurement", label: "Estimert kapasitetsbehov", unit: "kW", section: "Anbefalt løsning" },
    { field_type: "textarea", label: "Anbefalt løsning", section: "Anbefalt løsning", help_text: "Beskriv anbefalt produktvalg og løsning" },
    { field_type: "file", label: "Befaringsbilder", section: "Vedlegg og bilder", help_text: "Last opp bilder fra befaringen" },
  ],
};

const CRM: PresetProfile = {
  description: "Denne malen brukes i salgsoppfølging og CRM-flyten",
  sections: [
    { label: "Kunde og behov", help_text: "Kundens ønsker og krav" },
    { label: "Kommersiell vurdering" },
    { label: "Løsning" },
    { label: "Neste steg", help_text: "Oppfølging og beslutning" },
  ],
  fields: [
    { field_type: "textarea", label: "Kundebehov oppsummert", section: "Kunde og behov" },
    { field_type: "checkbox", label: "Budsjett avklart", section: "Kommersiell vurdering" },
    { field_type: "checkbox", label: "Beslutningstaker identifisert", section: "Kommersiell vurdering" },
    { field_type: "text", label: "Konkurrent nevnt", section: "Kommersiell vurdering" },
    { field_type: "date", label: "Tilbud skal sendes innen", section: "Løsning" },
    { field_type: "date", label: "Neste oppfølgingsdato", section: "Neste steg" },
    { field_type: "rating", label: "Sannsynlighet / modenhet", section: "Neste steg", help_text: "1 = kaldt, 5 = klart for avslutning" },
    { field_type: "textarea", label: "Neste steg", section: "Neste steg" },
  ],
};

const WEB: PresetProfile = {
  description: "Denne malen brukes for nettskjema og henvendelser fra kunder",
  sections: [
    { label: "Kontaktinformasjon" },
    { label: "Henvendelse", help_text: "Hva gjelder henvendelsen" },
    { label: "Samtykke" },
  ],
  fields: [
    { field_type: "text", label: "Navn", section: "Kontaktinformasjon", is_required: true },
    { field_type: "text", label: "Telefon", section: "Kontaktinformasjon" },
    { field_type: "text", label: "E-post", section: "Kontaktinformasjon", is_required: true },
    { field_type: "text", label: "Postnummer", section: "Kontaktinformasjon" },
    { field_type: "dropdown", label: "Henvendelsestype", section: "Henvendelse", options: { choices: ["Varmepumpe", "Service", "Befaring", "Reklamasjon", "Annet"] } },
    { field_type: "textarea", label: "Beskrivelse", section: "Henvendelse" },
    { field_type: "checkbox", label: "Samtykke til behandling av personopplysninger", section: "Samtykke", is_required: true },
  ],
};

const WARRANTY: PresetProfile = {
  description: "Denne malen brukes for garanti- og reklamasjonssaker",
  sections: [
    { label: "Kunde og produkt" },
    { label: "Feilbeskrivelse", help_text: "Beskrivelse av feilen" },
    { label: "Dokumentasjon", help_text: "Bilder og vedlegg" },
    { label: "Vurdering og utfall", help_text: "Intern vurdering av saken" },
  ],
  fields: [
    { field_type: "textarea", label: "Feilbeskrivelse", section: "Feilbeskrivelse", is_required: true },
    { field_type: "date", label: "Kjøpsdato", section: "Kunde og produkt" },
    { field_type: "text", label: "Produkt / modell", section: "Kunde og produkt" },
    { field_type: "text", label: "Serienummer", section: "Kunde og produkt" },
    { field_type: "file", label: "Bilder av feil", section: "Dokumentasjon", help_text: "Last opp bilder som dokumenterer feilen" },
    { field_type: "checkbox", label: "Reklamasjon godkjent", section: "Vurdering og utfall" },
    { field_type: "textarea", label: "Tiltak / beslutning", section: "Vurdering og utfall" },
  ],
};

const PROFILES: Record<string, PresetProfile> = {
  service: SERVICE,
  installation: INSTALLATION,
  inspection: INSPECTION,
  crm: CRM,
  web: WEB,
  warranty: WARRANTY,
};

export function getPresetProfile(category: string): PresetProfile | undefined {
  return PROFILES[category];
}

export function getPresetSections(category: string): PresetSection[] {
  return PROFILES[category]?.sections || [{ label: "Generelt" }];
}

export function getPresetFields(category: string): PresetField[] {
  return PROFILES[category]?.fields || [];
}

export function getPresetDescription(category: string): string {
  return PROFILES[category]?.description || "";
}

/** Get suggested fields for a category that are NOT already in the form */
export function getSuggestedFields(category: string, existingLabels: string[]): PresetField[] {
  const normalised = new Set(existingLabels.map(l => l.toLowerCase().trim()));
  return getPresetFields(category).filter(f => !normalised.has(f.label.toLowerCase().trim()));
}

/** Build full preset (sections + fields) as TemplateField[] */
export function buildFullPreset(category: string): TemplateField[] {
  const profile = PROFILES[category];
  if (!profile) return [{ field_type: "section_header", field_key: "generelt", label: "Generelt", unit: "", help_text: "", is_required: false, default_value: null, options: null, sort_order: 0 }];

  const fields: TemplateField[] = [];
  let order = 0;

  for (const sec of profile.sections) {
    fields.push({
      field_type: "section_header",
      field_key: slugify(sec.label),
      label: sec.label,
      unit: "",
      help_text: sec.help_text || "",
      is_required: false,
      default_value: null,
      options: null,
      sort_order: order++,
    });

    const sectionFields = profile.fields.filter(f => f.section === sec.label);
    for (const pf of sectionFields) {
      fields.push({
        field_type: pf.field_type,
        field_key: slugify(pf.label),
        label: pf.label,
        unit: pf.unit || "",
        help_text: pf.help_text || "",
        is_required: pf.is_required || false,
        default_value: null,
        options: pf.options || null,
        sort_order: order++,
      });
    }
  }

  return fields;
}

export const USE_CONTEXT_LABELS: Record<string, string> = {
  service_visit: "Servicebesøk",
  installation_job: "Installasjonsjobb",
  site_visit: "Befaring",
  crm_form: "Salgsoppfølging",
  web_form: "Nettskjema",
  warranty_case: "Garanti / reklamasjon",
};

export const CATEGORY_TO_CONTEXT: Record<string, string> = {
  service: "service_visit",
  installation: "installation_job",
  inspection: "site_visit",
  crm: "crm_form",
  web: "web_form",
  warranty: "warranty_case",
};

export const CONTEXT_TO_CATEGORY: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORY_TO_CONTEXT).map(([k, v]) => [v, k])
);
