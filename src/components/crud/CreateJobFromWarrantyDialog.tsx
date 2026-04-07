import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface CreateJobFromWarrantyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warranty: any;
}

export function CreateJobFromWarrantyDialog({ open, onOpenChange, warranty }: CreateJobFromWarrantyDialogProps) {
  const { tenantId } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState(`Reparasjon – ${warranty?.warranty_number || ""}`);
  const [description, setDescription] = useState(warranty?.issue_description || "");

  const mutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("Ingen tenant");
      const { error } = await supabase.from("jobs").insert({
        tenant_id: tenantId,
        title,
        description: description || null,
        job_type: "warranty" as any,
        job_number: "JOBB-TEMP",
        company_id: warranty.company_id || null,
        asset_id: warranty.asset_id || null,
        priority: "high" as any,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Reparasjonsjobb opprettet");
      qc.invalidateQueries({ queryKey: ["warranty-jobs"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Opprett reparasjonsjobb</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-2">
          <div><Label>Tittel *</Label><Input value={title} onChange={e => setTitle(e.target.value)} /></div>
          <div><Label>Beskrivelse</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Avbryt</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !title}>
            {mutation.isPending ? "Oppretter..." : "Opprett jobb"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
