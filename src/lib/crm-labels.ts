export type DealStage = "lead" | "qualified" | "quote_sent" | "site_visit" | "negotiation" | "won" | "lost";
export type ActivityType = "note" | "call" | "email" | "meeting" | "task" | "status_change";

export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  lead: "Ny lead",
  qualified: "Kvalifisert",
  quote_sent: "Tilbud sendt",
  site_visit: "Befaring",
  negotiation: "Forhandling",
  won: "Vunnet",
  lost: "Tapt",
};

export const DEAL_STAGE_ORDER: DealStage[] = [
  "lead", "qualified", "quote_sent", "site_visit", "negotiation", "won", "lost",
];

export const DEAL_STAGE_COLORS: Record<DealStage, string> = {
  lead: "bg-[hsl(var(--crm-lead))]/10 text-[hsl(var(--crm-lead))] border-[hsl(var(--crm-lead))]/20",
  qualified: "bg-[hsl(var(--crm-qualified))]/10 text-[hsl(var(--crm-qualified))] border-[hsl(var(--crm-qualified))]/20",
  quote_sent: "bg-[hsl(var(--crm-quote))]/10 text-[hsl(var(--crm-quote))] border-[hsl(var(--crm-quote))]/20",
  site_visit: "bg-[hsl(var(--crm-visit))]/10 text-[hsl(var(--crm-visit))] border-[hsl(var(--crm-visit))]/20",
  negotiation: "bg-[hsl(var(--crm-negotiation))]/10 text-[hsl(var(--crm-negotiation))] border-[hsl(var(--crm-negotiation))]/20",
  won: "bg-[hsl(var(--crm-won))]/10 text-[hsl(var(--crm-won))] border-[hsl(var(--crm-won))]/20",
  lost: "bg-[hsl(var(--crm-lost))]/10 text-[hsl(var(--crm-lost))] border-[hsl(var(--crm-lost))]/20",
};

export const DEAL_STAGE_BG: Record<DealStage, string> = {
  lead: "hsl(var(--crm-lead))",
  qualified: "hsl(var(--crm-qualified))",
  quote_sent: "hsl(var(--crm-quote))",
  site_visit: "hsl(var(--crm-visit))",
  negotiation: "hsl(var(--crm-negotiation))",
  won: "hsl(var(--crm-won))",
  lost: "hsl(var(--crm-lost))",
};

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  note: "Notat",
  call: "Samtale",
  email: "E-post",
  meeting: "Møte",
  task: "Oppgave",
  status_change: "Statusendring",
};

export const PIPELINE_STAGES = DEAL_STAGE_ORDER.filter(s => s !== "won" && s !== "lost");

export const QUOTE_STATUS_LABELS: Record<string, string> = {
  draft: "Utkast",
  sent: "Sendt",
  accepted: "Akseptert",
  rejected: "Avslått",
  expired: "Utløpt",
};

export const QUOTE_STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-500/10 text-blue-600",
  accepted: "bg-emerald-500/10 text-emerald-600",
  rejected: "bg-destructive/10 text-destructive",
  expired: "bg-amber-500/10 text-amber-600",
};

export function formatCurrency(value: number | null | undefined, currency = "NOK"): string {
  if (value == null) return "–";
  return new Intl.NumberFormat("nb-NO", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}
