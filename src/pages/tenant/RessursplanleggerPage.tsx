import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  Loader2, Users, Briefcase, CalendarDays, ExternalLink, Eye, ClipboardList, Calendar, List,
} from "lucide-react";
import {
  addWeeks, addDays, addMonths, startOfWeek, endOfWeek, format, parseISO,
} from "date-fns";
import { nb } from "date-fns/locale";
import {
  JOB_STATUS_LABELS, JOB_STATUS_COLORS, JOB_TYPE_LABELS,
  VISIT_STATUS_LABELS,
} from "@/lib/domain-labels";
import { useCanDo } from "@/hooks/useCanDo";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import type { EventInput, EventDropArg, EventClickArg, DateSelectArg, EventContentArg } from "@fullcalendar/core";

type Technician = {
  id: string; tenant_id: string; name: string; phone: string | null;
  email: string | null; color: string; is_active: boolean;
};

type CalendarEvent = {
  id: string; tenant_id: string; title: string; customer: string | null;
  address: string | null; description: string | null; start_time: string;
  end_time: string; status: string; technician_ids: string[];
  job_id: string | null; service_visit_id: string | null; site_id: string | null;
  job?: any; service_visit?: any; site?: any;
};

type CalendarViewType = "timeGridDay" | "timeGridWeek" | "dayGridMonth" | "listWeek";

const VIEW_OPTIONS: { value: CalendarViewType; label: string; icon: typeof Calendar }[] = [
  { value: "timeGridDay", label: "Dag", icon: Calendar },
  { value: "timeGridWeek", label: "Uke", icon: CalendarDays },
  { value: "dayGridMonth", label: "Måned", icon: Calendar },
  { value: "listWeek", label: "Liste", icon: List },
];

export default function RessursplanleggerPage() {
  const { user, tenantId } = useAuth();
  const { canDo } = useCanDo();
  const calendarRef = useRef<FullCalendar>(null);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTechId, setSelectedTechId] = useState<string | null>(null);
  const [referenceDate, setReferenceDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState<CalendarViewType>(() => {
    try {
      const stored = localStorage.getItem("vpk_resource_view");
      if (stored && VIEW_OPTIONS.some(v => v.value === stored)) return stored as CalendarViewType;
    } catch {}
    return "timeGridWeek";
  });
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
  const [formJobId, setFormJobId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [availableJobs, setAvailableJobs] = useState<any[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);

  // Persist view
  useEffect(() => {
    localStorage.setItem("vpk_resource_view", calendarView);
  }, [calendarView]);

  // Sync FullCalendar with referenceDate and view
  useEffect(() => {
    const api = calendarRef.current?.getApi();
    if (api) {
      api.gotoDate(referenceDate);
      if (api.view.type !== calendarView) api.changeView(calendarView);
    }
  }, [referenceDate, calendarView]);

  // Calculate date range based on view
  const dateRange = useMemo(() => {
    if (calendarView === "timeGridDay") {
      return { start: referenceDate, end: addDays(referenceDate, 1) };
    }
    if (calendarView === "dayGridMonth") {
      const monthStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
      const monthEnd = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 7);
      return { start: addDays(monthStart, -7), end: monthEnd };
    }
    const ws = startOfWeek(referenceDate, { weekStartsOn: 1 });
    return { start: ws, end: addDays(endOfWeek(referenceDate, { weekStartsOn: 1 }), 1) };
  }, [referenceDate, calendarView]);

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
      .select("*, job:jobs(id, job_number, title, status, job_type, company_id, form_data), service_visit:service_visits(id, status, scheduled_date, agreement_id, report_data), site:customer_sites(id, name, address, city)")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .gte("start_time", dateRange.start.toISOString())
      .lte("end_time", dateRange.end.toISOString())
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
      setEvents(eventsData.map((e: any) => ({ ...e, technician_ids: assignmentMap.get(e.id) || [] })));
    }
    setLoading(false);
  }, [tenantId, dateRange.start.toISOString(), dateRange.end.toISOString()]);

  useEffect(() => { fetchTechnicians(); }, [fetchTechnicians]);
  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // Realtime
  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel("events-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => fetchEvents())
      .on("postgres_changes", { event: "*", schema: "public", table: "event_technicians" }, () => fetchEvents())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchEvents, tenantId]);

  const filteredEvents = useMemo(() => {
    if (!selectedTechId) return events;
    return events.filter((e) => e.technician_ids.includes(selectedTechId));
  }, [events, selectedTechId]);

  // FullCalendar event inputs
  const fcEvents: EventInput[] = useMemo(() => {
    return filteredEvents.map((e) => {
      const techColor = (() => {
        if (e.technician_ids.length === 0) return "hsl(var(--primary))";
        const tech = technicians.find((t) => t.id === e.technician_ids[0]);
        return tech?.color || "hsl(var(--primary))";
      })();
      return {
        id: e.id,
        title: e.title,
        start: e.start_time,
        end: e.end_time,
        backgroundColor: techColor,
        borderColor: techColor,
        textColor: "#FFFFFF",
        extendedProps: { calendarEvent: e },
        editable: canDo("ressursplan.schedule"),
      };
    });
  }, [filteredEvents, technicians, canDo]);

  // Navigation
  const goToPrev = useCallback(() => {
    setReferenceDate((d) => {
      if (calendarView === "timeGridDay") return addDays(d, -1);
      if (calendarView === "dayGridMonth") return addMonths(d, -1);
      return addWeeks(d, -1);
    });
  }, [calendarView]);

  const goToNext = useCallback(() => {
    setReferenceDate((d) => {
      if (calendarView === "timeGridDay") return addDays(d, 1);
      if (calendarView === "dayGridMonth") return addMonths(d, 1);
      return addWeeks(d, 1);
    });
  }, [calendarView]);

  // Date header label
  const dateLabel = useMemo(() => {
    if (calendarView === "timeGridDay") return format(referenceDate, "EEEE d. MMMM yyyy", { locale: nb });
    if (calendarView === "dayGridMonth") return format(referenceDate, "MMMM yyyy", { locale: nb });
    const ws = startOfWeek(referenceDate, { weekStartsOn: 1 });
    const we = endOfWeek(referenceDate, { weekStartsOn: 1 });
    return `Uke ${format(ws, "w", { locale: nb })} — ${format(ws, "d. MMM", { locale: nb })} – ${format(we, "d. MMM yyyy", { locale: nb })}`;
  }, [referenceDate, calendarView]);

  // Fetch jobs for linking
  const fetchAvailableJobs = useCallback(async () => {
    if (!tenantId) return;
    setJobsLoading(true);
    const { data } = await supabase
      .from("jobs")
      .select("id, job_number, title, status, company:crm_companies(name), site:customer_sites(address, city)")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .in("status", ["planned", "scheduled", "in_progress", "on_hold"])
      .order("created_at", { ascending: false })
      .limit(50);
    setAvailableJobs(data || []);
    setJobsLoading(false);
  }, [tenantId]);

  const handleJobSelect = (jobId: string) => {
    if (jobId === "__none__") { setFormJobId(null); return; }
    const job = availableJobs.find((j: any) => j.id === jobId);
    if (!job) return;
    setFormJobId(jobId);
    setFormTitle(`${job.job_number} – ${job.title}`);
    setFormCustomer(job.company?.name || "");
    setFormAddress(job.site ? [job.site.address, job.site.city].filter(Boolean).join(", ") : "");
  };

  const openNewEvent = (day?: Date, startTime?: string, endTime?: string) => {
    setEditEvent(null);
    setFormTitle(""); setFormCustomer(""); setFormAddress(""); setFormDescription("");
    setFormDate(format(day || new Date(), "yyyy-MM-dd"));
    setFormStartTime(startTime || "08:00");
    setFormEndTime(endTime || "16:00");
    setFormTechIds(selectedTechId ? [selectedTechId] : []);
    setFormJobId(null);
    fetchAvailableJobs();
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
    setFormJobId(event.job_id || null);
    fetchAvailableJobs();
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
          job_id: formJobId || null,
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
          created_by: user?.id, job_id: formJobId || null,
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

  // Drag-drop handler
  const handleEventDrop = useCallback(async (info: EventDropArg) => {
    const eventId = info.event.id;
    const newStart = info.event.start;
    const newEnd = info.event.end;
    if (!newStart || !newEnd) { info.revert(); return; }
    const { error } = await supabase.from("events").update({
      start_time: newStart.toISOString(),
      end_time: newEnd.toISOString(),
    } as any).eq("id", eventId);
    if (error) { info.revert(); toast.error("Kunne ikke flytte hendelsen"); }
    else { toast.success("Hendelse flyttet"); fetchEvents(); }
  }, [fetchEvents]);

  // Event resize handler
  const handleEventResize = useCallback(async (info: any) => {
    const eventId = info.event.id;
    const newStart = info.event.start;
    const newEnd = info.event.end;
    if (!newStart || !newEnd) { info.revert(); return; }
    const { error } = await supabase.from("events").update({
      start_time: newStart.toISOString(),
      end_time: newEnd.toISOString(),
    } as any).eq("id", eventId);
    if (error) { info.revert(); toast.error("Kunne ikke endre varighet"); }
    else { toast.success("Varighet oppdatert"); fetchEvents(); }
  }, [fetchEvents]);

  // Click on event
  const handleEventClick = useCallback((info: EventClickArg) => {
    const calEvent = info.event.extendedProps.calendarEvent as CalendarEvent;
    if (calEvent) setDetailEvent(calEvent);
  }, []);

  // Select time range to create event
  const handleDateSelect = useCallback((info: DateSelectArg) => {
    if (!canDo("ressursplan.schedule")) return;
    const start = info.start;
    const end = info.end;
    openNewEvent(start, format(start, "HH:mm"), format(end, "HH:mm"));
  }, [canDo, selectedTechId]);

  const toggleTechInForm = (techId: string) => {
    setFormTechIds((prev) =>
      prev.includes(techId) ? prev.filter((id) => id !== techId) : [...prev, techId]
    );
  };

  const getTechNames = (techIds: string[]) =>
    techIds.map(id => technicians.find(t => t.id === id)?.name).filter(Boolean).join(", ");

  // Custom event content renderer
  const renderEventContent = useCallback((arg: EventContentArg) => {
    const calEvent = arg.event.extendedProps.calendarEvent as CalendarEvent;
    const isCompact = (arg.event.end && arg.event.start)
      ? (arg.event.end.getTime() - arg.event.start.getTime()) < 45 * 60 * 1000
      : false;

    return (
      <div className="px-1.5 py-0.5 overflow-hidden h-full">
        <div className="flex items-center gap-1">
          {calEvent?.job_id && <Briefcase className="h-2.5 w-2.5 shrink-0 opacity-80" />}
          {calEvent?.service_visit_id && <CalendarDays className="h-2.5 w-2.5 shrink-0 opacity-80" />}
          <span className="font-medium text-xs truncate">{arg.event.title}</span>
        </div>
        {!isCompact && calEvent?.customer && (
          <p className="text-[10px] opacity-80 truncate">{calEvent.customer}</p>
        )}
        {!isCompact && arg.timeText && (
          <p className="text-[10px] opacity-70">{arg.timeText}</p>
        )}
        {!isCompact && calEvent?.technician_ids?.length > 0 && (
          <p className="text-[10px] opacity-70 truncate">{getTechNames(calEvent.technician_ids)}</p>
        )}
      </div>
    );
  }, [technicians]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ressursplanlegger</h1>
          <p className="text-muted-foreground mt-1">Planlegg og administrer jobber og teknikere</p>
        </div>
        {canDo("ressursplan.schedule") && (
          <Button onClick={() => openNewEvent()} className="gap-2"><Plus className="h-4 w-4" />Ny hendelse</Button>
        )}
      </div>

      {/* Navigation and view switcher */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPrev}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setReferenceDate(new Date())} className="gap-1.5"><RotateCcw className="h-3.5 w-3.5" />I dag</Button>
          <Button variant="outline" size="icon" onClick={goToNext}><ChevronRight className="h-4 w-4" /></Button>
          <span className="text-sm font-medium ml-2 capitalize">{dateLabel}</span>
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
          {VIEW_OPTIONS.map(opt => (
            <Button
              key={opt.value}
              variant={calendarView === opt.value ? "default" : "ghost"}
              size="sm"
              className="gap-1.5 h-7 text-xs"
              onClick={() => setCalendarView(opt.value)}
            >
              <opt.icon className="h-3 w-3" />
              {opt.label}
            </Button>
          ))}
        </div>
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
                <Badge variant="secondary" className="ml-auto text-[10px] px-1.5">
                  {events.filter(e => e.technician_ids.includes(tech.id)).length}
                </Badge>
              </Button>
            ))}
            {technicians.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Ingen teknikere lagt til ennå</p>}
          </CardContent>
        </Card>

        {/* FullCalendar */}
        <div className="flex-1 overflow-hidden rounded-xl border border-border/30 bg-card shadow-sm">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
            initialView={calendarView}
            initialDate={referenceDate}
            locale="nb"
            firstDay={1}
            headerToolbar={false}
            height="auto"
            contentHeight={calendarView === "dayGridMonth" ? 600 : undefined}
            slotMinTime="06:00:00"
            slotMaxTime="20:00:00"
            slotDuration="00:30:00"
            slotLabelInterval="01:00:00"
            slotLabelFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
            eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
            allDaySlot={false}
            nowIndicator
            selectable={canDo("ressursplan.schedule")}
            editable={canDo("ressursplan.schedule")}
            eventResizableFromStart
            selectMirror
            dayMaxEvents={3}
            events={fcEvents}
            eventContent={renderEventContent}
            eventClick={handleEventClick}
            eventDrop={handleEventDrop}
            eventResize={handleEventResize}
            select={handleDateSelect}
            weekNumbers
            weekNumberFormat={{ week: "numeric" }}
          />
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
              {detailEvent.site && (
                <div className="text-sm">
                  <p className="text-[11px] text-muted-foreground font-medium uppercase">Anleggsadresse</p>
                  <p>{detailEvent.site.name || detailEvent.site.address}, {detailEvent.site.city}</p>
                </div>
              )}

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

              <div className="flex gap-2 pt-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => { openEditEvent(detailEvent); setDetailEvent(null); }}>Rediger</Button>
                {detailEvent.service_visit_id && detailEvent.service_visit && (
                  detailEvent.service_visit.report_data?.schema_version === 1 ? (
                    <Link to={`/tenant/crm/agreements/${detailEvent.service_visit.agreement_id}`}>
                      <Button variant="outline" size="sm" className="gap-1.5"><Eye className="h-3 w-3" />Se skjema</Button>
                    </Link>
                  ) : detailEvent.service_visit.agreement_id ? (
                    <Link to={`/tenant/crm/agreements/${detailEvent.service_visit.agreement_id}`}>
                      <Button size="sm" className="gap-1.5"><ClipboardList className="h-3 w-3" />Fyll ut skjema</Button>
                    </Link>
                  ) : null
                )}
                {detailEvent.job_id && detailEvent.job && (
                  (detailEvent.job.job_type === "installation" || detailEvent.job.job_type === "service") && (
                    <Link to={`/tenant/crm/jobs/${detailEvent.job.id}`}>
                      <Button variant="outline" size="sm" className="gap-1.5">
                        <ClipboardList className="h-3 w-3" />
                        {detailEvent.job.form_data?.schema_version === 1 ? "Se skjema" : "Fyll ut skjema"}
                      </Button>
                    </Link>
                  )
                )}
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
              <Label>Koble til jobb</Label>
              <Select value={formJobId || "__none__"} onValueChange={handleJobSelect}>
                <SelectTrigger><SelectValue placeholder="Velg jobb..." /></SelectTrigger>
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
              {formJobId && <p className="text-[11px] text-muted-foreground">Kunde og adresse er fylt inn fra jobben.</p>}
            </div>
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
