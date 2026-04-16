import { useState, useEffect, useCallback } from "react";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

type Technician = { id: string; name: string; color: string };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-fill from job */
  jobId?: string;
  jobTitle?: string;
  companyName?: string;
  siteAddress?: string;
  siteId?: string;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  /** Pre-fill from service visit */
  serviceVisitId?: string;
  visitDate?: string | null;
}

export function ScheduleEventDialog({ open, onOpenChange, jobId, jobTitle, companyName, siteAddress, siteId, scheduledStart, scheduledEnd, serviceVisitId, visitDate }: Props) {
  const { tenantId, user } = useAuth();
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [title, setTitle] = useState("");
  const [customer, setCustomer] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("16:00");
  const [techIds, setTechIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !tenantId) return;
    supabase.from("technicians").select("id, name, color").eq("tenant_id", tenantId).eq("is_active", true).order("name")
      .then(({ data }) => setTechnicians((data as Technician[]) || []));
  }, [open, tenantId]);

  useEffect(() => {
    if (!open) return;
    setTitle(jobTitle || (serviceVisitId ? "Servicebesøk" : ""));
    setCustomer(companyName || "");
    setAddress(siteAddress || "");
    setDescription("");
    setTechIds([]);
    if (scheduledStart) {
      try {
        const d = new Date(scheduledStart);
        setDate(format(d, "yyyy-MM-dd"));
        setStartTime(format(d, "HH:mm"));
      } catch { setDate(format(new Date(), "yyyy-MM-dd")); }
    } else if (visitDate) {
      setDate(visitDate);
    } else {
      setDate(format(new Date(), "yyyy-MM-dd"));
    }
    if (scheduledEnd) {
      try { setEndTime(format(new Date(scheduledEnd), "HH:mm")); } catch { setEndTime("16:00"); }
    } else { setEndTime("16:00"); }
  }, [open, jobTitle, companyName, siteAddress, scheduledStart, scheduledEnd, serviceVisitId, visitDate]);

  const save = async () => {
    if (!tenantId || !title.trim() || !date) return;
    setSaving(true);
    try {
      const st = new Date(`${date}T${startTime}:00`);
      const et = new Date(`${date}T${endTime}:00`);
      const payload: any = {
        tenant_id: tenantId, title: title.trim(), customer: customer || null,
        address: address || null, description: description || null,
        start_time: st.toISOString(), end_time: et.toISOString(),
        created_by: user?.id,
        job_id: jobId || null,
        service_visit_id: serviceVisitId || null,
        site_id: siteId || null,
      };
      const { data: newEvent } = await supabase.from("events").insert(payload).select("id").single();
      if (newEvent && techIds.length > 0) {
        await supabase.from("event_technicians").insert(
          techIds.map(tid => ({ event_id: newEvent.id, technician_id: tid }))
        );
      }
      // Sync to external calendar
      if (newEvent) {
        try {
          const { data } = await supabase.functions.invoke("calendar-sync", {
            body: { event_id: newEvent.id },
          });
          if (data?.ok) {
            toast.success("Hendelse opprettet og synket til kalender");
          } else {
            toast.success("Hendelse opprettet i Ressursplanlegger");
          }
        } catch {
          toast.success("Hendelse opprettet i Ressursplanlegger");
        }
      } else {
        toast.success("Hendelse opprettet i Ressursplanlegger");
      }
      onOpenChange(false);
    } catch { toast.error("Kunne ikke opprette hendelse"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Planlegg i Ressursplanlegger</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>Tittel *</Label><Input value={title} onChange={e => setTitle(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Kunde</Label><Input value={customer} onChange={e => setCustomer(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Adresse</Label><AddressAutocomplete value={address} onChange={setAddress} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label>Dato *</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Fra</Label><Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Til</Label><Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} /></div>
          </div>
          <div className="space-y-1.5"><Label>Beskrivelse</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} /></div>
          <div className="space-y-1.5">
            <Label>Teknikere</Label>
            <div className="flex flex-wrap gap-2">
              {technicians.map(t => (
                <Button key={t.id} type="button" size="sm"
                  variant={techIds.includes(t.id) ? "default" : "outline"}
                  className="gap-1.5"
                  onClick={() => setTechIds(prev => prev.includes(t.id) ? prev.filter(x => x !== t.id) : [...prev, t.id])}>
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />{t.name}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Avbryt</Button>
          <Button onClick={save} disabled={saving || !title.trim() || !date}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Opprett hendelse
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
