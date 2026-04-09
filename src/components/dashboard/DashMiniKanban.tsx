import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DEAL_STAGE_LABELS, DEAL_STAGE_COLORS, formatCurrency, type DealStage } from "@/lib/crm-labels";

interface Deal {
  id: string;
  title: string;
  stage: string;
  value: number | null;
}

interface Props {
  dealsByStage: Record<string, Deal[]>;
}

const KANBAN_STAGES: DealStage[] = ["lead", "qualified", "site_visit", "quote_sent", "negotiation"];

export default function DashMiniKanban({ dealsByStage }: Props) {
  const navigate = useNavigate();

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Salgspipeline</CardTitle>
          <button
            className="text-xs text-primary hover:underline"
            onClick={() => navigate("/tenant/crm/deals")}
          >
            Se alle →
          </button>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="grid grid-cols-5 gap-2">
          {KANBAN_STAGES.map((stage) => {
            const items = dealsByStage[stage] ?? [];
            const total = items.reduce((s, d) => s + (d.value ?? 0), 0);
            return (
              <div key={stage} className="space-y-2">
                <button
                  className="w-full text-left hover:opacity-80 transition-opacity"
                  onClick={() => navigate(`/tenant/crm/deals?stage=${stage}`)}
                >
                  <Badge variant="outline" className={`${DEAL_STAGE_COLORS[stage]} text-[10px] w-full justify-center`}>
                    {DEAL_STAGE_LABELS[stage]}
                  </Badge>
                  <div className="flex items-baseline justify-between mt-1 px-0.5">
                    <span className="text-lg font-bold">{items.length}</span>
                    {total > 0 && <span className="text-[10px] text-muted-foreground">{formatCurrency(total)}</span>}
                  </div>
                </button>
                <div className="space-y-1">
                  {items.slice(0, 3).map((deal) => (
                    <div
                      key={deal.id}
                      className="p-1.5 rounded-md bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                      onClick={() => navigate(`/tenant/crm/deals/${deal.id}`)}
                    >
                      <p className="text-xs font-medium truncate">{deal.title}</p>
                      {deal.value != null && <p className="text-[10px] text-muted-foreground">{formatCurrency(deal.value)}</p>}
                    </div>
                  ))}
                  {items.length > 3 && (
                    <p className="text-[10px] text-muted-foreground text-center">+{items.length - 3} til</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
