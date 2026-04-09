import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";

interface ActionItem {
  type: string;
  label: string;
  reason: string;
  link: string;
  priority: number;
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

export default function DashActionItems({ items }: Props) {
  const navigate = useNavigate();

  if (!items.length) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          ✓ Ingen handlinger som krever oppmerksomhet akkurat nå
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-destructive" />
          Trenger handling nå
          <Badge variant="destructive" className="ml-auto text-xs">{items.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="divide-y divide-border">
          {items.map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-3 py-2 cursor-pointer hover:bg-muted/50 rounded-md px-2 -mx-2 transition-colors"
              onClick={() => navigate(item.link)}
            >
              <Badge variant="outline" className={`${typeBg[item.type] ?? "bg-muted text-muted-foreground"} text-[10px] shrink-0`}>
                {item.type}
              </Badge>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{item.label}</p>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">{item.reason}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
