import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Loader2, Briefcase, Clock, MapPin, User, Users, Calendar, Save, X,
} from "lucide-react";

type Technician = {
  id: string; name: string; phone: string | null;
  email: string | null; color: string; is_active: boolean;
};

/* ── Time slot helpers ── */
const TIME_SLOTS: string[] = [];
for (let h = 6; h <= 20; h++) {
  for (let m = 0; m < 60; m += 15) {
    if (h === 20 && m > 0) break;
    TIME_SLOTS.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
}

const DURATION_OPTIONS = [
  { value: "30", label: "30 min" },
  { value: "60", label: "1 time" },
  { value: "120", label: "2 timer" },
  { value: "180", label: "3 timer" },
  { value: "240", label: "4 timer" },
  { value: "360", label: "6 timer" },
  { value: "480", label: "Hel dag (8t)" },
];

function snapToSlot(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const snapped = Math.round(m / 15) * 15;
  const finalH = snapped >= 60 ? h + 1 : h;
  const finalM = snapped >= 60 ? 0 : snapped;
  return `${String(finalH).padStart(2, "0")}:${String(finalM).padStart(2, "0")}`;
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const finalH = Math.min(Math.floor(total / 60), 20);
  const finalM = total % 60;
  return `${String(finalH).padStart(2, "0")}:${String(finalM).padStart(2, "0")}`;
}

function diffMinutes(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

interface CalendarEvent {
  id: string; tenant_id: string; title: string; customer: string | null;
  address: string | null; description: string | null; start_time: string;
  end_time: string; status: string; technician_ids: string[];
  job_id: string | null; service_visit_id: string | null; site_id: string | null;
  job?: any; service_visit?: any; site?: any;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  technicians: Technician[];
  editEvent?: CalendarEvent | null;
  prefillDate?: string;
  prefillStartTime?: string;
  prefillEndTime?: string;
  prefillJobId?: string | null;
  prefillTitle?: string;
  prefillCustomer?: string;
  prefillAddress?: string;
  selectedTechId?: string | null;
  onSaved: () => void;
}

export function CreateEventDrawer({
  open, onOpenChange, technicians, editEvent,
  prefillDate, prefillStartTime, prefillEndTime,
  prefillJobId, prefillTitle, prefillCustomer, prefillAddress,
  selectedTechId, onSaved,
}: Props) {
  const { tenantId, user } = useAuth();
  const [title, setTitle] = useState("");
  const [customer, setCustomer] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [duration, setDuration] = useState("120");
  const [techIds, setTechIds] = useState<string[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [jobLinked, setJobLinked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [availableJobs, setAvailableJobs] = useState<any[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);

  const endTime = addMinutes(startTime, parseInt(duration));
  const isEditing = !!editEvent;

  // Reset form when opened
  useEffect(() => {
    if (!open) return;
    if (editEvent) {
      setTitle(editEvent.title);
      setCustomer(editEvent.customer || "");
      setAddress(editEvent.address || "");
      setDescription(editEvent.description || "");
      const start = new Date(editEvent.start_time);
      const end = new Date(editEvent.end_time);
      setDate(format(start, "yyyy-MM-dd"));
      setStartTime(snapToSlot(format(start, "HH:mm")));
      const diff = Math.round((end.getTime() - start.getTime()) / 60000);
      setDuration(String(diff));
      setTechIds(editEvent.technician_ids);
      setJobId(editEvent.job_id);
    } else {
      setTitle(prefillTitle || "");
      setCustomer(prefillCustomer || "");
      setAddress(prefillAddress || "");
      setDescription("");
      setDate(prefillDate || format(new Date(), "yyyy-MM-dd"));
      setStartTime(snapToSlot(prefillStartTime || "08:00"));
      if (prefillStartTime && prefillEndTime) {
        const diff = diffMinutes(snapToSlot(prefillStartTime), snapToSlot(prefillEndTime));
        setDuration(String(diff > 0 ? diff : 120));
      } else {
        setDuration("120");
      }
      setTechIds(selectedTechId ? [selectedTechId] : []);
      setJobId(prefillJobId || null);
      setSiteId(null);
      setJobLinked(!!prefillJobId);
    }
    fetchJobs();
  }, [open, editEvent?.id]);

  const fetchJobs = async () => {
    if (!tenantId) return;
    setJobsLoading(true);
    const { data } = await supabase
      .from("jobs")
      .select("id, job_number, title, status, site_id, company:crm_companies(name), site:customer_sites(address, city, name)")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .in("status", ["planned", "scheduled", "in_progress", "on_hold"])
      .order("created_at", { ascending: false })
      .limit(50);
    setAvailableJobs(data || []);
    setJobsLoading(false);
  };

  const handleJobSelect = async (value: string) => {
    if (value === "__none__") {
      setJobId(null);
      setSiteId(null);
      setJobLinked(false);
      setTitle("");
      setCustomer("");
      setAddress("");
      return;
    }
    const job = availableJobs.find((j: any) => j.id === value);
    if (!job) return;
    setJobId(value);
    setSiteId(job.site_id || null);
    setJobLinked(true);
    setTitle(`${job.job_number} – ${job.title}`);
    setCustomer(job.company?.name || "");
    const siteAddr = job.site ? [job.site.address, job.site.city].filter(Boolean).join(", ") : "";
    setAddress(siteAddr);

    // Auto-fill technicians from job
    const { data: jt } = await supabase
      .from("job_technicians")
      .select("technician_id")
      .eq("job_id", value);
    if (jt && jt.length > 0) {
      const ids = jt.map(r => r.technician_id);
      setTechIds(prev => [...new Set([...prev, ...ids])]);
    }
  };

  const toggleTech = (id: string) => {
    setTechIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const syncToCalendar = async (eventId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("calendar-sync", {
        body: { event_id: eventId },
      });
      if (data?.ok) {
        const parts: string[] = [];
        if (data.calendar === "synced") parts.push("kalendersynk");
        if (data.notification?.sent > 0) parts.push(`varsel til ${data.notification.sent} tekniker(e)`);
        if (parts.length > 0) {
          toast.success("Synk & varsling fullført", { description: parts.join(" + ") });
        }
      } else if (data?.reason === "no_integration") {
        // Silently skip
      } else if (error) {
        console.warn("Calendar sync failed:", error);
      }
    } catch (e) {
      console.warn("Calendar sync error:", e);
    }
  };

  const handleSave = async () => {
    if (!tenantId || !title.trim() || !date) return;
    setSaving(true);
    try {
      const st = new Date(`${date}T${startTime}:00`);
      const et = new Date(`${date}T${endTime}:00`);

      if (isEditing && editEvent) {
        await supabase.from("events").update({
          title: title.trim(), customer: customer || null,
          address: address || null, description: description || null,
          start_time: st.toISOString(), end_time: et.toISOString(),
          job_id: jobId || null, site_id: siteId || null,
        } as any).eq("id", editEvent.id);

        await supabase.from("event_technicians").delete().eq("event_id", editEvent.id);
        if (techIds.length > 0) {
          await supabase.from("event_technicians").insert(
            techIds.map(tid => ({ event_id: editEvent.id, technician_id: tid }))
          );
        }
        await supabase.from("event_logs").insert({
          event_id: editEvent.id, tenant_id: tenantId, actor_id: user?.id,
          action: "updated",
          details: { title: title.trim() },
          old_values: {
            start_time: editEvent.start_time,
            end_time: editEvent.end_time,
          },
          new_values: {
            start_time: st.toISOString(),
            end_time: et.toISOString(),
          },
        } as any);
        toast.success("Hendelse oppdatert");
        // Sync to external calendar
        syncToCalendar(editEvent.id);
      } else {
        const { data: newEvent } = await supabase.from("events").insert({
          tenant_id: tenantId, title: title.trim(), customer: customer || null,
          address: address || null, description: description || null,
          start_time: st.toISOString(), end_time: et.toISOString(),
          created_by: user?.id, job_id: jobId || null, site_id: siteId || null,
        } as any).select("id").single();

        if (newEvent && techIds.length > 0) {
          await supabase.from("event_technicians").insert(
            techIds.map(tid => ({ event_id: newEvent.id, technician_id: tid }))
          );
        }
        if (newEvent) {
          await supabase.from("event_logs").insert({
            event_id: newEvent.id, tenant_id: tenantId, actor_id: user?.id,
            action: "created", details: { title: title.trim() },
          } as any);
          // Sync to external calendar
          syncToCalendar(newEvent.id);
        }
        toast.success("Hendelse opprettet");
      }
      onOpenChange(false);
      onSaved();
    } catch {
      toast.error("Kunne ikke lagre hendelsen");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[520px] flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <SheetHeader className="space-y-1">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-primary" />
              {isEditing ? "Rediger hendelse" : "Ny hendelse"}
            </SheetTitle>
            <SheetDescription className="text-xs">
              {isEditing ? "Oppdater detaljer for denne hendelsen" : "Planlegg en ny hendelse i ressursplanen"}
            </SheetDescription>
          </SheetHeader>
        </div>

        <Separator />

        {/* Form */}
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-5">

            {/* Link job */}
            <section>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Koble til jobb</Label>
              <Select value={jobId || "__none__"} onValueChange={handleJobSelect}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Velg jobb..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Ingen jobb (frittstående)</SelectItem>
                  {jobsLoading ? (
                    <SelectItem value="__loading__" disabled>Laster...</SelectItem>
                  ) : (
                    availableJobs.map((j: any) => (
                      <SelectItem key={j.id} value={j.id}>
                        {j.job_number} – {j.title} {j.company?.name ? `(${j.company.name})` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {jobLinked && jobId && (
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-primary/80 bg-primary/5 rounded-md px-2.5 py-1.5 border border-primary/10">
                  <Briefcase className="h-3 w-3 shrink-0" />
                  <span>Kunde, adresse og teknikere er hentet automatisk fra jobben</span>
                </div>
              )}
            </section>

            {/* Title */}
            <section>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tittel *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)}
                placeholder="F.eks. Installasjon varmepumpe" className="mt-1.5" />
            </section>

            {/* Customer & Address */}
            <div className="grid grid-cols-2 gap-4">
              <section>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <User className="h-3 w-3 inline mr-1" />Kunde
                  {jobLinked && <Badge variant="outline" className="ml-1.5 text-[9px] px-1 py-0 h-4 font-normal">Fra jobb</Badge>}
                </Label>
                <Input value={customer} onChange={e => { setCustomer(e.target.value); }}
                  className={cn("mt-1.5", jobLinked && customer && "border-primary/20 bg-primary/5")} />
              </section>
              <section>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <MapPin className="h-3 w-3 inline mr-1" />Adresse
                  {jobLinked && <Badge variant="outline" className="ml-1.5 text-[9px] px-1 py-0 h-4 font-normal">Fra jobb</Badge>}
                </Label>
                <Input value={address} onChange={e => { setAddress(e.target.value); }}
                  className={cn("mt-1.5", jobLinked && address && "border-primary/20 bg-primary/5")} />
              </section>
            </div>

            {/* Date & Time – simplified */}
            <section>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
                <Clock className="h-3 w-3 inline mr-1" />Tidspunkt
              </Label>
              <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Dato</Label>
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Starttid</Label>
                    <Select value={startTime} onValueChange={setStartTime}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-[240px]">
                        {TIME_SLOTS.map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Varighet</Label>
                    <Select value={duration} onValueChange={setDuration}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DURATION_OPTIONS.map(d => (
                          <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-background rounded-md px-3 py-2">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  <span className="font-medium">{startTime} – {endTime}</span>
                  <span className="text-xs">({parseInt(duration) >= 60 ? `${Math.floor(parseInt(duration) / 60)}t${parseInt(duration) % 60 > 0 ? ` ${parseInt(duration) % 60}m` : ""}` : `${duration} min`})</span>
                </div>
              </div>
            </section>

            {/* Technicians */}
            <section>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
                <Users className="h-3 w-3 inline mr-1" />Teknikere
              </Label>
              <div className="space-y-1.5">
                {technicians.map(tech => {
                  const selected = techIds.includes(tech.id);
                  return (
                    <button
                      key={tech.id}
                      type="button"
                      onClick={() => toggleTech(tech.id)}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-lg border p-3 transition-all text-left",
                        selected
                          ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                          : "border-border/40 bg-card hover:border-border"
                      )}
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ backgroundColor: tech.color }}>
                        {tech.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{tech.name}</p>
                        {tech.phone && <p className="text-[11px] text-muted-foreground">{tech.phone}</p>}
                      </div>
                      {selected && (
                        <Badge variant="default" className="text-[10px] shrink-0">Valgt</Badge>
                      )}
                    </button>
                  );
                })}
                {technicians.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-3">Ingen teknikere tilgjengelig</p>
                )}
              </div>
            </section>

            {/* Description */}
            <section>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Beskrivelse</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)}
                rows={3} placeholder="Legg til detaljer om oppdraget..." className="mt-1.5" />
            </section>
          </div>
        </ScrollArea>

        <Separator />

        {/* Footer */}
        <div className="px-6 py-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="gap-1.5">
            <X className="h-3.5 w-3.5" />Avbryt
          </Button>
          <Button onClick={handleSave} disabled={saving || !title.trim() || !date} className="gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEditing ? "Lagre endringer" : "Opprett hendelse"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
