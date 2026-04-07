import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EntityPickerDialog } from "./EntityPickerDialog";
import {
  Building2,
  MapPin,
  Cpu,
  Briefcase,
  ShieldAlert,
  Link2,
  ExternalLink,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface CaseData {
  id: string;
  company_id: string | null;
  site_id: string | null;
  asset_id: string | null;
  job_id: string | null;
  warranty_case_id: string | null;
}

interface CaseLinkingSectionProps {
  caseData: CaseData;
  onUpdated: () => void;
}

type PickerType = "company" | "site" | "asset" | "job" | "warranty" | null;

type LinkedInfo = {
  company?: { id: string; name: string } | null;
  site?: { id: string; name: string | null; address: string | null } | null;
  asset?: { id: string; manufacturer: string | null; model: string | null } | null;
  job?: { id: string; job_number: string; title: string } | null;
  warranty?: { id: string; warranty_number: string } | null;
};

export function CaseLinkingSection({ caseData, onUpdated }: CaseLinkingSectionProps) {
  const { tenantId } = useAuth();
  const navigate = useNavigate();
  const [pickerOpen, setPickerOpen] = useState<PickerType>(null);
  const [linked, setLinked] = useState<LinkedInfo>({});

  useEffect(() => {
    fetchLinkedInfo();
  }, [caseData.company_id, caseData.site_id, caseData.asset_id, caseData.job_id, caseData.warranty_case_id]);

  const fetchLinkedInfo = async () => {
    const info: LinkedInfo = {};

    const fetchers: (() => Promise<void>)[] = [];

    if (caseData.company_id) {
      fetchers.push(async () => {
        const { data } = await supabase.from("crm_companies").select("id, name").eq("id", caseData.company_id!).single();
        info.company = data;
      });
    }
    if (caseData.site_id) {
      fetchers.push(async () => {
        const { data } = await supabase.from("customer_sites").select("id, name, address").eq("id", caseData.site_id!).single();
        info.site = data;
      });
    }
    if (caseData.asset_id) {
      fetchers.push(async () => {
        const { data } = await supabase.from("hvac_assets").select("id, manufacturer, model").eq("id", caseData.asset_id!).single();
        info.asset = data;
      });
    }
    if (caseData.job_id) {
      fetchers.push(async () => {
        const { data } = await supabase.from("jobs").select("id, job_number, title").eq("id", caseData.job_id!).single();
        info.job = data;
      });
    }
    if (caseData.warranty_case_id) {
      fetchers.push(async () => {
        const { data } = await supabase.from("warranty_cases").select("id, warranty_number").eq("id", caseData.warranty_case_id!).single();
        info.warranty = data;
      });
    }

    await Promise.all(fetchers.map(f => f()));
    setLinked(info);
  };

  const linkEntity = async (type: PickerType, entityId: string) => {
    if (!type) return;
    const fieldMap: Record<string, string> = {
      company: "company_id",
      site: "site_id",
      asset: "asset_id",
      job: "job_id",
      warranty: "warranty_case_id",
    };
    const { error } = await supabase
      .from("cases")
      .update({ [fieldMap[type]]: entityId } as any)
      .eq("id", caseData.id);
    if (error) {
      toast.error("Kunne ikke koble");
    } else {
      toast.success("Koblet");
      onUpdated();
    }
  };

  const unlinkEntity = async (type: string) => {
    const fieldMap: Record<string, string> = {
      company: "company_id",
      site: "site_id",
      asset: "asset_id",
      job: "job_id",
      warranty: "warranty_case_id",
    };
    const { error } = await supabase
      .from("cases")
      .update({ [fieldMap[type]]: null } as any)
      .eq("id", caseData.id);
    if (error) {
      toast.error("Kunne ikke fjerne kobling");
    } else {
      toast.success("Kobling fjernet");
      onUpdated();
    }
  };

  const links = [
    {
      key: "company" as const,
      icon: Building2,
      label: "Bedrift",
      linked: linked.company,
      linkedLabel: linked.company?.name,
      hasId: !!caseData.company_id,
      navTo: caseData.company_id ? `/tenant/crm/companies/${caseData.company_id}` : null,
    },
    {
      key: "site" as const,
      icon: MapPin,
      label: "Site",
      linked: linked.site,
      linkedLabel: linked.site?.name || linked.site?.address,
      hasId: !!caseData.site_id,
      navTo: null, // no dedicated site page yet
    },
    {
      key: "asset" as const,
      icon: Cpu,
      label: "Anlegg",
      linked: linked.asset,
      linkedLabel: [linked.asset?.manufacturer, linked.asset?.model].filter(Boolean).join(" "),
      hasId: !!caseData.asset_id,
      navTo: caseData.asset_id ? `/tenant/crm/assets/${caseData.asset_id}` : null,
    },
    {
      key: "job" as const,
      icon: Briefcase,
      label: "Jobb",
      linked: linked.job,
      linkedLabel: linked.job ? `${linked.job.job_number} — ${linked.job.title}` : null,
      hasId: !!caseData.job_id,
      navTo: caseData.job_id ? `/tenant/crm/jobs/${caseData.job_id}` : null,
    },
    {
      key: "warranty" as const,
      icon: ShieldAlert,
      label: "Garanti",
      linked: linked.warranty,
      linkedLabel: linked.warranty?.warranty_number,
      hasId: !!caseData.warranty_case_id,
      navTo: caseData.warranty_case_id ? `/tenant/crm/warranty/${caseData.warranty_case_id}` : null,
    },
  ];

  return (
    <>
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Koblinger</h4>
        {links.map((l) => (
          <div
            key={l.key}
            className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md border border-border/50 bg-muted/20"
          >
            <div className="flex items-center gap-2 min-w-0">
              <l.icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              {l.hasId && l.linkedLabel ? (
                <span className="text-xs font-medium truncate">{l.linkedLabel}</span>
              ) : (
                <span className="text-xs text-muted-foreground italic">Ikke koblet</span>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {l.hasId && l.navTo && (
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => navigate(l.navTo!)}>
                  <ExternalLink className="h-3 w-3" />
                </Button>
              )}
              {l.hasId && (
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => unlinkEntity(l.key)}>
                  <X className="h-3 w-3" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setPickerOpen(l.key)}>
                <Link2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {pickerOpen && (
        <EntityPickerDialog
          open={!!pickerOpen}
          onOpenChange={(o) => { if (!o) setPickerOpen(null); }}
          entityType={pickerOpen}
          companyId={caseData.company_id || undefined}
          onSelect={(id) => linkEntity(pickerOpen, id)}
        />
      )}
    </>
  );
}
