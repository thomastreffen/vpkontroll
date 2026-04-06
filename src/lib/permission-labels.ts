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
};

export const MODULE_PERMISSION_KEYS: string[] = [
  "module.dashboard",
  "module.postkontoret",
  "module.ressursplanlegger",
  "module.integrations",
  "module.users",
  "module.modules",
  "module.access_control",
];

export const PERMISSION_CATEGORIES: { category: string; description: string; keys: string[] }[] = [
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
