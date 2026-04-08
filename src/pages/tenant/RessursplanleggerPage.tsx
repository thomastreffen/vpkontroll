import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ChevronLeft, ChevronRight, Plus, RotateCcw,
  Loader2, Users, Briefcase, CalendarDays, ExternalLink, X,
} from "lucide-react";
import {
  addWeeks, addDays, startOfWeek, endOfWeek, format, isSameDay,
  eachDayOfInterval, differenceInMinutes, setHours, setMinutes,
  parseISO,
} from "date-fns";
import { nb } from "date-fns/locale";
import {
  JOB_STATUS_LABELS, JOB_STATUS_COLORS, JOB_TYPE_LABELS,
  VISIT_STATUS_LABELS,
} from "@/lib/domain-labels";

type Technician = {
  id: string; tenant_id: string; name: string; phone: string | null;
  email: string | null; color: string; is_active: boolean;
};

type CalendarEvent = {
  id: string; tenant_id: string; title: string; customer: string | null;
  address: string | null; description: string | null; start_time: string;
  end_time: string; status: string; technician_ids: string[];
  job_id: string | null; service_visit_id: string | null; site_id: string | null;
  // Joined data
  job?: any; service_visit?: any; site?: any;
};

const HOURS = Array.from({ length: 13 }, (_, i) => i + 7);
const HOUR_HEIGHT = 60;

export default function RessursplanleggerPage() {
  const { user, tenantId } = useAuth();
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTechId, setSelectedTechId] = useState<string | null>(null);
  const [referenceDate, setReferenceDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);
  const [detailEvent, setDetailEvent] = useState<CalendarEvent | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formCustomer, setFormCustomer] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formStartTime, setFormStartTime] = useState("08:00");
  const [formEndTime, setFormEndTime] = useState("16:00");
  const [formTechIds, setFormTechIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const weekStart = startOfWeek(referenceDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(referenceDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd }).slice(0, 5);

  const fetchTechnicians = useCallback(async () => {
    if (!tenantId) return;
    const { data } = await supabase.from("technicians").select("*").eq("tenant_id", tenantId).eq("is_active", true).order("name");
    setTechnicians((data as unknown as Technician[]) || []);
  }, [tenantId]);

  const fetchEvents = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    const { data: eventsData } = await supabase
      .from("events")
      .select("*, job:jobs(id, job_number, title, status, job_type, company_id), service_visit:service_visits(id, status, scheduled_date, agreement_id), site:customer_sites(id, name, address, city)")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .gte("start_time", weekStart.toISOString())
      .lte("end_time", addDays(weekEnd, 1).toISOString())
      .order("start_time");

    if (eventsData) {
      const eventIds = eventsData.map((e: any) => e.id);
      const { data: assignments } = eventIds.length > 0
        ? await supabase.from("event_technicians").select("event_id, technician_id").in("event_id", eventIds)
        : { data: [] };

      const assignmentMap = new Map<string, string[]>();
      for (const a of (assignments || []) as any[]) {
        const list = assignmentMap.get(a.event_id) || [];
        list.push(a.technician_id);
        assignmentMap.set(a.event_id, list);
      }

      setEvents(eventsData.map((e: any) => ({
        ...e,
        technician_ids: assignmentMap.get(e.id) || [],
      })));
    }
    setLoading(false);
  }, [tenantId, weekStart.toISOString()]);

  useEffect(() => { fetchTechnicians(); }, [fetchTechnicians]);
  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel("events-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => fetchEvents())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchEvents, tenantId]);

  const filteredEvents = useMemo(() => {
    if (!selectedTechId) return events;
    return events.filter((e) => e.technician_ids.includes(selectedTechId));
  }, [events, selectedTechId]);

  const openNewEvent = (day?: Date) => {
    setEditEvent(null);
    setFormTitle(""); setFormCustomer(""); setFormAddress(""); setFormDescription("");
    setFormDate(format(day || new Date(), "yyyy-MM-dd"));
    setFormStartTime("08:00"); setFormEndTime("16:00"); setFormTechIds([]);
    setDialogOpen(true);
  };

  const openEditEvent = (event: CalendarEvent) => {
    setEditEvent(event);
    setFormTitle(event.title);
    setFormCustomer(event.customer || "");
    setFormAddress(event.address || "");
    setFormDescription(event.description || "");
    setFormDate(format(parseISO(event.start_time), "yyyy-MM-dd"));
    setFormStartTime(format(parseISO(event.start_time), "HH:mm"));
    setFormEndTime(format(parseISO(event.end_time), "HH:mm"));
    setFormTechIds(event.technician_ids);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!tenantId || !formTitle.trim() || !formDate) return;
    setSaving(true);
    try {
      const startTime = new Date(`${formDate}T${formStartTime}:00`);
      const endTime = new Date(`${formDate}T${formEndTime}:00`);

      if (editEvent) {
        await supabase.from("events").update({
          title: formTitle.trim(), customer: formCustomer || null,
          address: formAddress || null, description: formDescription || null,
          start_time: startTime.toISOString(), end_time: endTime.toISOString(),
        } as any).eq("id", editEvent.id);

        await supabase.from("event_technicians").delete().eq("event_id", editEvent.id);
        if (formTechIds.length > 0) {
          await supabase.from("event_technicians").insert(
            formTechIds.map((techId) => ({ event_id: editEvent.id, technician_id: techId }))
          );
        }
        toast.success("Hendelse oppdatert");
      } else {
        const { data: newEvent } = await supabase.from("events").insert({
          tenant_id: tenantId, title: formTitle.trim(), customer: formCustomer || null,
          address: formAddress || null, description: formDescription || null,
          start_time: startTime.toISOString(), end_time: endTime.toISOString(),
          created_by: user?.id,
        } as any).select("id").single();

        if (newEvent && formTechIds.length > 0) {
          await supabase.from("event_technicians").insert(
            formTechIds.map((techId) => ({ event_id: newEvent.id, technician_id: techId }))
          );
        }
        toast.success("Hendelse opprettet");
      }
      setDialogOpen(false);
      fetchEvents();
    } catch { toast.error("Kunne ikke lagre hendelsen"); }
    finally { setSaving(false); }
  };

  const toggleTechInForm = (techId: string) => {
    setFormTechIds((prev) =>
      prev.includes(techId) ? prev.filter((id) => id !== techId) : [...prev, techId]
    );
  };

  const getEventsForDay = (day: Date) =>
    filteredEvents.filter((e) => isSameDay(parseISO(e.start_time), day));

  const getEventPosition = (event: CalendarEvent) => {
    const start = parseISO(event.start_time);
    const end = parseISO(event.end_time);
    const dayStart = setMinutes(setHours(start, HOURS[0]), 0);
    const topMinutes = differenceInMinutes(start, dayStart);
    const heightMinutes = differenceInMinutes(end, start);
    return { top: (topMinutes / 60) * HOUR_HEIGHT, height: Math.max((heightMinutes / 60) * HOUR_HEIGHT, 20) };
  };

  const getTechColor = (techIds: string[]) => {
    if (techIds.length === 0) return "hsl(var(--primary))";
    const tech = technicians.find((t) => t.id === techIds[0]);
    return tech?.color || "hsl(var(--primary))";
  };

  const getTechNames = (techIds: string[]) =>
    techIds.map(id => technicians.find(t => t.id === id)?.name).filter(Boolean).join(", ");

  const getEventTypeIcon = (event: CalendarEvent) => {
    if (event.job_id) return <Briefcase className="h-2.5 w-2.5" />;
    if (event.service_visit_id) return <CalendarDays className="h-2.5 w-2.5" />;
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ressursplanlegger</h1>
          <p className="text-muted-foreground mt-1">Planlegg og administrer jobber og teknikere</p>
        </div>
        <Button onClick={() => openNewEvent()} className="gap-2"><Plus className="h-4 w-4" />Ny hendelse</Button>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => setReferenceDate((d) => addWeeks(d, -1))}><ChevronLeft className="h-4 w-4" /></Button>
        <Button variant="outline" size="sm" onClick={() => setReferenceDate(new Date())} className="gap-1.5"><RotateCcw className="h-3.5 w-3.5" />I dag</Button>
        <Button variant="outline" size="icon" onClick={() => setReferenceDate((d) => addWeeks(d, 1))}><ChevronRight className="h-4 w-4" /></Button>
        <span className="text-sm font-medium ml-2">
          Uke {format(weekStart, "w", { locale: nb })} — {format(weekStart, "d. MMM", { locale: nb })} – {format(weekEnd, "d. MMM yyyy", { locale: nb })}
        </span>
      </div>

      <div className="flex gap-4">
        {/* Technician sidebar */}
        <Card className="w-56 shrink-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" /> Teknikere</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <Button variant={selectedTechId === null ? "default" : "ghost"} size="sm" className="w-full justify-start mb-1" onClick={() => setSelectedTechId(null)}>Alle</Button>
            {technicians.map((tech) => (
              <Button key={tech.id} variant={selectedTechId === tech.id ? "default" : "ghost"} size="sm"
                className="w-full justify-start gap-2 mb-0.5"
                onClick={() => setSelectedTechId(selectedTechId === tech.id ? null : tech.id)}>
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: tech.color }} />
                <span className="truncate">{tech.name}</span>
              </Button>
            ))}
            {technicians.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Ingen teknikere lagt til ennå</p>}
          </CardContent>
        </Card>

        {/* Calendar grid */}
        <div className="flex-1 overflow-x-auto">
          <div className="min-w-[700px]">
            <div className="grid grid-cols-5 gap-px bg-border rounded-t-lg overflow-hidden">
              {weekDays.map((day) => (
                <div key={day.toISOString()} className={cn("bg-card px-3 py-2 text-center", isSameDay(day, new Date()) && "bg-primary/5")}>
                  <p className="text-xs text-muted-foreground uppercase">{format(day, "EEE", { locale: nb })}</p>
                  <p className={cn("text-lg font-semibold", isSameDay(day, new Date()) && "text-primary")}>{format(day, "d")}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-5 gap-px bg-border">
              {weekDays.map((day) => (
                <div key={day.toISOString()} className="bg-card relative cursor-pointer" style={{ height: HOURS.length * HOUR_HEIGHT }}
                  onClick={() => openNewEvent(day)}>
                  {HOURS.map((hour) => (
                    <div key={hour} className="absolute left-0 right-0 border-t border-border/30" style={{ top: (hour - HOURS[0]) * HOUR_HEIGHT }}>
                      {day === weekDays[0] && (
                        <span className="absolute -left-1 -top-2.5 text-[10px] text-muted-foreground w-8 text-right">{String(hour).padStart(2, "0")}:00</span>
                      )}
                    </div>
                  ))}

                  {getEventsForDay(day).map((event) => {
                    const { top, height } = getEventPosition(event);
                    const color = getTechColor(event.technician_ids);
                    return (
                      <div key={event.id}
                        className="absolute left-1 right-1 rounded-md px-2 py-1 text-xs text-white overflow-hidden cursor-pointer hover:opacity-90 transition-opacity shadow-sm"
                        style={{ top, height, backgroundColor: color, minHeight: 20 }}
                        onClick={(e) => { e.stopPropagation(); setDetailEvent(event); }}>
                        <div className="flex items-center gap-1">
                          {getEventTypeIcon(event)}
                          <p className="font-medium truncate">{event.title}</p>
                        </div>
                        {height > 30 && event.customer && <p className="truncate opacity-80">{event.customer}</p>}
                        {height > 45 && (
                          <p className="opacity-70">{format(parseISO(event.start_time), "HH:mm")}–{format(parseISO(event.end_time), "HH:mm")}</p>
                        )}
                        {height > 60 && event.technician_ids.length > 0 && (
                          <p className="opacity-70 truncate">{getTechNames(event.technician_ids)}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!detailEvent} onOpenChange={(o) => { if (!o) setDetailEvent(null); }}>
        <SheetContent className="w-[400px] sm:w-[440px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {detailEvent?.job_id && <Briefcase className="h-4 w-4 text-primary" />}
              {detailEvent?.service_visit_id && <CalendarDays className="h-4 w-4 text-primary" />}
              {detailEvent?.title}
            </SheetTitle>
          </SheetHeader>
          {detailEvent && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase">Tidspunkt</p>
                  <p>{format(parseISO(detailEvent.start_time), "d. MMM yyyy", { locale: nb })}</p>
                  <p>{format(parseISO(detailEvent.start_time), "HH:mm")} – {format(parseISO(detailEvent.end_time), "HH:mm")}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase">Status</p>
                  <Badge variant="outline">{detailEvent.status}</Badge>
                </div>
              </div>

              {detailEvent.customer && (
                <div className="text-sm">
                  <p className="text-[11px] text-muted-foreground font-medium uppercase">Kunde</p>
                  <p>{detailEvent.customer}</p>
                </div>
              )}

              {detailEvent.address && (
                <div className="text-sm">
                  <p className="text-[11px] text-muted-foreground font-medium uppercase">Adresse</p>
                  <p>{detailEvent.address}</p>
                </div>
              )}

              {/* Site context */}
              {detailEvent.site && (
                <div className="text-sm">
                  <p className="text-[11px] text-muted-foreground font-medium uppercase">Anleggsadresse</p>
                  <p>{detailEvent.site.name || detailEvent.site.address}, {detailEvent.site.city}</p>
                </div>
              )}

              {/* Job context */}
              {detailEvent.job && (
                <Card className="p-3">
                  <p className="text-[11px] text-muted-foreground font-medium uppercase mb-1">Koblet jobb</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{detailEvent.job.job_number} – {detailEvent.job.title}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="secondary" className={`text-[10px] ${JOB_STATUS_COLORS[detailEvent.job.status] || ""}`}>
                          {JOB_STATUS_LABELS[detailEvent.job.status] || detailEvent.job.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{JOB_TYPE_LABELS[detailEvent.job.job_type] || detailEvent.job.job_type}</span>
                      </div>
                    </div>
                    <Link to={`/tenant/crm/jobs/${detailEvent.job.id}`}>
                      <Button variant="ghost" size="icon"><ExternalLink className="h-4 w-4" /></Button>
                    </Link>
                  </div>
                </Card>
              )}

              {/* Service visit context */}
              {detailEvent.service_visit && (
                <Card className="p-3">
                  <p className="text-[11px] text-muted-foreground font-medium uppercase mb-1">Servicebesøk</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm">Planlagt: {detailEvent.service_visit.scheduled_date || "–"}</p>
                      <div className="flex gap-1.5 mt-1">
                        <Badge variant="outline" className="text-[10px]">{VISIT_STATUS_LABELS[detailEvent.service_visit.status] || detailEvent.service_visit.status}</Badge>
                        {detailEvent.service_visit.report_data?.schema_version === 1 ? (
                          <Badge variant="secondary" className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-600">
                            <CalendarDays className="h-2.5 w-2.5" />Skjema utfylt
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-200">Skjema mangler</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {detailEvent.service_visit.agreement_id && (
                        <Link to={`/tenant/crm/agreements/${detailEvent.service_visit.agreement_id}`}>
                          <Button variant="ghost" size="icon"><ExternalLink className="h-4 w-4" /></Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </Card>
              )}

              {/* Technicians */}
              {detailEvent.technician_ids.length > 0 && (
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase mb-1">Teknikere</p>
                  <div className="flex flex-wrap gap-2">
                    {detailEvent.technician_ids.map(id => {
                      const tech = technicians.find(t => t.id === id);
                      if (!tech) return null;
                      return (
                        <Badge key={id} variant="secondary" className="gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tech.color }} />
                          {tech.name}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}

              {detailEvent.description && (
                <div className="text-sm">
                  <p className="text-[11px] text-muted-foreground font-medium uppercase">Beskrivelse</p>
                  <p className="text-muted-foreground">{detailEvent.description}</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => { openEditEvent(detailEvent); setDetailEvent(null); }}>Rediger</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Event Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editEvent ? "Rediger hendelse" : "Ny hendelse"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Tittel *</Label>
              <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="F.eks. Installasjon varmepumpe" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Kunde</Label><Input value={formCustomer} onChange={(e) => setFormCustomer(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Adresse</Label><Input value={formAddress} onChange={(e) => setFormAddress(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label>Dato *</Label><Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Fra</Label><Input type="time" value={formStartTime} onChange={(e) => setFormStartTime(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Til</Label><Input type="time" value={formEndTime} onChange={(e) => setFormEndTime(e.target.value)} /></div>
            </div>
            <div className="space-y-1.5"><Label>Beskrivelse</Label><Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} rows={3} /></div>
            <div className="space-y-1.5">
              <Label>Teknikere</Label>
              <div className="flex flex-wrap gap-2">
                {technicians.map((tech) => (
                  <Button key={tech.id} type="button" variant={formTechIds.includes(tech.id) ? "default" : "outline"} size="sm" className="gap-1.5"
                    onClick={() => toggleTechInForm(tech.id)}>
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tech.color }} />{tech.name}
                  </Button>
                ))}
                {technicians.length === 0 && <p className="text-xs text-muted-foreground">Ingen teknikere tilgjengelig</p>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Avbryt</Button>
            <Button onClick={handleSave} disabled={saving || !formTitle.trim() || !formDate}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editEvent ? "Lagre" : "Opprett"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
