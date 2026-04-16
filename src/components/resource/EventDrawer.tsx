import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCanDo } from "@/hooks/useCanDo";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { nb } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  Briefcase, CalendarDays, Clock, MapPin, User, Users,
  ExternalLink, MessageSquare, History, Loader2, Send,
  Trash2, Edit3, ClipboardList, Eye, Phone, Mail,
  CheckCircle2, PlayCircle, PauseCircle, XCircle,
  FileText, Building2, Wrench, RefreshCw, CalendarCheck, CalendarX2,
} from "lucide-react";
import {
  JOB_STATUS_LABELS, JOB_STATUS_COLORS, JOB_TYPE_LABELS,
  VISIT_STATUS_LABELS,
} from "@/lib/domain-labels";

/* ── Types ── */
type Technician = {
  id: string; name: string; phone: string | null;
  email: string | null; color: string; is_active: boolean;
};

type CalendarEvent = {
  id: string; tenant_id: string; title: string; customer: string | null;
  address: string | null; description: string | null; start_time: string;
  end_time: string; status: string; technician_ids: string[];
  job_id: string | null; service_visit_id: string | null; site_id: string | null;
  job?: any; service_visit?: any; site?: any;
  calendar_sync_status?: string; external_calendar_event_id?: string | null;
  calendar_sync_error?: string | null;
  notification_status?: string; notified_at?: string | null;
};

type EventNote = {
  id: string; event_id: string; author_id: string | null;
  body: string; note_type: string; created_at: string;
  author_name?: string;
};

type EventLog = {
  id: string; event_id: string; actor_id: string | null;
  action: string; details: any; old_values: any; new_values: any;
  created_at: string; actor_name?: string;
};

type DrawerTab = "details" | "messages" | "history";

interface EventDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: CalendarEvent | null;
  technicians: Technician[];
  onEdit: (event: CalendarEvent) => void;
  onDeleted: () => void;
  onRefresh: () => void;
}

const ACTION_LABELS: Record<string, string> = {
  created: "Opprettet",
  updated: "Oppdatert",
  moved: "Flyttet",
  resized: "Varighet endret",
  technician_added: "Tekniker lagt til",
  technician_removed: "Tekniker fjernet",
  status_changed: "Status endret",
  notification_sent: "Varsel sendt",
  deleted: "Slettet",
};

const EVENT_STATUS_OPTIONS = [
  { value: "planned", label: "Planlagt", icon: CalendarDays, color: "text-blue-600" },
  { value: "confirmed", label: "Bekreftet", icon: CheckCircle2, color: "text-emerald-600" },
  { value: "in_progress", label: "Pågår", icon: PlayCircle, color: "text-amber-600" },
  { value: "completed", label: "Fullført", icon: CheckCircle2, color: "text-emerald-700" },
  { value: "cancelled", label: "Avlyst", icon: XCircle, color: "text-destructive" },
];

export function EventDrawer({ open, onOpenChange, event, technicians, onEdit, onDeleted, onRefresh }: EventDrawerProps) {
  const { user, tenantId } = useAuth();
  const { canDo } = useCanDo();
  const [tab, setTab] = useState<DrawerTab>("details");
  const [notes, setNotes] = useState<EventNote[]>([]);
  const [logs, setLogs] = useState<EventLog[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);

  useEffect(() => {
    if (open) setTab("details");
  }, [open, event?.id]);

  const fetchNotes = useCallback(async () => {
    if (!event) return;
    setNotesLoading(true);
    const { data: notesData } = await supabase
      .from("event_notes").select("*").eq("event_id", event.id)
      .order("created_at", { ascending: true });

    if (notesData && notesData.length > 0) {
      const authorIds = [...new Set(notesData.map(n => n.author_id).filter(Boolean))];
      let profileMap = new Map<string, string>();
      if (authorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles").select("user_id, full_name")
          .in("user_id", authorIds as string[]);
        for (const p of (profiles || [])) profileMap.set(p.user_id, p.full_name || p.user_id);
      }
      setNotes(notesData.map(n => ({
        ...n,
        author_name: n.author_id ? profileMap.get(n.author_id) || "Ukjent" : "System",
      })));
    } else {
      setNotes([]);
    }
    setNotesLoading(false);
  }, [event?.id]);

  const fetchLogs = useCallback(async () => {
    if (!event) return;
    setLogsLoading(true);
    const { data: logsData } = await supabase
      .from("event_logs").select("*").eq("event_id", event.id)
      .order("created_at", { ascending: false });

    if (logsData && logsData.length > 0) {
      const actorIds = [...new Set(logsData.map(l => l.actor_id).filter(Boolean))];
      let profileMap = new Map<string, string>();
      if (actorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles").select("user_id, full_name")
          .in("user_id", actorIds as string[]);
        for (const p of (profiles || [])) profileMap.set(p.user_id, p.full_name || p.user_id);
      }
      setLogs(logsData.map(l => ({
        ...l,
        actor_name: l.actor_id ? profileMap.get(l.actor_id) || "Ukjent" : "System",
      })));
    } else {
      setLogs([]);
    }
    setLogsLoading(false);
  }, [event?.id]);

  useEffect(() => {
    if (open && event && tab === "messages") fetchNotes();
  }, [open, event?.id, tab, fetchNotes]);

  useEffect(() => {
    if (open && event && tab === "history") fetchLogs();
  }, [open, event?.id, tab, fetchLogs]);

  const handleSendMessage = async () => {
    if (!event || !tenantId || !newMessage.trim()) return;
    setSending(true);
    try {
      await supabase.from("event_notes").insert({
        event_id: event.id, tenant_id: tenantId,
        author_id: user?.id, body: newMessage.trim(),
        note_type: "message",
      } as any);
      setNewMessage("");
      fetchNotes();
    } catch {
      toast.error("Kunne ikke sende melding");
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!event || !tenantId) return;
    setChangingStatus(true);
    const oldStatus = event.status;
    try {
      await supabase.from("events").update({ status: newStatus } as any).eq("id", event.id);
      await supabase.from("event_logs").insert({
        event_id: event.id, tenant_id: tenantId, actor_id: user?.id,
        action: "status_changed",
        details: { old_status: oldStatus, new_status: newStatus },
      } as any);
      toast.success("Status oppdatert");
      onRefresh();
    } catch {
      toast.error("Kunne ikke endre status");
    } finally {
      setChangingStatus(false);
    }
  };

  const handleDelete = async () => {
    if (!event) return;
    setDeleting(true);
    try {
      // Remove from external calendar if synced
      if (event.external_calendar_event_id) {
        try {
          await supabase.functions.invoke("calendar-sync", {
            body: { event_id: event.id, action: "delete" },
          });
        } catch (e) { console.warn("Failed to remove external calendar event:", e); }
      }
      await supabase.from("event_technicians").delete().eq("event_id", event.id);
      await supabase.from("events").update({
        deleted_at: new Date().toISOString(), status: "cancelled",
      } as any).eq("id", event.id);
      if (tenantId) {
        await supabase.from("event_logs").insert({
          event_id: event.id, tenant_id: tenantId, actor_id: user?.id,
          action: "deleted", details: { title: event.title },
        } as any);
      }
      toast.success("Hendelse fjernet");
      onOpenChange(false);
      onDeleted();
    } catch {
      toast.error("Kunne ikke slette hendelsen");
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (!event) return null;

  const eventTechs = event.technician_ids
    .map(id => technicians.find(t => t.id === id))
    .filter(Boolean) as Technician[];

  const durationMinutes = Math.round((new Date(event.end_time).getTime() - new Date(event.start_time).getTime()) / 60000);
  const durationLabel = durationMinutes >= 60
    ? `${Math.floor(durationMinutes / 60)}t ${durationMinutes % 60 > 0 ? `${durationMinutes % 60}m` : ""}`
    : `${durationMinutes}m`;

  const currentStatusOption = EVENT_STATUS_OPTIONS.find(s => s.value === event.status);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-[500px] flex flex-col p-0 gap-0">
          {/* Header */}
          <div className="px-6 pt-6 pb-3 space-y-3">
            <SheetHeader className="space-y-1">
              <SheetTitle className="flex items-center gap-2 text-base pr-8">
                {event.job_id && <Briefcase className="h-4 w-4 text-primary shrink-0" />}
                {event.service_visit_id && !event.job_id && <CalendarDays className="h-4 w-4 text-primary shrink-0" />}
                <span className="truncate">{event.title}</span>
              </SheetTitle>
              <SheetDescription className="text-xs flex items-center gap-2 flex-wrap">
                {event.job?.job_number && (
                  <span className="font-mono text-[10px] bg-primary/10 text-primary rounded px-1.5 py-0.5">
                    {event.job.job_number}
                  </span>
                )}
                <span className="text-muted-foreground">{durationLabel}</span>
              </SheetDescription>
            </SheetHeader>

            {/* Status changer */}
            {canDo("ressursplan.schedule") && (
              <Select value={event.status} onValueChange={handleStatusChange} disabled={changingStatus}>
                <SelectTrigger className="h-8 text-xs w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_STATUS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center gap-2">
                        <opt.icon className={cn("h-3.5 w-3.5", opt.color)} />
                        {opt.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Tab switcher */}
            <div className="flex items-center gap-1 border border-border/40 rounded-lg p-0.5">
              {([
                { key: "details" as DrawerTab, label: "Detaljer", icon: Clock },
                { key: "messages" as DrawerTab, label: "Meldinger", icon: MessageSquare },
                { key: "history" as DrawerTab, label: "Historikk", icon: History },
              ]).map(t => (
                <Button
                  key={t.key} type="button"
                  variant={tab === t.key ? "default" : "ghost"}
                  size="sm" className="h-8 text-xs rounded-md flex-1 gap-1.5"
                  onClick={() => setTab(t.key)}
                >
                  <t.icon className="h-3.5 w-3.5" />
                  {t.label}
                  {t.key === "messages" && notes.length > 0 && tab !== "messages" && (
                    <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/20 text-primary px-1 text-[10px] font-bold">
                      {notes.length}
                    </span>
                  )}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {tab === "details" && (
              <DetailsTab event={event} techs={eventTechs}
                canEdit={canDo("ressursplan.schedule")}
                onEdit={() => { onEdit(event); onOpenChange(false); }}
                onDelete={() => setShowDeleteConfirm(true)}
                onRefresh={onRefresh} />
            )}
            {tab === "messages" && (
              <MessagesTab
                notes={notes} loading={notesLoading}
                newMessage={newMessage} setNewMessage={setNewMessage}
                sending={sending} onSend={handleSendMessage}
                currentUserId={user?.id}
              />
            )}
            {tab === "history" && <HistoryTab logs={logs} loading={logsLoading} />}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fjern hendelse?</AlertDialogTitle>
            <AlertDialogDescription>
              Hendelsen fjernes fra ressursplanen. Eventuelle koblede jobber påvirkes ikke.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Avbryt</AlertDialogCancel>
            <AlertDialogAction disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}>
              {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Slett
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/* ── Details Tab ── */
function DetailsTab({ event, techs, canEdit, onEdit, onDelete, onRefresh }: {
  event: CalendarEvent; techs: Technician[];
  canEdit: boolean; onEdit: () => void; onDelete: () => void; onRefresh: () => void;
}) {
  const [syncing, setSyncing] = useState(false);

  const handleResync = async () => {
    setSyncing(true);
    try {
      const { data } = await supabase.functions.invoke("calendar-sync", {
        body: { event_id: event.id },
      });
      if (data?.ok) {
        toast.success("Synket til ekstern kalender");
        onRefresh();
      } else {
        toast.error("Kalendersynk feilet");
      }
    } catch {
      toast.error("Kalendersynk feilet");
    } finally {
      setSyncing(false);
    }
  };
  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-5">
        {/* Time */}
        <section>
          <SectionLabel>Tidspunkt</SectionLabel>
          <div className="rounded-lg border border-border/40 bg-muted/30 p-3 space-y-1">
            <p className="text-sm font-medium">
              {format(parseISO(event.start_time), "EEEE d. MMMM yyyy", { locale: nb })}
            </p>
            <p className="text-sm text-muted-foreground">
              {format(parseISO(event.start_time), "HH:mm")} – {format(parseISO(event.end_time), "HH:mm")}
            </p>
          </div>
        </section>

        {/* Customer & Address */}
        {(event.customer || event.address || event.site) && (
          <section>
            <SectionLabel>Kunde & Lokasjon</SectionLabel>
            <div className="rounded-lg border border-border/40 bg-card p-3 space-y-2">
              {event.customer && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="font-medium">{event.customer}</span>
                </div>
              )}
              {(event.address || event.site) && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>{event.site ? `${event.site.name || event.site.address}, ${event.site.city}` : event.address}</span>
                </div>
              )}
              {event.site?.id && (
                <Link to={`/tenant/crm/sites/${event.site.id}`} className="inline-block">
                  <Button variant="link" size="sm" className="h-auto p-0 text-xs gap-1 text-primary">
                    <ExternalLink className="h-3 w-3" />Gå til anleggssted
                  </Button>
                </Link>
              )}
            </div>
          </section>
        )}

        {/* Linked Job – enriched */}
        {event.job && (
          <section>
            <SectionLabel>Koblet jobb</SectionLabel>
            <div className="rounded-lg border border-border/40 bg-card p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{event.job.job_number} – {event.job.title}</p>
                  <div className="flex gap-2 mt-1.5 flex-wrap">
                    <Badge variant="secondary" className={cn("text-[10px]", JOB_STATUS_COLORS[event.job.status] || "")}>
                      {JOB_STATUS_LABELS[event.job.status] || event.job.status}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <Wrench className="h-2.5 w-2.5" />
                      {JOB_TYPE_LABELS[event.job.job_type] || event.job.job_type}
                    </Badge>
                  </div>
                </div>
                <Link to={`/tenant/crm/jobs/${event.job.id}`}>
                  <Button variant="ghost" size="icon" className="shrink-0"><ExternalLink className="h-4 w-4" /></Button>
                </Link>
              </div>

              {/* Quick actions for job */}
              <div className="flex gap-2 pt-1 border-t border-border/30">
                <Link to={`/tenant/crm/jobs/${event.job.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs">
                    {event.job.form_data?.schema_version === 1 ? (
                      <><Eye className="h-3 w-3" />Se skjema</>
                    ) : (
                      <><ClipboardList className="h-3 w-3" />Fyll ut skjema</>
                    )}
                  </Button>
                </Link>
                <Link to={`/tenant/crm/jobs/${event.job.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs">
                    <FileText className="h-3 w-3" />Jobbdetaljer
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Service Visit */}
        {event.service_visit && (
          <section>
            <SectionLabel>Servicebesøk</SectionLabel>
            <div className="rounded-lg border border-border/40 bg-card p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm">Planlagt: {event.service_visit.scheduled_date || "–"}</p>
                  <div className="flex gap-1.5 mt-1">
                    <Badge variant="outline" className="text-[10px]">
                      {VISIT_STATUS_LABELS[event.service_visit.status] || event.service_visit.status}
                    </Badge>
                    {event.service_visit.report_data?.schema_version === 1 ? (
                      <Badge variant="secondary" className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-600">
                        <CheckCircle2 className="h-2.5 w-2.5" />Skjema utfylt
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-200">Skjema mangler</Badge>
                    )}
                  </div>
                </div>
                {event.service_visit.agreement_id && (
                  <Link to={`/tenant/crm/agreements/${event.service_visit.agreement_id}`}>
                    <Button variant="ghost" size="icon"><ExternalLink className="h-4 w-4" /></Button>
                  </Link>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Technicians */}
        <section>
          <SectionLabel>Teknikere ({techs.length})</SectionLabel>
          {techs.length > 0 ? (
            <div className="space-y-2">
              {techs.map(tech => (
                <div key={tech.id} className="flex items-center gap-3 rounded-lg border border-border/40 bg-card p-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ backgroundColor: tech.color }}>
                    {tech.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{tech.name}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      {tech.phone && (
                        <a href={`tel:${tech.phone}`} className="flex items-center gap-1 hover:text-primary transition-colors">
                          <Phone className="h-3 w-3" />{tech.phone}
                        </a>
                      )}
                      {tech.email && (
                        <a href={`mailto:${tech.email}`} className="flex items-center gap-1 truncate hover:text-primary transition-colors">
                          <Mail className="h-3 w-3" />{tech.email}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-4 text-center">
              <Users className="h-5 w-5 text-muted-foreground/40 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Ingen teknikere tildelt</p>
            </div>
          )}
        </section>

        {/* Description */}
        {event.description && (
          <section>
            <SectionLabel>Beskrivelse</SectionLabel>
            <div className="rounded-lg border border-border/40 bg-muted/20 p-3">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{event.description}</p>
            </div>
          </section>
        )}

        {/* Calendar Sync & Notification Status */}
        <section>
          <SectionLabel>Synk & Varsling</SectionLabel>
          <div className="rounded-lg border border-border/40 bg-card p-3 space-y-3">
            {/* Calendar sync status */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Kalendersynk</p>
              {event.calendar_sync_status === "synced" && (
                <div className="flex items-center gap-2 text-sm">
                  <CalendarCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="text-emerald-700 font-medium">Synket til ekstern kalender</span>
                </div>
              )}
              {event.calendar_sync_status === "pending" && (
                <div className="flex items-center gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-amber-600 shrink-0" />
                  <span className="text-amber-700">Synkroniserer...</span>
                </div>
              )}
              {event.calendar_sync_status === "failed" && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <CalendarX2 className="h-4 w-4 text-destructive shrink-0" />
                    <span className="text-destructive font-medium">Synk feilet</span>
                  </div>
                  {event.calendar_sync_error && (
                    <p className="text-xs text-muted-foreground pl-6">{event.calendar_sync_error}</p>
                  )}
                </div>
              )}
              {(!event.calendar_sync_status || event.calendar_sync_status === "none") && (
                <div className="flex items-center gap-2 text-sm">
                  <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Kun i VPK – ikke synket</span>
                </div>
              )}
            </div>

            <Separator className="!my-2" />

            {/* Notification status */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">E-postvarsling</p>
              {event.notification_status === "sent" && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="text-emerald-700 font-medium">Varsel sendt</span>
                    {event.notified_at && (
                      <p className="text-[11px] text-muted-foreground">
                        {formatDistanceToNow(parseISO(event.notified_at), { addSuffix: true, locale: nb })}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {event.notification_status === "partial" && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-amber-600 shrink-0" />
                  <span className="text-amber-700 font-medium">Delvis sendt – noen feilet</span>
                </div>
              )}
              {event.notification_status === "failed" && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-destructive shrink-0" />
                  <span className="text-destructive font-medium">Varsling feilet</span>
                </div>
              )}
              {(!event.notification_status || event.notification_status === "none") && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Ingen varsel sendt</span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            {canEdit && (
              <div className="flex gap-2 pt-1">
                <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={handleResync} disabled={syncing}>
                  {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  {event.calendar_sync_status === "synced" ? "Synk på nytt" : "Synk & varsle"}
                </Button>
                <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={handleNotifyOnly} disabled={notifying}>
                  {notifying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Send varsel
                </Button>
              </div>
            )}
          </div>
        </section>


        {canEdit && (
          <section className="pt-2 space-y-2">
            <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={onEdit}>
              <Edit3 className="h-3.5 w-3.5" />Rediger hendelse
            </Button>
            <Button variant="ghost" size="sm"
              className="w-full gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 justify-start"
              onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />Fjern fra plan
            </Button>
          </section>
        )}
      </div>
    </ScrollArea>
  );
}

/* ── Messages Tab ── */
function MessagesTab({ notes, loading, newMessage, setNewMessage, sending, onSend, currentUserId }: {
  notes: EventNote[]; loading: boolean;
  newMessage: string; setNewMessage: (v: string) => void;
  sending: boolean; onSend: () => void; currentUserId?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [notes.length]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (newMessage.trim() && !sending) {
        onSend();
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-3">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : notes.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <MessageSquare className="h-6 w-6 text-primary/60" />
              </div>
              <p className="text-sm font-medium">Intern meldingstråd</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[260px] mx-auto leading-relaxed">
                Bruk denne tråden til å koordinere med teamet rundt denne hendelsen – f.eks. endringsforespørsler, tilbakemeldinger fra kunden, eller beskjeder til montør.
              </p>
            </div>
          ) : (
            <>
              <div className="flex justify-center mb-2">
                <span className="text-[10px] text-muted-foreground/50 bg-muted/30 rounded-full px-3 py-0.5">
                  Intern tråd – synlig for teamet
                </span>
              </div>
              {notes.map(note => {
                const isOwn = note.author_id === currentUserId;
                const isSystem = note.note_type === "system" || note.note_type === "status_change";
                if (isSystem) {
                  return (
                    <div key={note.id} className="flex justify-center">
                      <div className="bg-muted/50 rounded-full px-3 py-1 text-[11px] text-muted-foreground">
                        {note.body}
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={note.id} className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-2.5 space-y-1",
                      isOwn
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted rounded-bl-md"
                    )}>
                      {!isOwn && (
                        <p className={cn("text-[11px] font-semibold", "text-muted-foreground")}>
                          {note.author_name}
                        </p>
                      )}
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{note.body}</p>
                      <p className={cn("text-[10px]", isOwn ? "text-primary-foreground/60" : "text-muted-foreground/70")}>
                        {format(parseISO(note.created_at), "d. MMM HH:mm", { locale: nb })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border bg-muted/20 p-3">
        <div className="flex gap-2 items-end">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Skriv en intern melding..."
            className="min-h-[44px] max-h-[120px] resize-none text-sm rounded-xl bg-background border-border/60"
            rows={2}
            onKeyDown={handleKeyDown}
          />
          <Button size="icon" onClick={onSend}
            disabled={sending || !newMessage.trim()}
            className="shrink-0 h-11 w-11 rounded-xl">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground/60 mt-1.5 px-1">
          Ctrl+Enter = send · Synlig for alle i teamet
        </p>
      </div>
    </div>
  );
}

/* ── History Tab ── */
function HistoryTab({ logs, loading }: { logs: EventLog[]; loading: boolean }) {
  return (
    <ScrollArea className="h-full">
      <div className="p-6">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
              <History className="h-6 w-6 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium">Ingen historikk ennå</p>
            <p className="text-xs text-muted-foreground mt-1">Endringer logges automatisk her</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-3 top-2 bottom-2 w-px bg-border/60" />
            <div className="space-y-4">
              {logs.map(log => (
                <div key={log.id} className="relative pl-8">
                  <div className={cn(
                    "absolute left-1.5 top-1.5 w-3 h-3 rounded-full border-2 border-background",
                    log.action === "deleted" ? "bg-destructive" :
                    log.action === "created" ? "bg-emerald-500" :
                    log.action === "moved" || log.action === "resized" ? "bg-amber-500" :
                    log.action === "status_changed" ? "bg-blue-500" :
                    "bg-primary"
                  )} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{ACTION_LABELS[log.action] || log.action}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {format(parseISO(log.created_at), "d. MMM HH:mm", { locale: nb })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{log.actor_name || "System"}</p>
                    {log.details && Object.keys(log.details).length > 0 && (
                      <div className="mt-1 text-xs text-muted-foreground bg-muted/30 rounded-md px-2.5 py-1.5 space-y-0.5">
                        {log.details.title && <span className="block">«{log.details.title}»</span>}
                        {log.details.technician_name && <span className="block">Tekniker: {log.details.technician_name}</span>}
                        {log.details.old_status && log.details.new_status && (
                          <span className="block">
                            {EVENT_STATUS_OPTIONS.find(s => s.value === log.details.old_status)?.label || log.details.old_status}
                            {" → "}
                            {EVENT_STATUS_OPTIONS.find(s => s.value === log.details.new_status)?.label || log.details.new_status}
                          </span>
                        )}
                        {log.details.old_time && log.details.new_time && (
                          <span className="block">{log.details.old_time} → {log.details.new_time}</span>
                        )}
                        {log.details.new_time && !log.details.old_time && (
                          <span className="block">Ny tid: {log.details.new_time}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

/* ── Helper ── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
      {children}
    </h3>
  );
}
