import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { nb } from "date-fns/locale";

interface Warranty {
  id: string;
  warranty_number: string;
  issue_description: string;
  status: string;
  created_at: string;
}

interface Props {
  warranties: Warranty[];
}

const statusLabel: Record<string, string> = { open: "Åpen", investigating: "Under behandling" };
const statusColor: Record<string, string> = {
  open: "bg-[hsl(var(--crm-lead))]/10 text-[hsl(var(--crm-lead))]",
  investigating: "bg-[hsl(var(--crm-visit))]/10 text-[hsl(var(--crm-visit))]",
};

export default function DashWarranty({ warranties }: Props) {
  const navigate = useNavigate();

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4" /> Garantisaker
            {warranties.length > 0 && (
              <Badge variant="outline" className="text-[10px] ml-1">{warranties.length}</Badge>
            )}
          </CardTitle>
          <button className="text-xs text-primary hover:underline" onClick={() => navigate("/tenant/crm/warranties")}>
            Se alle →
          </button>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        {!warranties.length ? (
          <div className="flex flex-col items-center py-6 text-center">
            <Shield className="w-8 h-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">Ingen åpne garantisaker</p>
          </div>
        ) : (
          <div className="space-y-1">
            {warranties.slice(0, 5).map((w) => {
              const age = differenceInDays(new Date(), new Date(w.created_at));
              const isOld = age > 14;
              return (
                <div
                  key={w.id}
                  className="flex items-center gap-2.5 py-2 cursor-pointer hover:bg-muted/50 rounded-md px-2 -mx-2 transition-colors"
                  onClick={() => navigate(`/tenant/crm/warranty/${w.id}`)}
                >
                  <span className="text-[10px] font-mono text-muted-foreground shrink-0">{w.warranty_number}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{w.issue_description}</p>
                    <p className={`text-[10px] ${isOld ? "text-destructive/80 font-medium" : "text-muted-foreground"}`}>
                      {isOld ? `${age} dager – krever oppfølging` : `${age} dager siden`}
                    </p>
                  </div>
                  <Badge variant="outline" className={`${statusColor[w.status] ?? ""} text-[9px] shrink-0`}>
                    {statusLabel[w.status] ?? w.status}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
