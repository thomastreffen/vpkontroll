import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/domain-labels";

interface ChecklistSectionProps {
  checklists: any[] | undefined;
  jobId: string;
  jobType: string;
}

const DEFAULT_INSTALL_ITEMS = [
  "Utedel montert og festet",
  "Innedel montert",
  "Rørføring koblet",
  "Elektrisk tilkobling utført",
  "Vakuumtest gjennomført",
  "Kuldemedium fylt",
  "Testdrift gjennomført",
  "Kunde instruert i bruk",
  "Arbeidsområde ryddet",
];

export function ChecklistSection({ checklists, jobId, jobType }: ChecklistSectionProps) {
  const { tenantId, user } = useAuth();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [templateName, setTemplateName] = useState(jobType === "installation" ? "Installasjonssjekkliste" : "Sjekkliste");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["job-checklists", jobId] });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("Ingen tenant");
      const { data: cl, error: clErr } = await supabase.from("installation_checklists").insert({
        tenant_id: tenantId,
        job_id: jobId,
        template_name: templateName,
      }).select().single();
      if (clErr) throw clErr;

      const items = DEFAULT_INSTALL_ITEMS.map((label, i) => ({
        tenant_id: tenantId,
        checklist_id: cl.id,
        label,
        sort_order: i,
      }));
      const { error: itemErr } = await supabase.from("checklist_items").insert(items);
      if (itemErr) throw itemErr;
    },
    onSuccess: () => {
      toast.success("Sjekkliste opprettet");
      invalidate();
      setCreateOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleItem = useMutation({
    mutationFn: async ({ itemId, checked }: { itemId: string; checked: boolean }) => {
      const { error } = await supabase.from("checklist_items").update({
        is_checked: checked,
        checked_at: checked ? new Date().toISOString() : null,
        checked_by: checked ? user?.id || null : null,
      }).eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e.message),
  });

  const updateNote = useMutation({
    mutationFn: async ({ itemId, note }: { itemId: string; note: string }) => {
      const { error } = await supabase.from("checklist_items").update({ note: note || null }).eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e.message),
  });

  const completeChecklist = useMutation({
    mutationFn: async (checklistId: string) => {
      const { error } = await supabase.from("installation_checklists").update({
        completed_at: new Date().toISOString(),
        completed_by: user?.id || null,
      }).eq("id", checklistId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Sjekkliste fullført");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" />Ny sjekkliste
        </Button>
      </div>

      {!checklists?.length ? (
        <div className="text-center py-10 text-sm text-muted-foreground">Ingen sjekklister</div>
      ) : (
        checklists.map((cl: any) => {
          const allChecked = cl.items?.length > 0 && cl.items.every((i: any) => i.is_checked);
          return (
            <Card key={cl.id} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-medium text-sm">{cl.template_name}</p>
                <div className="flex items-center gap-2">
                  {cl.completed_at ? (
                    <Badge variant="secondary" className="text-[10px] gap-1">
                      <CheckCircle2 className="h-3 w-3" />Fullført {formatDate(cl.completed_at)}
                    </Badge>
                  ) : allChecked ? (
                    <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => completeChecklist.mutate(cl.id)}>
                      Marker fullført
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {cl.items?.filter((i: any) => i.is_checked).length}/{cl.items?.length} ferdig
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                {cl.items?.map((item: any) => (
                  <ChecklistItemRow
                    key={item.id}
                    item={item}
                    disabled={!!cl.completed_at}
                    onToggle={(checked) => toggleItem.mutate({ itemId: item.id, checked })}
                    onNoteBlur={(note) => updateNote.mutate({ itemId: item.id, note })}
                  />
                ))}
              </div>
            </Card>
          );
        })
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Ny sjekkliste</DialogTitle></DialogHeader>
          <div><Label>Navn</Label><Input value={templateName} onChange={e => setTemplateName(e.target.value)} /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Avbryt</Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !templateName}>
              {createMutation.isPending ? "Oppretter..." : "Opprett"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ChecklistItemRow({
  item,
  disabled,
  onToggle,
  onNoteBlur,
}: {
  item: any;
  disabled: boolean;
  onToggle: (checked: boolean) => void;
  onNoteBlur: (note: string) => void;
}) {
  const [note, setNote] = useState(item.note || "");

  return (
    <div className="flex items-start gap-2">
      <Checkbox
        checked={item.is_checked}
        disabled={disabled}
        onCheckedChange={(v) => onToggle(!!v)}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${item.is_checked ? "line-through text-muted-foreground" : ""}`}>{item.label}</p>
        {!disabled && (
          <Input
            value={note}
            onChange={e => setNote(e.target.value)}
            onBlur={() => { if (note !== (item.note || "")) onNoteBlur(note); }}
            placeholder="Legg til notat..."
            className="h-6 text-xs mt-1 border-dashed"
          />
        )}
        {disabled && item.note && <p className="text-xs text-muted-foreground">{item.note}</p>}
      </div>
    </div>
  );
}
