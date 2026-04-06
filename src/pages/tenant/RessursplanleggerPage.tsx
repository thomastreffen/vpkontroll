import { useState, useEffect, useCallback, useMemo } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ChevronLeft, ChevronRight, Plus, CalendarDays, RotateCcw,
  User, Loader2, Clock, MapPin, Users,
} from "lucide-react";
import {
  addWeeks, addDays, startOfWeek, endOfWeek, format, isSameDay,
  eachDayOfInterval, differenceInMinutes, setHours, setMinutes,
  parseISO, isWithinInterval,
} from "date-fns";
import { nb } from "date-fns/locale";

type Technician = {
  id: string;
  tenant_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  color: string;
  is_active: boolean;
};

type CalendarEvent = {
  id: string;
  tenant_id: string;
  title: string;
  customer: string | null;
  address: string | null;
  description: string | null;
  start_time: string;
  end_time: string;
  status: string;
  technician_ids: string[];
};

const HOURS = Array.from({ length: 13 }, (_, i) => i + 7); // 07:00 - 19:00
const HOUR_HEIGHT = 60; // px per hour

export default function RessursplanleggerPage() {
  const { user, tenantId } = useAuth();
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTechId, setSelectedTechId] = useState<string | null>(null);
  const [referenceDate, setReferenceDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);

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
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd }).slice(0, 5); // Mon-Fri

  const fetchTechnicians = useCallback(async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from("technicians")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("name");
    setTechnicians((data as unknown as Technician[]) || []);
  }, [tenantId]);

  const fetchEvents = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    const { data: eventsData } = await supabase
      .from("events")
      .select("*")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .gte("start_time", weekStart.toISOString())
      .lte("end_time", addDays(weekEnd, 1).toISOString())
      .order("start_time");

    if (eventsData) {
      // Fetch technician assignments
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

  // Realtime
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
    setFormTitle("");
    setFormCustomer("");
    setFormAddress("");
    setFormDescription("");
    setFormDate(format(day || new Date(), "yyyy-MM-dd"));
    setFormStartTime("08:00");
    setFormEndTime("16:00");
    setFormTechIds([]);
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
          title: formTitle.trim(),
          customer: formCustomer || null,
          address: formAddress || null,
          description: formDescription || null,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
        } as any).eq("id", editEvent.id);

        // Update technician assignments
        await supabase.from("event_technicians").delete().eq("event_id", editEvent.id);
        if (formTechIds.length > 0) {
          await supabase.from("event_technicians").insert(
            formTechIds.map((techId) => ({ event_id: editEvent.id, technician_id: techId }))
          );
        }
        toast.success("Hendelse oppdatert");
      } else {
        const { data: newEvent } = await supabase.from("events").insert({
          tenant_id: tenantId,
          title: formTitle.trim(),
          customer: formCustomer || null,
          address: formAddress || null,
          description: formDescription || null,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
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
    } catch (err) {
      toast.error("Kunne ikke lagre hendelsen");
    } finally {
      setSaving(false);
    }
  };

  const toggleTechInForm = (techId: string) => {
    setFormTechIds((prev) =>
      prev.includes(techId) ? prev.filter((id) => id !== techId) : [...prev, techId]
    );
  };

  const getEventsForDay = (day: Date) => {
    return filteredEvents.filter((e) => {
      const start = parseISO(e.start_time);
      return isSameDay(start, day);
    });
  };

  const getEventPosition = (event: CalendarEvent) => {
    const start = parseISO(event.start_time);
    const end = parseISO(event.end_time);
    const dayStart = setMinutes(setHours(start, HOURS[0]), 0);
    const topMinutes = differenceInMinutes(start, dayStart);
    const heightMinutes = differenceInMinutes(end, start);
    return {
      top: (topMinutes / 60) * HOUR_HEIGHT,
      height: Math.max((heightMinutes / 60) * HOUR_HEIGHT, 20),
    };
  };

  const getTechColor = (techIds: string[]) => {
    if (techIds.length === 0) return "hsl(var(--primary))";
    const tech = technicians.find((t) => t.id === techIds[0]);
    return tech?.color || "hsl(var(--primary))";
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ressursplanlegger</h1>
          <p className="text-muted-foreground mt-1">Planlegg og administrer jobber og teknikere</p>
        </div>
        <Button onClick={() => openNewEvent()} className="gap-2">
          <Plus className="h-4 w-4" />
          Ny hendelse
        </Button>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => setReferenceDate((d) => addWeeks(d, -1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => setReferenceDate(new Date())} className="gap-1.5">
          <RotateCcw className="h-3.5 w-3.5" />
          I dag
        </Button>
        <Button variant="outline" size="icon" onClick={() => setReferenceDate((d) => addWeeks(d, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium ml-2">
          Uke {format(weekStart, "w", { locale: nb })} — {format(weekStart, "d. MMM", { locale: nb })} – {format(weekEnd, "d. MMM yyyy", { locale: nb })}
        </span>
      </div>

      <div className="flex gap-4">
        {/* Technician sidebar */}
        <Card className="w-56 shrink-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" /> Teknikere
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <Button
              variant={selectedTechId === null ? "default" : "ghost"}
              size="sm"
              className="w-full justify-start mb-1"
              onClick={() => setSelectedTechId(null)}
            >
              Alle
            </Button>
            {technicians.map((tech) => (
              <Button
                key={tech.id}
                variant={selectedTechId === tech.id ? "default" : "ghost"}
                size="sm"
                className="w-full justify-start gap-2 mb-0.5"
                onClick={() => setSelectedTechId(selectedTechId === tech.id ? null : tech.id)}
              >
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: tech.color }} />
                <span className="truncate">{tech.name}</span>
              </Button>
            ))}
            {technicians.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                Ingen teknikere lagt til ennå
              </p>
            )}
          </CardContent>
        </Card>

        {/* Calendar grid */}
        <div className="flex-1 overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Day headers */}
            <div className="grid grid-cols-5 gap-px bg-border rounded-t-lg overflow-hidden">
              {weekDays.map((day) => (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "bg-card px-3 py-2 text-center",
                    isSameDay(day, new Date()) && "bg-primary/5"
                  )}
                >
                  <p className="text-xs text-muted-foreground uppercase">
                    {format(day, "EEE", { locale: nb })}
                  </p>
                  <p className={cn(
                    "text-lg font-semibold",
                    isSameDay(day, new Date()) && "text-primary"
                  )}>
                    {format(day, "d")}
                  </p>
                </div>
              ))}
            </div>

            {/* Time grid */}
            <div className="grid grid-cols-5 gap-px bg-border">
              {weekDays.map((day) => (
                <div
                  key={day.toISOString()}
                  className="bg-card relative cursor-pointer"
                  style={{ height: HOURS.length * HOUR_HEIGHT }}
                  onClick={() => openNewEvent(day)}
                >
                  {/* Hour lines */}
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="absolute left-0 right-0 border-t border-border/30"
                      style={{ top: (hour - HOURS[0]) * HOUR_HEIGHT }}
                    >
                      {day === weekDays[0] && (
                        <span className="absolute -left-1 -top-2.5 text-[10px] text-muted-foreground w-8 text-right">
                          {String(hour).padStart(2, "0")}:00
                        </span>
                      )}
                    </div>
                  ))}

                  {/* Events */}
                  {getEventsForDay(day).map((event) => {
                    const { top, height } = getEventPosition(event);
                    const color = getTechColor(event.technician_ids);
                    return (
                      <div
                        key={event.id}
                        className="absolute left-1 right-1 rounded-md px-2 py-1 text-xs text-white overflow-hidden cursor-pointer hover:opacity-90 transition-opacity shadow-sm"
                        style={{
                          top,
                          height,
                          backgroundColor: color,
                          minHeight: 20,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditEvent(event);
                        }}
                      >
                        <p className="font-medium truncate">{event.title}</p>
                        {height > 30 && event.customer && (
                          <p className="truncate opacity-80">{event.customer}</p>
                        )}
                        {height > 45 && (
                          <p className="opacity-70">
                            {format(parseISO(event.start_time), "HH:mm")}–{format(parseISO(event.end_time), "HH:mm")}
                          </p>
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

      {/* Event Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editEvent ? "Rediger hendelse" : "Ny hendelse"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Tittel *</Label>
              <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="F.eks. Installasjon varmepumpe" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Kunde</Label>
                <Input value={formCustomer} onChange={(e) => setFormCustomer(e.target.value)} placeholder="Kundenavn" />
              </div>
              <div className="space-y-1.5">
                <Label>Adresse</Label>
                <Input value={formAddress} onChange={(e) => setFormAddress(e.target.value)} placeholder="Adresse" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Dato *</Label>
                <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Fra</Label>
                <Input type="time" value={formStartTime} onChange={(e) => setFormStartTime(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Til</Label>
                <Input type="time" value={formEndTime} onChange={(e) => setFormEndTime(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Beskrivelse</Label>
              <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} rows={3} placeholder="Tilleggsinfo..." />
            </div>
            <div className="space-y-1.5">
              <Label>Teknikere</Label>
              <div className="flex flex-wrap gap-2">
                {technicians.map((tech) => (
                  <Button
                    key={tech.id}
                    type="button"
                    variant={formTechIds.includes(tech.id) ? "default" : "outline"}
                    size="sm"
                    className="gap-1.5"
                    onClick={() => toggleTechInForm(tech.id)}
                  >
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tech.color }} />
                    {tech.name}
                  </Button>
                ))}
                {technicians.length === 0 && (
                  <p className="text-xs text-muted-foreground">Ingen teknikere tilgjengelig</p>
                )}
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
