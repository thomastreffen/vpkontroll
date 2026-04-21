import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActionItem {
  type: string;
  label: string;
  reason: string;
  link: string;
  priority: number;
  severity: "critical" | "warning" | "info";
}

interface Props {
  items: ActionItem[];
}

const dotColor: Record<string, string> = {
  critical: "bg-red-500",
  warning: "bg-amber-400",
  info: "bg-muted-foreground/40",
};

const typePill: Record<string, string> = {
  Avtale: "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400",
  Sak: "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400",
  Deal: "bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400",
  Jobb: "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400",
  Besøk: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400",
};

export default function DashActionItems({ items }: Props) {
  const navigate = useNavigate();

  if (!items.length) return null;

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card [box-shadow:var(--shadow-card)]">
      <div className="px-5 py-2.5 border-b border-border bg-muted/30 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{items.length} {items.length === 1 ? "oppgave" : "oppgaver"}</span>
        {items.filter(i => i.severity === "critical").length > 0 && (
          <span className="text-[11px] font-medium text-red-600 dark:text-red-400">
            {items.filter(i => i.severity === "critical").length} kritisk
          </span>
        )}
      </div>
      <div className="divide-y divide-border">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-muted/40 transition-colors group"
            onClick={() => navigate(item.link)}
          >
            <span className={cn("w-2 h-2 rounded-full shrink-0", dotColor[item.severity])} />
            <span className={cn(
              "text-[11px] font-medium px-1.5 py-0.5 rounded shrink-0",
              typePill[item.type] ?? "bg-muted text-muted-foreground"
            )}>
              {item.type}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{item.label}</p>
              <p className="text-xs text-muted-foreground truncate">{item.reason}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0 group-hover:text-muted-foreground transition-colors" />
          </div>
        ))}
      </div>
    </div>
  );
}
