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
import { toast } from "sonner";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { nb } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  Briefcase, CalendarDays, Clock, MapPin, User, Users,
  ExternalLink, MessageSquare, History, Loader2, Send,
  Trash2, Edit3, ClipboardList, Eye, Phone, Mail,
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
  deleted: "Slettet",
};

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

  const handleDelete = async () => {
    if (!event) return;
    setDeleting(true);
    try {
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

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-[480px] flex flex-col p-0 gap-0">
          {/* Header */}
          <div className="px-6 pt-6 pb-3 space-y-2">
            <SheetHeader className="space-y-1">
              <SheetTitle className="flex items-center gap-2 text-base pr-8">
                {event.job_id && <Briefcase className="h-4 w-4 text-primary shrink-0" />}
                {event.service_visit_id && !event.job_id && <CalendarDays className="h-4 w-4 text-primary shrink-0" />}
                <span className="truncate">{event.title}</span>
              </SheetTitle>
              <SheetDescription className="text-xs flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-[10px]">{event.status}</Badge>
                {event.job?.job_number && (
                  <span className="font-mono text-[10px] bg-primary/10 text-primary rounded px-1.5 py-0.5">
                    {event.job.job_number}
                  </span>
                )}
              </SheetDescription>
            </SheetHeader>

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
                onDelete={() => setShowDeleteConfirm(true)} />
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
function DetailsTab({ event, techs, canEdit, onEdit, onDelete }: {
  event: CalendarEvent; techs: Technician[];
  canEdit: boolean; onEdit: () => void; onDelete: () => void;
}) {
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
            <div className="space-y-2">
              {event.customer && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>{event.customer}</span>
                </div>
              )}
              {(event.address || event.site) && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>{event.site ? `${event.site.name || event.site.address}, ${event.site.city}` : event.address}</span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Linked Job */}
        {event.job && (
          <section>
            <SectionLabel>Koblet jobb</SectionLabel>
            <div className="rounded-lg border border-border/40 bg-card p-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{event.job.job_number} – {event.job.title}</p>
                  <div className="flex gap-2 mt-1.5 flex-wrap">
                    <Badge variant="secondary" className={cn("text-[10px]", JOB_STATUS_COLORS[event.job.status] || "")}>
                      {JOB_STATUS_LABELS[event.job.status] || event.job.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{JOB_TYPE_LABELS[event.job.job_type] || event.job.job_type}</span>
                  </div>
                </div>
                <Link to={`/tenant/crm/jobs/${event.job.id}`}>
                  <Button variant="ghost" size="icon" className="shrink-0"><ExternalLink className="h-4 w-4" /></Button>
                </Link>
              </div>
              {(event.job.job_type === "installation" || event.job.job_type === "service") && (
                <div className="mt-2 pt-2 border-t border-border/30">
                  <Link to={`/tenant/crm/jobs/${event.job.id}`}>
                    <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs">
                      {event.job.form_data?.schema_version === 1 ? (
                        <><Eye className="h-3 w-3" />Se skjema</>
                      ) : (
                        <><ClipboardList className="h-3 w-3" />Fyll ut skjema</>
                      )}
                    </Button>
                  </Link>
                </div>
              )}
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
                        <CalendarDays className="h-2.5 w-2.5" />Skjema utfylt
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
          <SectionLabel>Teknikere</SectionLabel>
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
                        <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{tech.phone}</span>
                      )}
                      {tech.email && (
                        <span className="flex items-center gap-1 truncate"><Mail className="h-3 w-3" />{tech.email}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Ingen teknikere tildelt</p>
          )}
        </section>

        {/* Description */}
        {event.description && (
          <section>
            <SectionLabel>Beskrivelse</SectionLabel>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{event.description}</p>
          </section>
        )}

        {/* Actions */}
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

  // Auto-scroll to bottom when new notes arrive
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
              <p className="text-sm font-medium">Ingen meldinger ennå</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[240px] mx-auto">
                Bruk meldinger for å kommunisere med teamet om denne hendelsen. Trykk Enter for å sende.
              </p>
            </div>
          ) : (
            notes.map(note => {
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
            })
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border bg-muted/20 p-3">
        <div className="flex gap-2 items-end">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Skriv en melding..."
            className="min-h-[44px] max-h-[120px] resize-none text-sm rounded-xl bg-background border-border/60"
            rows={1}
            onKeyDown={handleKeyDown}
          />
          <Button size="icon" onClick={onSend}
            disabled={sending || !newMessage.trim()}
            className="shrink-0 h-11 w-11 rounded-xl">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground/60 mt-1.5 px-1">
          Ctrl+Enter = send
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
