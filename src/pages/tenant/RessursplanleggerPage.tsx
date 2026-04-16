import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EventDrawer } from "@/components/resource/EventDrawer";
import { CreateEventDrawer } from "@/components/resource/CreateEventDrawer";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { UnplannedJobsStrip } from "@/components/resource/UnplannedJobsStrip";
import {
  ChevronLeft, ChevronRight, Plus, RotateCcw,
  Users, Briefcase, CalendarDays, Calendar, List, Phone, Clock,
} from "lucide-react";
import {
  addWeeks, addDays, addMonths, startOfWeek, endOfWeek, format, parseISO,
} from "date-fns";
import { nb } from "date-fns/locale";
import { useCanDo } from "@/hooks/useCanDo";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin, { Draggable } from "@fullcalendar/interaction";
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

  // Drawers
  const [detailEvent, setDetailEvent] = useState<CalendarEvent | null>(null);
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  // Prefill state for create drawer
  const [prefillDate, setPrefillDate] = useState<string>("");
  const [prefillStartTime, setPrefillStartTime] = useState<string>("");
  const [prefillEndTime, setPrefillEndTime] = useState<string>("");
  const [prefillJobId, setPrefillJobId] = useState<string | null>(null);
  const [prefillTitle, setPrefillTitle] = useState<string>("");
  const [prefillCustomer, setPrefillCustomer] = useState<string>("");
  const [prefillAddress, setPrefillAddress] = useState<string>("");

  useEffect(() => {
    localStorage.setItem("vpk_resource_view", calendarView);
  }, [calendarView]);

  useEffect(() => {
    const api = calendarRef.current?.getApi();
    if (api) {
      api.gotoDate(referenceDate);
      if (api.view.type !== calendarView) api.changeView(calendarView);
    }
  }, [referenceDate, calendarView]);

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

  const dateLabel = useMemo(() => {
    if (calendarView === "timeGridDay") return format(referenceDate, "EEEE d. MMMM yyyy", { locale: nb });
    if (calendarView === "dayGridMonth") return format(referenceDate, "MMMM yyyy", { locale: nb });
    const ws = startOfWeek(referenceDate, { weekStartsOn: 1 });
    const we = endOfWeek(referenceDate, { weekStartsOn: 1 });
    return `Uke ${format(ws, "w", { locale: nb })} — ${format(ws, "d. MMM", { locale: nb })} – ${format(we, "d. MMM yyyy", { locale: nb })}`;
  }, [referenceDate, calendarView]);

  // Open create drawer
  const openNewEvent = (day?: Date, startTime?: string, endTime?: string) => {
    setEditingEvent(null);
    setPrefillDate(format(day || new Date(), "yyyy-MM-dd"));
    setPrefillStartTime(startTime || "08:00");
    setPrefillEndTime(endTime || "16:00");
    setPrefillJobId(null);
    setPrefillTitle("");
    setPrefillCustomer("");
    setPrefillAddress("");
    setCreateDrawerOpen(true);
  };

  const openEditEvent = (event: CalendarEvent) => {
    setEditingEvent(event);
    setCreateDrawerOpen(true);
  };

  // Handle external drop from unplanned jobs strip
  const handleExternalDrop = useCallback(async (info: any) => {
    // FullCalendar external drop via eventReceive
    const dragData = info.event.extendedProps?.vpkJobData;
    if (!dragData || !tenantId) {
      info.revert?.();
      return;
    }

    const start = info.event.start;
    const end = info.event.end || new Date(start.getTime() + (dragData.estimated_hours || 2) * 3600000);

    try {
      const { data: newEvent, error } = await supabase.from("events").insert({
        tenant_id: tenantId,
        title: `${dragData.job_number} – ${dragData.title}`,
        customer: dragData.company_name || null,
        address: dragData.site_address || null,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        job_id: dragData.id,
        created_by: user?.id,
        status: "planned",
      } as any).select().single();

      if (error) throw error;

      // Log creation
      if (newEvent) {
        await supabase.from("event_logs").insert({
          event_id: newEvent.id, tenant_id: tenantId, actor_id: user?.id,
          action: "created",
          details: { title: `${dragData.job_number} – ${dragData.title}`, source: "drag_from_unplanned" },
        } as any);

        // Assign selected technician if any
        if (selectedTechId) {
          await supabase.from("event_technicians").insert({
            event_id: newEvent.id, technician_id: selectedTechId,
          });
        }
      }

      toast.success(`Jobb ${dragData.job_number} planlagt i kalenderen`);
      fetchEvents();
    } catch {
      toast.error("Kunne ikke opprette hendelse");
    }

    // Remove the temporary FC event (we reload from DB)
    info.event.remove();
  }, [tenantId, user?.id, selectedTechId, fetchEvents]);

  // Drag-drop handler with logging
  const handleEventDrop = useCallback(async (info: EventDropArg) => {
    const eventId = info.event.id;
    const newStart = info.event.start;
    const newEnd = info.event.end;
    const calEvent = info.event.extendedProps.calendarEvent as CalendarEvent;
    if (!newStart || !newEnd) { info.revert(); return; }
    const { error } = await supabase.from("events").update({
      start_time: newStart.toISOString(),
      end_time: newEnd.toISOString(),
    } as any).eq("id", eventId);
    if (error) {
      info.revert(); toast.error("Kunne ikke flytte hendelsen");
    } else {
      if (tenantId) {
        await supabase.from("event_logs").insert({
          event_id: eventId, tenant_id: tenantId, actor_id: user?.id,
          action: "moved",
          details: {
            old_time: `${format(parseISO(calEvent.start_time), "HH:mm")} – ${format(parseISO(calEvent.end_time), "HH:mm")}`,
            new_time: `${format(newStart, "HH:mm")} – ${format(newEnd, "HH:mm")}`,
          },
          old_values: { start_time: calEvent.start_time, end_time: calEvent.end_time },
          new_values: { start_time: newStart.toISOString(), end_time: newEnd.toISOString() },
        } as any);
      }
      toast.success("Hendelse flyttet");
      fetchEvents();
    }
  }, [fetchEvents, tenantId, user?.id]);

  // Resize handler with logging
  const handleEventResize = useCallback(async (info: any) => {
    const eventId = info.event.id;
    const newStart = info.event.start;
    const newEnd = info.event.end;
    const calEvent = info.event.extendedProps.calendarEvent as CalendarEvent;
    if (!newStart || !newEnd) { info.revert(); return; }
    const { error } = await supabase.from("events").update({
      start_time: newStart.toISOString(),
      end_time: newEnd.toISOString(),
    } as any).eq("id", eventId);
    if (error) {
      info.revert(); toast.error("Kunne ikke endre varighet");
    } else {
      if (tenantId) {
        await supabase.from("event_logs").insert({
          event_id: eventId, tenant_id: tenantId, actor_id: user?.id,
          action: "resized",
          details: {
            old_time: `${format(parseISO(calEvent.start_time), "HH:mm")} – ${format(parseISO(calEvent.end_time), "HH:mm")}`,
            new_time: `${format(newStart, "HH:mm")} – ${format(newEnd, "HH:mm")}`,
          },
          old_values: { start_time: calEvent.start_time, end_time: calEvent.end_time },
          new_values: { start_time: newStart.toISOString(), end_time: newEnd.toISOString() },
        } as any);
      }
      toast.success("Varighet oppdatert");
      fetchEvents();
    }
  }, [fetchEvents, tenantId, user?.id]);

  const handleEventClick = useCallback((info: EventClickArg) => {
    const calEvent = info.event.extendedProps.calendarEvent as CalendarEvent;
    if (calEvent) setDetailEvent(calEvent);
  }, []);

  const handleDateSelect = useCallback((info: DateSelectArg) => {
    if (!canDo("ressursplan.schedule")) return;
    openNewEvent(info.start, format(info.start, "HH:mm"), format(info.end, "HH:mm"));
  }, [canDo, selectedTechId]);

  const getTechNames = (techIds: string[]) =>
    techIds.map(id => technicians.find(t => t.id === id)?.name).filter(Boolean).join(", ");

  // Compute next event per technician for sidebar
  const techNextEvent = useMemo(() => {
    const now = new Date();
    const map = new Map<string, CalendarEvent>();
    for (const e of events) {
      const start = new Date(e.start_time);
      for (const tid of e.technician_ids) {
        const existing = map.get(tid);
        if (start >= now && (!existing || start < new Date(existing.start_time))) {
          map.set(tid, e);
        }
      }
    }
    return map;
  }, [events]);

  // Event content renderer
  const renderEventContent = useCallback((arg: EventContentArg) => {
    const calEvent = arg.event.extendedProps.calendarEvent as CalendarEvent;
    const durationMs = (arg.event.end && arg.event.start)
      ? arg.event.end.getTime() - arg.event.start.getTime() : 0;
    const isCompact = durationMs < 45 * 60 * 1000;
    const isMedium = durationMs < 90 * 60 * 1000;

    return (
      <div className="fc-event-content-inner px-2 py-1 overflow-hidden h-full flex flex-col">
        <div className="flex items-center gap-1.5">
          {calEvent?.job_id && <Briefcase className="h-3 w-3 shrink-0 opacity-80" />}
          {calEvent?.service_visit_id && <CalendarDays className="h-3 w-3 shrink-0 opacity-80" />}
          <span className="font-semibold text-xs truncate leading-tight">{arg.event.title}</span>
          {calEvent?.calendar_sync_status === "synced" && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 ml-auto" title="Synket til kalender" />
          )}
          {calEvent?.calendar_sync_status === "failed" && (
            <span className="w-2 h-2 rounded-full bg-red-400 shrink-0 ml-auto" title="Kalendersynk feilet" />
          )}
        </div>
        {!isCompact && arg.timeText && (
          <p className="text-[11px] opacity-80 mt-0.5">{arg.timeText}</p>
        )}
        {!isCompact && calEvent?.customer && (
          <p className="text-[11px] opacity-75 truncate mt-0.5">{calEvent.customer}</p>
        )}
        {!isMedium && calEvent?.technician_ids?.length > 0 && (
          <p className="text-[10px] opacity-65 truncate mt-auto pt-0.5">{getTechNames(calEvent.technician_ids)}</p>
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
          <Button onClick={() => openNewEvent()} className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" />Ny hendelse
          </Button>
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

      {/* Unplanned Jobs Strip */}
      <UnplannedJobsStrip
        onJobClick={(job) => {
          setEditingEvent(null);
          setPrefillDate(format(new Date(), "yyyy-MM-dd"));
          setPrefillStartTime("08:00");
          setPrefillEndTime("16:00");
          setPrefillJobId(job.id);
          setPrefillTitle(`${job.job_number} – ${job.title}`);
          setPrefillCustomer(job.company_name || "");
          setPrefillAddress(job.site_address || "");
          setCreateDrawerOpen(true);
        }}
      />

      <div className="flex gap-4">
        {/* Technician sidebar */}
        <Card className="w-64 shrink-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" /> Teknikere</CardTitle>
          </CardHeader>
          <CardContent className="p-2 space-y-0.5">
            <Button variant={selectedTechId === null ? "default" : "ghost"} size="sm" className="w-full justify-start mb-1" onClick={() => setSelectedTechId(null)}>
              <Users className="h-3.5 w-3.5 mr-2" />Alle
              <Badge variant="secondary" className="ml-auto text-[10px] px-1.5">{events.length}</Badge>
            </Button>
            {technicians.map((tech) => {
              const techEventCount = events.filter(e => e.technician_ids.includes(tech.id)).length;
              const isSelected = selectedTechId === tech.id;
              const nextEvt = techNextEvent.get(tech.id);
              return (
                <Button key={tech.id} variant={isSelected ? "default" : "ghost"} size="sm"
                  className="w-full justify-start gap-2 h-auto py-2.5"
                  onClick={() => setSelectedTechId(isSelected ? null : tech.id)}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                    style={{ backgroundColor: tech.color }}>
                    {tech.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-xs font-medium truncate">{tech.name}</p>
                    {tech.phone && (
                      <p className={cn("text-[10px] truncate", isSelected ? "text-primary-foreground/70" : "text-muted-foreground")}>
                        <Phone className="h-2.5 w-2.5 inline mr-0.5" />{tech.phone}
                      </p>
                    )}
                    {nextEvt && (
                      <p className={cn("text-[10px] truncate mt-0.5", isSelected ? "text-primary-foreground/60" : "text-muted-foreground/70")}>
                        <Clock className="h-2.5 w-2.5 inline mr-0.5" />
                        {format(parseISO(nextEvt.start_time), "EEE HH:mm", { locale: nb })}
                      </p>
                    )}
                  </div>
                  <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 shrink-0">
                    {techEventCount}
                  </Badge>
                </Button>
              );
            })}
            {technicians.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Ingen teknikere lagt til ennå</p>}
          </CardContent>
        </Card>

        {/* FullCalendar */}
        <div className="flex-1 overflow-hidden rounded-xl border border-border/40 bg-card shadow-sm">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
            initialView={calendarView}
            initialDate={referenceDate}
            locale="nb"
            firstDay={1}
            headerToolbar={false}
            height="auto"
            contentHeight={calendarView === "dayGridMonth" ? 620 : undefined}
            slotMinTime="06:00:00"
            slotMaxTime="20:00:00"
            slotDuration="00:15:00"
            snapDuration="00:15:00"
            slotLabelInterval="01:00:00"
            slotLabelFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
            eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
            allDaySlot={false}
            nowIndicator
            selectable={canDo("ressursplan.schedule")}
            editable={canDo("ressursplan.schedule")}
            droppable={canDo("ressursplan.schedule")}
            eventResizableFromStart
            selectMirror
            dayMaxEvents={3}
            events={fcEvents}
            eventContent={renderEventContent}
            eventClick={handleEventClick}
            eventDrop={handleEventDrop}
            eventResize={handleEventResize}
            eventReceive={handleExternalDrop}
            select={handleDateSelect}
            weekNumbers
            weekNumberFormat={{ week: "numeric" }}
            dropAccept=".vpk-draggable-job"
            drop={(info) => {
              // Parse job data from the dropped element
              const rawData = info.draggedEl.getAttribute("data-vpk-job");
              if (!rawData) return;
            }}
          />
        </div>
      </div>

      {/* Event Detail Drawer */}
      <EventDrawer
        open={!!detailEvent}
        onOpenChange={(o) => { if (!o) setDetailEvent(null); }}
        event={detailEvent}
        technicians={technicians}
        onEdit={(ev) => { openEditEvent(ev); setDetailEvent(null); }}
        onDeleted={fetchEvents}
        onRefresh={fetchEvents}
      />

      {/* Create/Edit Event Drawer */}
      <CreateEventDrawer
        open={createDrawerOpen}
        onOpenChange={setCreateDrawerOpen}
        technicians={technicians}
        editEvent={editingEvent}
        prefillDate={prefillDate}
        prefillStartTime={prefillStartTime}
        prefillEndTime={prefillEndTime}
        prefillJobId={prefillJobId}
        prefillTitle={prefillTitle}
        prefillCustomer={prefillCustomer}
        prefillAddress={prefillAddress}
        selectedTechId={selectedTechId}
        onSaved={fetchEvents}
      />
    </div>
  );
}
