export interface PresetSection {
  label: string;
  help_text?: string;
}

const PRESETS: Record<string, PresetSection[]> = {
  service: [
    { label: "Generelt" },
    { label: "Sjekkpunkter", help_text: "Kontrollpunkter som skal gjennomgås" },
    { label: "Målinger", help_text: "Registrerte verdier fra anlegget" },
    { label: "Funn og anbefalinger", help_text: "Observasjoner og tiltak" },
  ],
  installation: [
    { label: "Kunde og anlegg" },
    { label: "Monteringspunkter", help_text: "Monterings- og plasseringsdetaljer" },
    { label: "Test og igangkjøring", help_text: "Verifikasjon av funksjon" },
    { label: "Dokumentasjon", help_text: "Bilder, skjema og signatur" },
  ],
  inspection: [
    { label: "Kunde og behov" },
    { label: "Teknisk vurdering", help_text: "Vurdering av eksisterende løsning" },
    { label: "Anbefalt løsning", help_text: "Foreslått tiltak og produkter" },
  ],
  crm: [
    { label: "Kontaktinfo" },
    { label: "Behov", help_text: "Kundens ønsker og krav" },
    { label: "Budsjett / tidsplan" },
    { label: "Oppfølging" },
  ],
  web: [
    { label: "Kontaktinformasjon" },
    { label: "Henvendelse", help_text: "Hva gjelder henvendelsen" },
    { label: "Samtykke" },
  ],
  warranty: [
    { label: "Kunde og produkt" },
    { label: "Feilbeskrivelse", help_text: "Beskrivelse av feilen" },
    { label: "Vedlegg / bilder" },
    { label: "Vurdering", help_text: "Intern vurdering av saken" },
  ],
};

export function getPresetSections(category: string): PresetSection[] {
  return PRESETS[category] || [{ label: "Generelt" }];
}

export const USE_CONTEXT_LABELS: Record<string, string> = {
  service_visit: "Servicebesøk",
  installation_job: "Installasjonsjobb",
  site_visit: "Befaring",
  crm_form: "Salg / CRM",
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
