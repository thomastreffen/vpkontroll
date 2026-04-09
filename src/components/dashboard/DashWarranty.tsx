import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";
import { format } from "date-fns";
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

export default function DashWarranty({ warranties }: Props) {
  const navigate = useNavigate();

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4" /> Garantisaker
          </CardTitle>
          <button className="text-xs text-primary hover:underline" onClick={() => navigate("/tenant/crm/warranties")}>
            Se alle →
          </button>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        {!warranties.length ? (
          <p className="text-sm text-muted-foreground text-center py-4">Ingen åpne garantisaker</p>
        ) : (
          <div className="divide-y divide-border">
            {warranties.slice(0, 5).map((w) => (
              <div
                key={w.id}
                className="flex items-center gap-3 py-2 cursor-pointer hover:bg-muted/50 rounded-md px-2 -mx-2 transition-colors"
                onClick={() => navigate(`/tenant/crm/warranty/${w.id}`)}
              >
                <span className="text-xs font-mono text-muted-foreground shrink-0">{w.warranty_number}</span>
                <p className="text-sm truncate flex-1">{w.issue_description}</p>
                <span className="text-[10px] text-muted-foreground">{format(new Date(w.created_at), "d. MMM", { locale: nb })}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
