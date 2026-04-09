import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileX } from "lucide-react";

interface Job {
  id: string;
  job_number: string;
  title: string;
  job_type: string;
}

interface Visit {
  id: string;
  agreement_id: string | null;
  job_id: string | null;
}

interface Props {
  jobsMissingForm: Job[];
  visitsMissingReport: Visit[];
}

export default function DashDocsStatus({ jobsMissingForm, visitsMissingReport }: Props) {
  const navigate = useNavigate();
  const total = jobsMissingForm.length + visitsMissingReport.length;

  if (!total) {
    return null;
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <FileX className="w-4 h-4 text-[hsl(var(--warning))]" />
          Skjema mangler
          <Badge variant="outline" className="bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))] ml-auto text-xs">{total}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="divide-y divide-border">
          {jobsMissingForm.slice(0, 5).map((j) => (
            <div
              key={j.id}
              className="flex items-center gap-3 py-2 cursor-pointer hover:bg-muted/50 rounded-md px-2 -mx-2 transition-colors"
              onClick={() => navigate(`/tenant/crm/jobs/${j.id}`)}
            >
              <Badge variant="outline" className="bg-[hsl(var(--crm-visit))]/10 text-[hsl(var(--crm-visit))] text-[10px]">Jobb</Badge>
              <p className="text-sm font-medium truncate flex-1">{j.job_number} – {j.title}</p>
              <span className="text-xs text-muted-foreground">{j.job_type === "installation" ? "Installasjon" : "Service"}</span>
            </div>
          ))}
          {visitsMissingReport.slice(0, 5).map((v) => (
            <div
              key={v.id}
              className="flex items-center gap-3 py-2 cursor-pointer hover:bg-muted/50 rounded-md px-2 -mx-2 transition-colors"
              onClick={() => navigate(v.agreement_id ? `/tenant/crm/agreements/${v.agreement_id}` : `/tenant/crm/jobs/${v.job_id}`)}
            >
              <Badge variant="outline" className="bg-[hsl(var(--crm-quote))]/10 text-[hsl(var(--crm-quote))] text-[10px]">Besøk</Badge>
              <p className="text-sm font-medium truncate flex-1">Servicebesøk uten rapport</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
