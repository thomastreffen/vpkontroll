import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail } from "lucide-react";

interface CaseItem {
  id: string;
  case_number: string;
  title: string;
  status: string;
  owner_user_id: string | null;
  customer_name: string | null;
}

interface Props {
  cases: CaseItem[];
  casesWithoutOwner: CaseItem[];
}

const statusLabel: Record<string, string> = { new: "Ny", triage: "Triage", in_progress: "Pågår", waiting_customer: "Venter", waiting_internal: "Intern" };
const statusColor: Record<string, string> = {
  new: "bg-[hsl(var(--crm-lead))]/10 text-[hsl(var(--crm-lead))]",
  in_progress: "bg-[hsl(var(--crm-visit))]/10 text-[hsl(var(--crm-visit))]",
  waiting_customer: "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]",
  waiting_internal: "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]",
  triage: "bg-[hsl(var(--crm-qualified))]/10 text-[hsl(var(--crm-qualified))]",
};

export default function DashPostkontoret({ cases, casesWithoutOwner }: Props) {
  const navigate = useNavigate();
  const newCount = cases.filter(c => c.status === "new").length;
  const openCount = cases.filter(c => c.status === "open").length;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="w-4 h-4" /> Postkontoret
          </CardTitle>
          <button className="text-xs text-primary hover:underline" onClick={() => navigate("/tenant/postkontoret")}>
            Åpne →
          </button>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="flex gap-4 mb-3">
          <div className="text-center">
            <span className="text-xl font-bold">{newCount}</span>
            <p className="text-[10px] text-muted-foreground">Nye</p>
          </div>
          <div className="text-center">
            <span className="text-xl font-bold">{openCount}</span>
            <p className="text-[10px] text-muted-foreground">Under arbeid</p>
          </div>
          <div className="text-center">
            <span className="text-xl font-bold text-destructive">{casesWithoutOwner.length}</span>
            <p className="text-[10px] text-muted-foreground">Uten eier</p>
          </div>
        </div>
        {cases.length > 0 && (
          <div className="divide-y divide-border">
            {cases.slice(0, 5).map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 py-2 cursor-pointer hover:bg-muted/50 rounded-md px-2 -mx-2 transition-colors"
                onClick={() => navigate("/tenant/postkontoret")}
              >
                <span className="text-xs font-mono text-muted-foreground shrink-0">{c.case_number}</span>
                <p className="text-sm truncate flex-1">{c.title || c.customer_name || "Uten tittel"}</p>
                <Badge variant="outline" className={`${statusColor[c.status] ?? ""} text-[10px]`}>
                  {statusLabel[c.status] ?? c.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
        {!cases.length && (
          <p className="text-sm text-muted-foreground text-center py-2">Ingen åpne saker</p>
        )}
      </CardContent>
    </Card>
  );
}
