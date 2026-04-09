import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DEAL_STAGE_LABELS, DEAL_STAGE_COLORS, formatCurrency, type DealStage } from "@/lib/crm-labels";
import { Trophy } from "lucide-react";

interface Deal {
  id: string;
  title: string;
  stage: string;
  value: number | null;
  company_id: string | null;
  contact_id?: string | null;
  site_id?: string | null;
  site_visit_data?: any;
  site_visit_template_id?: string | null;
}

interface Props {
  dealsByStage: Record<string, Deal[]>;
  wonDeals: Array<{ id: string; title: string; value: number | null }>;
  companyMap: Record<string, string>;
}

const KANBAN_STAGES: DealStage[] = ["lead", "qualified", "site_visit", "quote_sent", "negotiation"];

function getDealWarning(deal: Deal): string | null {
  if (!deal.company_id) return "Mangler kunde";
  if (deal.stage === "site_visit" && (!deal.site_visit_data || !(deal.site_visit_data as any)?.template_id)) return "Mangler befaring";
  if (deal.stage === "quote_sent") return null;
  if (deal.stage === "negotiation") return null;
  return null;
}

export default function DashMiniKanban({ dealsByStage, wonDeals, companyMap }: Props) {
  const navigate = useNavigate();
  const wonTotal = wonDeals.reduce((s, d) => s + (d.value ?? 0), 0);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Salgspipeline</CardTitle>
          <div className="flex items-center gap-3">
            {wonDeals.length > 0 && (
              <div className="flex items-center gap-1.5 text-[hsl(var(--crm-won))]">
                <Trophy className="w-3.5 h-3.5" />
                <span className="text-xs font-semibold">{wonDeals.length} vunnet</span>
                {wonTotal > 0 && <span className="text-[10px] opacity-70">{formatCurrency(wonTotal)}</span>}
              </div>
            )}
            <button
              className="text-xs text-primary hover:underline"
              onClick={() => navigate("/tenant/crm/deals")}
            >
              Se alle →
            </button>
          </div>
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
                <div className="space-y-1.5 min-h-[60px]">
                  {items.length === 0 && (
                    <div className="flex items-center justify-center h-[60px] rounded-md border border-dashed border-border/60">
                      <span className="text-[10px] text-muted-foreground">Ingen deals</span>
                    </div>
                  )}
                  {items.slice(0, 3).map((deal) => {
                    const warning = getDealWarning(deal);
                    const customer = deal.company_id ? companyMap[deal.company_id] : null;
                    return (
                      <div
                        key={deal.id}
                        className="p-2 rounded-md bg-muted/50 hover:bg-muted cursor-pointer transition-colors border border-transparent hover:border-border/60"
                        onClick={() => navigate(`/tenant/crm/deals/${deal.id}`)}
                      >
                        <p className="text-xs font-medium truncate">{deal.title}</p>
                        {customer && <p className="text-[10px] text-muted-foreground truncate">{customer}</p>}
                        {deal.value != null && <p className="text-[10px] font-medium text-foreground/70">{formatCurrency(deal.value)}</p>}
                        {warning && (
                          <span className="inline-block mt-0.5 text-[9px] text-destructive/80 font-medium">⚠ {warning}</span>
                        )}
                      </div>
                    );
                  })}
                  {items.length > 3 && (
                    <button
                      className="text-[10px] text-primary hover:underline w-full text-center"
                      onClick={(e) => { e.stopPropagation(); navigate(`/tenant/crm/deals?stage=${stage}`); }}
                    >
                      +{items.length - 3} til →
                    </button>
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
