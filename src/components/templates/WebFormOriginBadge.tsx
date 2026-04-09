import { Globe, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

interface WebFormOriginBadgeProps {
  submissionId?: string | null;
  templateName?: string | null;
  submittedAt?: string | null;
}

export default function WebFormOriginBadge({ submissionId, templateName, submittedAt }: WebFormOriginBadgeProps) {
  if (!submissionId) return null;

  return (
    <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-md bg-cyan-500/10 border border-cyan-500/20">
      <Globe className="h-3.5 w-3.5 text-cyan-600 shrink-0" />
      <span className="text-cyan-700 dark:text-cyan-400 font-medium">Opprettet fra nettskjema</span>
      {templateName && (
        <Badge variant="outline" className="text-[10px] border-cyan-500/30 text-cyan-600">
          {templateName}
        </Badge>
      )}
      {submittedAt && (
        <span className="text-muted-foreground text-[10px]">
          {new Date(submittedAt).toLocaleDateString("nb-NO")}
        </span>
      )}
      <Link to={`/tenant/templates/submissions?highlight=${submissionId}`} className="ml-auto text-cyan-600 hover:text-cyan-700">
        <ExternalLink className="h-3 w-3" />
      </Link>
    </div>
  );
}
