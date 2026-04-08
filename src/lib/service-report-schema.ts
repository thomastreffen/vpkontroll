/**
 * Service Report v1 – fixed schema for heat pump service visits.
 * Stored in service_visits.report_data as JSON.
 */

export interface ChecklistItem {
  key: string;
  label: string;
  checked: boolean;
  note?: string;
}

export interface Measurements {
  supply_temp?: number | null;
  return_temp?: number | null;
  outdoor_temp?: number | null;
  high_pressure?: number | null;
  low_pressure?: number | null;
  current_amp?: number | null;
}

export interface ServiceReportData {
  schema_version: 1;
  customer_name: string;
  site_address: string;
  asset_manufacturer: string;
  asset_model: string;
  serial_number_outdoor: string;
  serial_number_indoor: string;
  energy_source: string;
  checklist: ChecklistItem[];
  measurements: Measurements;
  condition_rating: number | null;
  findings_summary: string;
  actions_taken_summary: string;
  recommendations: string;
  technician_name: string;
  completed_date: string | null;
}

export const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { key: "filter_cleaned", label: "Filter rengjort", checked: false },
  { key: "refrigerant_checked", label: "Kuldemedium kontrollert", checked: false },
  { key: "electrical_checked", label: "Elektrisk kontroll utført", checked: false },
  { key: "condensate_drain", label: "Kondensavløp sjekket", checked: false },
  { key: "outdoor_unit_cleaned", label: "Utedel rengjort", checked: false },
  { key: "indoor_unit_checked", label: "Innedel kontrollert", checked: false },
  { key: "thermostat_tested", label: "Termostat/styring testet", checked: false },
  { key: "noise_vibration", label: "Støy/vibrasjon vurdert", checked: false },
  { key: "safety_check", label: "Sikkerhetskontroll utført", checked: false },
  { key: "performance_test", label: "Funksjonstest utført", checked: false },
];

export const MEASUREMENT_FIELDS: { key: keyof Measurements; label: string; unit: string }[] = [
  { key: "supply_temp", label: "Turtemperatur", unit: "°C" },
  { key: "return_temp", label: "Returtemperatur", unit: "°C" },
  { key: "outdoor_temp", label: "Utetemperatur", unit: "°C" },
  { key: "high_pressure", label: "Høytrykk", unit: "bar" },
  { key: "low_pressure", label: "Lavtrykk", unit: "bar" },
  { key: "current_amp", label: "Strømtrekk", unit: "A" },
];

export const CONDITION_RATINGS: { value: number; label: string; color: string }[] = [
  { value: 1, label: "Kritisk – krever umiddelbar utbedring", color: "text-destructive" },
  { value: 2, label: "Dårlig – bør utbedres snart", color: "text-orange-600" },
  { value: 3, label: "Akseptabel – normalt", color: "text-amber-600" },
  { value: 4, label: "God – ingen anmerkninger", color: "text-emerald-600" },
  { value: 5, label: "Utmerket – som ny", color: "text-emerald-700" },
];

export function createDefaultReport(prefill: {
  customerName?: string;
  siteAddress?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  indoorModel?: string;
  energySource?: string;
  technicianName?: string;
}): ServiceReportData {
  return {
    schema_version: 1,
    customer_name: prefill.customerName || "",
    site_address: prefill.siteAddress || "",
    asset_manufacturer: prefill.manufacturer || "",
    asset_model: prefill.model || "",
    serial_number_outdoor: prefill.serialNumber || "",
    serial_number_indoor: prefill.indoorModel || "",
    energy_source: prefill.energySource || "",
    checklist: DEFAULT_CHECKLIST.map(c => ({ ...c })),
    measurements: {},
    condition_rating: null,
    findings_summary: "",
    actions_taken_summary: "",
    recommendations: "",
    technician_name: prefill.technicianName || "",
    completed_date: null,
  };
}
