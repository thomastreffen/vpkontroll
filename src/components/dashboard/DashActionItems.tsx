import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, AlertTriangle, Clock, Info } from "lucide-react";

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

const typeBg: Record<string, string> = {
  Sak: "bg-[hsl(var(--crm-lead))]/10 text-[hsl(var(--crm-lead))]",
  Deal: "bg-[hsl(var(--crm-qualified))]/10 text-[hsl(var(--crm-qualified))]",
  Jobb: "bg-[hsl(var(--crm-visit))]/10 text-[hsl(var(--crm-visit))]",
  Besøk: "bg-[hsl(var(--crm-quote))]/10 text-[hsl(var(--crm-quote))]",
  Avtale: "bg-destructive/10 text-destructive",
};

const severityIcon = {
  critical: <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0" />,
  warning: <AlertTriangle className="w-3.5 h-3.5 text-[hsl(var(--warning))] shrink-0" />,
  info: <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0" />,
};

const severityBorder = {
  critical: "border-l-destructive",
  warning: "border-l-[hsl(var(--warning))]",
  info: "border-l-border",
};

export default function DashActionItems({ items }: Props) {
  const navigate = useNavigate();

  if (!items.length) {
    return (
      <Card className="border-border/50 border-l-4 border-l-[hsl(var(--success))]">
        <CardContent className="py-6 text-center">
          <p className="text-sm font-medium text-[hsl(var(--success))]">✓ Alt er i orden</p>
          <p className="text-xs text-muted-foreground mt-1">Ingen handlinger som krever oppmerksomhet akkurat nå</p>
        </CardContent>
      </Card>
    );
  }

  const criticalCount = items.filter(i => i.severity === "critical").length;
  const warningCount = items.filter(i => i.severity === "warning").length;

  return (
    <Card className="border-border/50 border-l-4 border-l-destructive">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-destructive" />
            Trenger handling nå
          </CardTitle>
          <div className="flex items-center gap-2">
            {criticalCount > 0 && (
              <Badge variant="destructive" className="text-[10px] gap-1">
                {criticalCount} kritisk
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="outline" className="bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/20 text-[10px] gap-1">
                {warningCount} mangler
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="space-y-1">
          {items.map((item, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 py-2.5 cursor-pointer hover:bg-muted/50 rounded-md px-3 -mx-1 transition-colors border-l-2 ${severityBorder[item.severity]}`}
              onClick={() => navigate(item.link)}
            >
              {severityIcon[item.severity]}
              <Badge variant="outline" className={`${typeBg[item.type] ?? "bg-muted text-muted-foreground"} text-[10px] shrink-0`}>
                {item.type}
              </Badge>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{item.label}</p>
              </div>
              <span className="text-[11px] text-muted-foreground shrink-0">{item.reason}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
