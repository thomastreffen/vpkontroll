import { useNavigate } from "react-router-dom";
import { DEAL_STAGE_LABELS, formatCurrency, type DealStage } from "@/lib/crm-labels";
import { Trophy, ArrowRight } from "lucide-react";

interface Deal {
  id: string;
  title: string;
  stage: string;
  value: number | null;
  company_id: string | null;
}

interface Props {
  dealsByStage: Record<string, Deal[]>;
  wonDeals: Array<{ id: string; title: string; value: number | null }>;
  companyMap: Record<string, string>;
}

const PIPELINE_STAGES: DealStage[] = ["lead", "qualified", "site_visit", "quote_sent", "negotiation"];

const stageColor: Record<DealStage, string> = {
  lead: "bg-[hsl(var(--crm-lead))]",
  qualified: "bg-[hsl(var(--crm-qualified))]",
  site_visit: "bg-[hsl(var(--crm-visit))]",
  quote_sent: "bg-[hsl(var(--crm-quote))]",
  negotiation: "bg-[hsl(var(--crm-negotiation))]",
  won: "bg-[hsl(var(--crm-won))]",
  lost: "bg-[hsl(var(--crm-lost))]",
};

const stageTextColor: Record<DealStage, string> = {
  lead: "text-[hsl(var(--crm-lead))]",
  qualified: "text-[hsl(var(--crm-qualified))]",
  site_visit: "text-[hsl(var(--crm-visit))]",
  quote_sent: "text-[hsl(var(--crm-quote))]",
  negotiation: "text-[hsl(var(--crm-negotiation))]",
  won: "text-[hsl(var(--crm-won))]",
  lost: "text-[hsl(var(--crm-lost))]",
};

export default function DashMiniKanban({ dealsByStage, wonDeals, companyMap }: Props) {
  const navigate = useNavigate();

  const activeStages = PIPELINE_STAGES.filter(s => (dealsByStage[s]?.length ?? 0) > 0);
  const totalDeals = PIPELINE_STAGES.reduce((n, s) => n + (dealsByStage[s]?.length ?? 0), 0);
  const totalValue = PIPELINE_STAGES.reduce((sum, s) => sum + (dealsByStage[s] ?? []).reduce((s2, d) => s2 + (d.value ?? 0), 0), 0);
  const wonTotal = wonDeals.reduce((s, d) => s + (d.value ?? 0), 0);

  return (
    <div className="rounded-xl border border-border bg-card [box-shadow:var(--shadow-card)] p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold">Pipeline</span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {totalDeals} {totalDeals === 1 ? "salg" : "salg"}
            {totalValue > 0 && <span> · {formatCurrency(totalValue)}</span>}
          </span>
        </div>
        <div className="flex items-center gap-4">
          {wonDeals.length > 0 && (
            <div className="flex items-center gap-1.5 text-[hsl(var(--crm-won))]">
              <Trophy className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold">{wonDeals.length} vunnet</span>
              {wonTotal > 0 && <span className="text-xs opacity-70">{formatCurrency(wonTotal)}</span>}
            </div>
          )}
          <button
            className="flex items-center gap-1 text-xs text-primary hover:underline"
            onClick={() => navigate("/tenant/crm/deals")}
          >
            Se alle <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {totalDeals > 0 && (
        <div className="flex h-2 rounded-full overflow-hidden gap-px mb-4">
          {PIPELINE_STAGES.map(s => {
            const count = dealsByStage[s]?.length ?? 0;
            if (!count) return null;
            return (
              <div
                key={s}
                className={`${stageColor[s]} transition-all`}
                style={{ flex: count }}
                title={`${DEAL_STAGE_LABELS[s]}: ${count}`}
              />
            );
          })}
        </div>
      )}

      {/* Stage counts — only non-zero */}
      <div className="flex flex-wrap gap-4">
        {activeStages.map(s => {
          const count = dealsByStage[s]?.length ?? 0;
          const value = (dealsByStage[s] ?? []).reduce((sum, d) => sum + (d.value ?? 0), 0);
          return (
            <button
              key={s}
              className="text-left hover:opacity-80 transition-opacity"
              onClick={() => navigate(`/tenant/crm/deals?stage=${s}`)}
            >
              <p className={`text-lg font-bold leading-none ${stageTextColor[s]}`}>{count}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{DEAL_STAGE_LABELS[s]}</p>
              {value > 0 && <p className="text-[11px] text-muted-foreground/70">{formatCurrency(value)}</p>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
