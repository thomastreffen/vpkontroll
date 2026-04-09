import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileX, FileCheck } from "lucide-react";

interface Job {
  id: string;
  job_number: string;
  title: string;
  job_type: string;
  company_id: string | null;
}

interface Visit {
  id: string;
  agreement_id: string | null;
  job_id: string | null;
  scheduled_date?: string | null;
}

interface Deal {
  id: string;
  title: string;
}

interface Props {
  jobsMissingForm: Job[];
  visitsMissingReport: Visit[];
  dealsMissingInspection: Deal[];
  companyMap: Record<string, string>;
}

const jobTypeLabel: Record<string, string> = { installation: "Installasjon", service: "Service" };

export default function DashDocsStatus({ jobsMissingForm, visitsMissingReport, dealsMissingInspection, companyMap }: Props) {
  const navigate = useNavigate();
  const total = jobsMissingForm.length + visitsMissingReport.length + dealsMissingInspection.length;

  if (!total) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-6 text-center">
          <FileCheck className="w-8 h-8 text-[hsl(var(--success))]/40 mx-auto mb-2" />
          <p className="text-sm font-medium text-[hsl(var(--success))]">Alle skjema utfylt</p>
          <p className="text-xs text-muted-foreground mt-0.5">Ingen mangler akkurat nå</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 border-l-4 border-l-[hsl(var(--warning))]">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <FileX className="w-4 h-4 text-[hsl(var(--warning))]" />
          Dokumentasjon
          <Badge variant="outline" className="bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/20 ml-auto text-[10px]">{total} mangler</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="space-y-1">
          {jobsMissingForm.slice(0, 4).map((j) => {
            const customer = j.company_id ? companyMap[j.company_id] : null;
            return (
              <div
                key={j.id}
                className="flex items-center gap-3 py-2 cursor-pointer hover:bg-muted/50 rounded-md px-2 -mx-2 transition-colors"
                onClick={() => navigate(`/tenant/crm/jobs/${j.id}`)}
              >
                <Badge variant="outline" className="bg-[hsl(var(--crm-visit))]/10 text-[hsl(var(--crm-visit))] text-[9px] shrink-0">Jobb</Badge>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{j.job_number} – {j.title}</p>
                  {customer && <p className="text-[10px] text-muted-foreground truncate">{customer}</p>}
                </div>
                <Badge variant="outline" className="bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))] text-[9px] shrink-0">Skjema mangler</Badge>
              </div>
            );
          })}
          {visitsMissingReport.slice(0, 3).map((v) => (
            <div
              key={v.id}
              className="flex items-center gap-3 py-2 cursor-pointer hover:bg-muted/50 rounded-md px-2 -mx-2 transition-colors"
              onClick={() => navigate(v.agreement_id ? `/tenant/crm/agreements/${v.agreement_id}` : `/tenant/crm/jobs/${v.job_id}`)}
            >
              <Badge variant="outline" className="bg-[hsl(var(--crm-quote))]/10 text-[hsl(var(--crm-quote))] text-[9px] shrink-0">Besøk</Badge>
              <p className="text-xs font-medium truncate flex-1">Servicebesøk uten rapport</p>
              <Badge variant="outline" className="bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))] text-[9px] shrink-0">Rapport mangler</Badge>
            </div>
          ))}
          {dealsMissingInspection.slice(0, 3).map((d) => (
            <div
              key={d.id}
              className="flex items-center gap-3 py-2 cursor-pointer hover:bg-muted/50 rounded-md px-2 -mx-2 transition-colors"
              onClick={() => navigate(`/tenant/crm/deals/${d.id}`)}
            >
              <Badge variant="outline" className="bg-[hsl(var(--crm-qualified))]/10 text-[hsl(var(--crm-qualified))] text-[9px] shrink-0">Deal</Badge>
              <p className="text-xs font-medium truncate flex-1">{d.title}</p>
              <Badge variant="outline" className="bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))] text-[9px] shrink-0">Befaring mangler</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
