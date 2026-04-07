import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { JOB_STATUS_LABELS, JOB_TYPE_LABELS } from "@/lib/domain-labels";
import { CASE_PRIORITY_LABELS } from "@/lib/case-labels";

interface JobEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: any;
}

export function JobEditDialog({ open, onOpenChange, job }: JobEditDialogProps) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title: "", status: "planned", job_type: "installation", priority: "normal",
    scheduled_start: "", scheduled_end: "", description: "", notes: "",
  });

  useEffect(() => {
    if (job) {
      setForm({
        title: job.title || "",
        status: job.status || "planned",
        job_type: job.job_type || "installation",
        priority: job.priority || "normal",
        scheduled_start: job.scheduled_start ? job.scheduled_start.slice(0, 16) : "",
        scheduled_end: job.scheduled_end ? job.scheduled_end.slice(0, 16) : "",
        description: job.description || "",
        notes: job.notes || "",
      });
    }
  }, [job, open]);

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("jobs").update({
        title: form.title,
        status: form.status as any,
        job_type: form.job_type as any,
        priority: form.priority as any,
        scheduled_start: form.scheduled_start || null,
        scheduled_end: form.scheduled_end || null,
        description: form.description || null,
        notes: form.notes || null,
      }).eq("id", job.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Jobb oppdatert");
      qc.invalidateQueries({ queryKey: ["job", job.id] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Rediger jobb {job?.job_number}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div><Label>Tittel *</Label><Input value={form.title} onChange={e => set("title", e.target.value)} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(JOB_STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.job_type} onValueChange={v => set("job_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(JOB_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prioritet</Label>
              <Select value={form.priority} onValueChange={v => set("priority", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CASE_PRIORITY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Planlagt start</Label><Input type="datetime-local" value={form.scheduled_start} onChange={e => set("scheduled_start", e.target.value)} /></div>
            <div><Label>Planlagt slutt</Label><Input type="datetime-local" value={form.scheduled_end} onChange={e => set("scheduled_end", e.target.value)} /></div>
          </div>
          <div><Label>Beskrivelse</Label><Textarea value={form.description} onChange={e => set("description", e.target.value)} rows={2} /></div>
          <div><Label>Notater</Label><Textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Avbryt</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.title}>
            {mutation.isPending ? "Lagrer..." : "Oppdater"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
