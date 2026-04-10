/**
 * Permission labels for VarmePumpe SaaS.
 * UI-only mapping – does NOT affect backend logic.
 *
 * THREE-LAYER ACCESS MODEL:
 *   1. Rolle – standardpakke med rettigheter
 *   2. Modultilgang – hvilke menyvalg brukeren ser
 *   3. Handlingstillatelser – hva brukeren kan gjøre i modulen
 */

export interface PermissionMeta {
  label: string;
  description?: string;
  category: string;
}

export const PERMISSION_LABELS: Record<string, PermissionMeta> = {
  // ── Module access ──
  "module.dashboard": { label: "Dashboard", description: "Tilgang til dashboardet.", category: "Modultilgang" },
  "module.postkontoret": { label: "Postkontoret", description: "Tilgang til Postkontoret.", category: "Modultilgang" },
  "module.ressursplanlegger": { label: "Ressursplanlegger", description: "Tilgang til Ressursplanleggeren.", category: "Modultilgang" },
  "module.crm": { label: "CRM", description: "Tilgang til CRM-modulen (kunder, kontakter, deals).", category: "Modultilgang" },
  "module.integrations": { label: "Integrasjoner", description: "Tilgang til integrasjonssiden.", category: "Modultilgang" },
  "module.users": { label: "Brukere", description: "Tilgang til brukeradministrasjon.", category: "Modultilgang" },
  "module.modules": { label: "Moduler", description: "Tilgang til moduladministrasjon.", category: "Modultilgang" },
  "module.access_control": { label: "Tilgangsstyring", description: "Tilgang til rolle- og rettighetsstyring.", category: "Modultilgang" },

  // ── Cases / Postkontoret ──
  "cases.view": { label: "Se saker", category: "Postkontoret" },
  "cases.create": { label: "Opprette saker", category: "Postkontoret" },
  "cases.edit": { label: "Redigere saker", category: "Postkontoret" },
  "cases.delete": { label: "Slette saker", category: "Postkontoret" },
  "cases.assign": { label: "Tildele saker", description: "Kan tildele saker til andre brukere.", category: "Postkontoret" },
  "postkontor.admin": { label: "Administrere Postkontoret", description: "Full tilgang til innstillinger og postkasser.", category: "Postkontoret" },

  // ── CRM: Companies ──
  "companies.view": { label: "Se kunder", description: "Kan se kundelisten og kundeinformasjon.", category: "CRM – Kunder" },
  "companies.create": { label: "Opprette kunder", description: "Kan registrere nye kunder.", category: "CRM – Kunder" },
  "companies.edit": { label: "Redigere kunder", description: "Kan endre kundeinformasjon.", category: "CRM – Kunder" },
  "companies.delete": { label: "Slette kunder", description: "Kan slette kunder.", category: "CRM – Kunder" },

  // ── CRM: Contacts ──
  "contacts.view": { label: "Se kontaktpersoner", description: "Kan se kontaktpersoner.", category: "CRM – Kontakter" },
  "contacts.create": { label: "Opprette kontaktpersoner", description: "Kan registrere nye kontaktpersoner.", category: "CRM – Kontakter" },
  "contacts.edit": { label: "Redigere kontaktpersoner", description: "Kan endre kontaktinformasjon.", category: "CRM – Kontakter" },
  "contacts.delete": { label: "Slette kontaktpersoner", description: "Kan slette kontaktpersoner.", category: "CRM – Kontakter" },

  // ── CRM: Deals ──
  "deals.view": { label: "Se deals", description: "Kan se salgsmuligheter.", category: "CRM – Deals" },
  "deals.create": { label: "Opprette deals", description: "Kan opprette nye deals.", category: "CRM – Deals" },
  "deals.edit": { label: "Redigere deals", description: "Kan endre deals.", category: "CRM – Deals" },
  "deals.delete": { label: "Slette deals", description: "Kan slette deals.", category: "CRM – Deals" },

  // ── Jobs ──
  "jobs.view": { label: "Se jobber", description: "Kan se jobber og arbeidsordre.", category: "Jobber" },
  "jobs.create": { label: "Opprette jobber", description: "Kan opprette nye jobber.", category: "Jobber" },
  "jobs.edit": { label: "Redigere jobber", description: "Kan endre jobber.", category: "Jobber" },
  "jobs.delete": { label: "Slette jobber", description: "Kan slette jobber.", category: "Jobber" },

  // ── Assets ──
  "assets.view": { label: "Se anlegg", description: "Kan se varmepumpeanlegg.", category: "Anlegg" },
  "assets.create": { label: "Registrere anlegg", description: "Kan registrere nye anlegg.", category: "Anlegg" },
  "assets.edit": { label: "Redigere anlegg", description: "Kan endre anleggsinformasjon.", category: "Anlegg" },
  "assets.delete": { label: "Slette anlegg", description: "Kan slette anlegg.", category: "Anlegg" },

  // ── Service agreements ──
  "agreements.view": { label: "Se serviceavtaler", description: "Kan se serviceavtaler.", category: "Serviceavtaler" },
  "agreements.create": { label: "Opprette serviceavtaler", description: "Kan opprette nye serviceavtaler.", category: "Serviceavtaler" },
  "agreements.edit": { label: "Redigere serviceavtaler", description: "Kan endre serviceavtaler.", category: "Serviceavtaler" },
  "agreements.delete": { label: "Slette serviceavtaler", description: "Kan slette serviceavtaler.", category: "Serviceavtaler" },

  // ── Documents ──
  "documents.view": { label: "Se dokumenter", description: "Kan se dokumenter.", category: "Dokumenter" },
  "documents.upload": { label: "Laste opp dokumenter", description: "Kan laste opp nye dokumenter.", category: "Dokumenter" },
  "documents.delete": { label: "Slette dokumenter", description: "Kan slette dokumenter.", category: "Dokumenter" },

  // ── Warranty ──
  "warranties.view": { label: "Se garantisaker", description: "Kan se garantisaker.", category: "Garantisaker" },
  "warranties.create": { label: "Opprette garantisaker", description: "Kan opprette garantisaker.", category: "Garantisaker" },
  "warranties.edit": { label: "Redigere garantisaker", description: "Kan endre garantisaker.", category: "Garantisaker" },

  // ── Sites ──
  "sites.view": { label: "Se lokasjoner", description: "Kan se kundelokasjoner.", category: "Lokasjoner" },
  "sites.create": { label: "Opprette lokasjoner", description: "Kan registrere nye lokasjoner.", category: "Lokasjoner" },
  "sites.edit": { label: "Redigere lokasjoner", description: "Kan endre lokasjoner.", category: "Lokasjoner" },

  // ── Quotes ──
  "quotes.view": { label: "Se tilbud", description: "Kan se tilbud.", category: "Tilbud" },
  "quotes.create": { label: "Opprette tilbud", description: "Kan lage nye tilbud.", category: "Tilbud" },
  "quotes.edit": { label: "Redigere tilbud", description: "Kan endre tilbud.", category: "Tilbud" },

  // ── Ressursplanlegger ──
  "ressursplan.view": { label: "Se ressursplan", description: "Kan åpne og se ressursplanen.", category: "Ressursplanlegger" },
  "ressursplan.schedule": { label: "Planlegge hendelser", description: "Kan opprette og flytte hendelser.", category: "Ressursplanlegger" },
  "ressursplan.edit_others": { label: "Endre andres hendelser", description: "Kan endre hendelser opprettet av andre.", category: "Ressursplanlegger" },

  // ── Technicians ──
  "technicians.manage": { label: "Administrere teknikere", description: "Kan opprette, redigere og arkivere teknikere.", category: "Teknikere" },

  // ── Admin ──
  "admin.manage_users": { label: "Administrere brukere", category: "Administrasjon" },
  "admin.manage_roles": { label: "Administrere roller", category: "Administrasjon" },
  "admin.manage_settings": { label: "Administrere innstillinger", category: "Administrasjon" },

  // ── Integrations ──
  "integrations.manage": { label: "Administrere integrasjoner", description: "Kan konfigurere Microsoft/Google-integrasjoner.", category: "Integrasjoner" },

  // ── Templates ──
  "templates.view": { label: "Se maler", description: "Kan se skjemamaler.", category: "Maler" },
  "templates.manage": { label: "Administrere maler", description: "Kan opprette og redigere maler.", category: "Maler" },
};

export const MODULE_PERMISSION_KEYS: string[] = [
  "module.dashboard",
  "module.postkontoret",
  "module.ressursplanlegger",
  "module.crm",
  "module.integrations",
  "module.users",
  "module.modules",
  "module.access_control",
];

export const PERMISSION_CATEGORIES: { category: string; description: string; keys: string[] }[] = [
  {
    category: "CRM – Kunder",
    description: "Tilgang til kunderegisteret.",
    keys: ["companies.view", "companies.create", "companies.edit", "companies.delete"],
  },
  {
    category: "CRM – Kontakter",
    description: "Tilgang til kontaktpersoner.",
    keys: ["contacts.view", "contacts.create", "contacts.edit", "contacts.delete"],
  },
  {
    category: "CRM – Deals",
    description: "Tilgang til salgsmuligheter og pipeline.",
    keys: ["deals.view", "deals.create", "deals.edit", "deals.delete"],
  },
  {
    category: "Jobber",
    description: "Tilgang til arbeidsordre og jobber.",
    keys: ["jobs.view", "jobs.create", "jobs.edit", "jobs.delete"],
  },
  {
    category: "Anlegg",
    description: "Tilgang til varmepumpeanlegg og utstyr.",
    keys: ["assets.view", "assets.create", "assets.edit", "assets.delete"],
  },
  {
    category: "Serviceavtaler",
    description: "Tilgang til serviceavtaler og vedlikeholdsplaner.",
    keys: ["agreements.view", "agreements.create", "agreements.edit", "agreements.delete"],
  },
  {
    category: "Dokumenter",
    description: "Tilgang til dokumenter og vedlegg.",
    keys: ["documents.view", "documents.upload", "documents.delete"],
  },
  {
    category: "Garantisaker",
    description: "Tilgang til garantisaker.",
    keys: ["warranties.view", "warranties.create", "warranties.edit"],
  },
  {
    category: "Lokasjoner",
    description: "Tilgang til kundelokasjoner og anleggsadresser.",
    keys: ["sites.view", "sites.create", "sites.edit"],
  },
  {
    category: "Tilbud",
    description: "Tilgang til tilbud og pristilbud.",
    keys: ["quotes.view", "quotes.create", "quotes.edit"],
  },
  {
    category: "Postkontoret",
    description: "Tilgang til saker, e-post og kundehenvendelser.",
    keys: ["cases.view", "cases.create", "cases.edit", "cases.delete", "cases.assign", "postkontor.admin"],
  },
  {
    category: "Ressursplanlegger",
    description: "Tilgang til kalender, planlegging og ressursstyring.",
    keys: ["ressursplan.view", "ressursplan.schedule", "ressursplan.edit_others"],
  },
  {
    category: "Teknikere",
    description: "Administrasjon av teknikere og montører.",
    keys: ["technicians.manage"],
  },
  {
    category: "Maler",
    description: "Tilgang til skjemamaler og nettskjema.",
    keys: ["templates.view", "templates.manage"],
  },
  {
    category: "Administrasjon",
    description: "Tilgang til systeminnstillinger og brukeradministrasjon.",
    keys: ["admin.manage_users", "admin.manage_roles", "admin.manage_settings"],
  },
  {
    category: "Integrasjoner",
    description: "Tilkobling og administrasjon av e-post- og kalenderintegrasjoner.",
    keys: ["integrations.manage"],
  },
];

export function getPermLabel(key: string): string {
  return PERMISSION_LABELS[key]?.label ?? key;
}

export function getPermDescription(key: string): string | undefined {
  return PERMISSION_LABELS[key]?.description;
}
