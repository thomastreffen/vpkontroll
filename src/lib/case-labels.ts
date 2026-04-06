export type CaseStatus = "new" | "triage" | "in_progress" | "waiting_customer" | "waiting_internal" | "closed" | "archived" | "converted";
export type CasePriority = "low" | "normal" | "high" | "critical";
export type CaseNextAction = "call" | "quote" | "clarify" | "order" | "schedule" | "document" | "none";

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  new: "Ny",
  triage: "Under vurdering",
  in_progress: "Under arbeid",
  waiting_customer: "Avventer kunde",
  waiting_internal: "Avventer internt",
  closed: "Lukket",
  archived: "Arkivert",
  converted: "Konvertert",
};

export const CASE_STATUS_COLOR: Record<CaseStatus, string> = {
  new: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  triage: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  in_progress: "bg-primary/10 text-primary border-primary/20",
  waiting_customer: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  waiting_internal: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  closed: "bg-muted text-muted-foreground border-border",
  archived: "bg-muted text-muted-foreground border-border",
  converted: "bg-accent/10 text-accent border-accent/20",
};

export const CASE_PRIORITY_LABELS: Record<CasePriority, string> = {
  low: "Lav",
  normal: "Normal",
  high: "Høy",
  critical: "Kritisk",
};

export const CASE_PRIORITY_COLOR: Record<CasePriority, string> = {
  low: "text-muted-foreground",
  normal: "text-foreground",
  high: "text-orange-500",
  critical: "text-destructive",
};

export const ALL_CASE_STATUSES: CaseStatus[] = ["new", "triage", "in_progress", "waiting_customer", "waiting_internal", "closed", "archived", "converted"];
export const ALL_CASE_PRIORITIES: CasePriority[] = ["low", "normal", "high", "critical"];
