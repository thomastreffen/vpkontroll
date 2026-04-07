import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { WarrantyFormDialog } from "@/components/crud/WarrantyFormDialog";
import {
  Plus,
  Briefcase,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface CaseActionsProps {
  caseId: string;
  companyId: string | null;
  siteId: string | null;
  assetId: string | null;
  customerName: string | null;
  customerEmail: string | null;
  caseTitle: string;
  onUpdated: () => void;
}

export function CaseActions({
  caseId,
  companyId,
  siteId,
  assetId,
  customerName,
  customerEmail,
  caseTitle,
  onUpdated,
}: CaseActionsProps) {
  const { tenantId } = useAuth();
  const navigate = useNavigate();
  const [warrantyOpen, setWarrantyOpen] = useState(false);

  const createJob = async () => {
    if (!tenantId) return;
    const { data, error } = await supabase
      .from("jobs")
      .insert({
        tenant_id: tenantId,
        title: caseTitle || "Jobb fra sak",
        job_number: "TEMP",
        company_id: companyId,
        site_id: siteId,
        asset_id: assetId,
        job_type: "repair",
        priority: "normal",
      } as any)
      .select("id")
      .single();

    if (error) {
      toast.error("Kunne ikke opprette jobb");
      return;
    }
    // Link job to case
    await supabase.from("cases").update({ job_id: data.id } as any).eq("id", caseId);
    toast.success("Jobb opprettet og koblet til sak");
    onUpdated();
    navigate(`/tenant/crm/jobs/${data.id}`);
  };

  const createDeal = async () => {
    if (!tenantId) return;
    const { data, error } = await supabase
      .from("crm_deals")
      .insert({
        tenant_id: tenantId,
        title: caseTitle || "Deal fra sak",
        company_id: companyId,
        case_id: caseId,
        stage: "lead",
      })
      .select("id")
      .single();

    if (error) {
      toast.error("Kunne ikke opprette deal");
      return;
    }
    toast.success("Deal opprettet og koblet til sak");
    onUpdated();
  };

  const handleWarrantyCreated = async (warrantyId: string) => {
    await supabase.from("cases").update({ warranty_case_id: warrantyId } as any).eq("id", caseId);
    toast.success("Garantisak koblet");
    onUpdated();
    setWarrantyOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Opprett fra sak
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={createDeal} className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Ny deal
          </DropdownMenuItem>
          <DropdownMenuItem onClick={createJob} className="gap-2">
            <Briefcase className="h-4 w-4" />
            Ny jobb
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setWarrantyOpen(true)} className="gap-2">
            <ShieldAlert className="h-4 w-4" />
            Ny garantisak
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {warrantyOpen && tenantId && (
        <WarrantyFormDialog
          open={warrantyOpen}
          onOpenChange={setWarrantyOpen}
          tenantId={tenantId}
          companyId={companyId || undefined}
          assetId={assetId || undefined}
          onCreated={handleWarrantyCreated}
        />
      )}
    </>
  );
}
