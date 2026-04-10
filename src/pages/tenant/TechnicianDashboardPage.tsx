import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Briefcase, ChevronRight, Camera, Clock, MapPin, User, CheckCircle2,
  Loader2, ClipboardList, FileText, ChevronLeft, ChevronDown,
} from "lucide-react";
import { format, isSameDay, addDays, parseISO } from "date-fns";
import { nb } from "date-fns/locale";
import {
  JOB_STATUS_LABELS, JOB_STATUS_COLORS, JOB_TYPE_LABELS,
} from "@/lib/domain-labels";
import { DocumentUploadSection } from "@/components/crud/DocumentUploadSection";

export default function TechnicianDashboardPage() {
  const { tenantId, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [checklistData, setChecklistData] = useState<any>(null);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [docsSheetOpen, setDocsSheetOpen] = useState(false);
  const [docsJobId, setDocsJobId] = useState<string | null>(null);
  const [docsData, setDocsData] = useState<any[]>([]);
  const [technicianId, setTechnicianId] = useState<string | null>(null);

  // Find this user's technician record – prefer user_id match, fallback to email
  useEffect(() => {
    if (!tenantId || !user) return;
    const findTechnician = async () => {
      // Try user_id match first (robust)
      const { data: byUserId } = await supabase
        .from("technicians")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .eq("user_id", user.id)
        .limit(1);
      if (byUserId?.[0]) { setTechnicianId(byUserId[0].id); return; }
      // Fallback to email match
      if (user.email) {
        const { data: byEmail } = await supabase
          .from("technicians")
          .select("id")
          .eq("tenant_id", tenantId)
          .eq("is_active", true)
          .eq("email", user.email)
          .limit(1);
        if (byEmail?.[0]) setTechnicianId(byEmail[0].id);
      }
    };
    findTechnician();
  }, [tenantId, user]);

  const fetchDayEvents = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    const dayStart = new Date(selectedDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(selectedDate);
    dayEnd.setHours(23, 59, 59, 999);

    const { data: eventsData } = await supabase
      .from("events")
      .select("*, job:jobs(id, job_number, title, status, job_type, company_id, description, site_id, scheduled_start, scheduled_end, company:crm_companies(name), site:customer_sites(name, address, city), asset:hvac_assets(manufacturer, model)), site:customer_sites(name, address, city)")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .gte("start_time", dayStart.toISOString())
      .lte("start_time", dayEnd.toISOString())
      .order("start_time");

    if (!eventsData) { setEvents([]); setLoading(false); return; }

    // Filter to only events assigned to this technician (if we found one)
    if (technicianId) {
      const eventIds = eventsData.map((e: any) => e.id);
      if (eventIds.length > 0) {
        const { data: assignments } = await supabase
          .from("event_technicians")
          .select("event_id")
          .in("event_id", eventIds)
          .eq("technician_id", technicianId);
        const myEventIds = new Set((assignments || []).map((a: any) => a.event_id));
        setEvents(eventsData.filter((e: any) => myEventIds.has(e.id)));
      } else {
        setEvents([]);
      }
    } else {
      // If no technician record found, show all events for the day
      setEvents(eventsData);
    }
    setLoading(false);
  }, [tenantId, selectedDate, technicianId]);

  useEffect(() => { fetchDayEvents(); }, [fetchDayEvents]);

  const isToday = isSameDay(selectedDate, new Date());
  const dateLabel = isToday
    ? "I dag"
    : isSameDay(selectedDate, addDays(new Date(), 1))
      ? "I morgen"
      : format(selectedDate, "EEEE d. MMMM", { locale: nb });

  // Load checklist for expanded job
  const loadChecklist = useCallback(async (jobId: string) => {
    setChecklistLoading(true);
    const { data: cls } = await supabase
      .from("installation_checklists")
      .select("*")
      .eq("job_id", jobId)
      .order("created_at");
    if (cls && cls.length > 0) {
      const clIds = cls.map((c: any) => c.id);
      const { data: items } = await supabase
        .from("checklist_items")
        .select("*")
        .in("checklist_id", clIds)
        .order("sort_order");
      setChecklistData(
        cls.map((cl: any) => ({ ...cl, items: (items || []).filter((i: any) => i.checklist_id === cl.id) }))
      );
    } else {
      setChecklistData([]);
    }
    setChecklistLoading(false);
  }, []);

  const toggleExpand = (jobId: string) => {
    if (expandedJobId === jobId) {
      setExpandedJobId(null);
      setChecklistData(null);
    } else {
      setExpandedJobId(jobId);
      loadChecklist(jobId);
    }
  };

  const toggleCheckItem = async (itemId: string, checked: boolean) => {
    const { error } = await supabase.from("checklist_items").update({
      is_checked: checked,
      checked_at: checked ? new Date().toISOString() : null,
      checked_by: checked ? user?.id || null : null,
    }).eq("id", itemId);
    if (error) { toast.error("Kunne ikke oppdatere"); return; }
    if (expandedJobId) loadChecklist(expandedJobId);
  };

  const updateJobStatus = async (jobId: string, status: string) => {
    const updatePayload: any = { status };
    if (status === "in_progress" ) updatePayload.actual_start = new Date().toISOString();
    if (status === "completed") updatePayload.actual_end = new Date().toISOString();
    const { error } = await supabase.from("jobs").update(updatePayload).eq("id", jobId);
    if (error) {
      toast.error("Du har ikke tilgang til å utføre denne handlingen");
      return;
    }
    toast.success(`Status endret til ${JOB_STATUS_LABELS[status] || status}`);
    fetchDayEvents();
  };

  const openDocs = async (jobId: string) => {
    setDocsJobId(jobId);
    const { data } = await supabase.from("documents").select("*").eq("job_id", jobId).is("deleted_at", null);
    setDocsData(data || []);
    setDocsSheetOpen(true);
  };

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Mine oppdrag</h1>
          <p className="text-sm text-muted-foreground">{dateLabel}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={signOut} className="text-xs">Logg ut</Button>
      </div>

      {/* Date navigation */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSelectedDate(d => addDays(d, -1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant={isToday ? "default" : "outline"} size="sm" className="h-8" onClick={() => setSelectedDate(new Date())}>
          I dag
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSelectedDate(d => addDays(d, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground ml-1">
          {format(selectedDate, "d. MMM yyyy", { locale: nb })}
        </span>
      </div>

      {/* Events list */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : events.length === 0 ? (
        <Card className="p-8 text-center">
          <Briefcase className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Ingen oppdrag {isToday ? "i dag" : "denne dagen"}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {events.map((ev) => {
            const job = ev.job;
            const isExpanded = expandedJobId === job?.id;
            const siteName = ev.site?.address || ev.address || job?.site?.address;
            const siteCity = ev.site?.city || job?.site?.city;

            return (
              <Card key={ev.id} className="overflow-hidden">
                {/* Event header */}
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium">
                          {format(parseISO(ev.start_time), "HH:mm")} – {format(parseISO(ev.end_time), "HH:mm")}
                        </span>
                      </div>
                      <p className="font-semibold mt-1 truncate">{ev.title}</p>
                    </div>
                    {job && (
                      <Badge className={`shrink-0 text-[10px] ${JOB_STATUS_COLORS[job.status] || ""}`}>
                        {JOB_STATUS_LABELS[job.status] || job.status}
                      </Badge>
                    )}
                  </div>

                  {/* Context info */}
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {ev.customer && (
                      <div className="flex items-center gap-1.5">
                        <User className="h-3 w-3 shrink-0" />
                        <span className="truncate">{ev.customer}</span>
                      </div>
                    )}
                    {(siteName || siteCity) && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{[siteName, siteCity].filter(Boolean).join(", ")}</span>
                      </div>
                    )}
                    {job && (
                      <div className="flex items-center gap-1.5">
                        <Briefcase className="h-3 w-3 shrink-0" />
                        <span className="truncate">{job.job_number} · {JOB_TYPE_LABELS[job.job_type] || job.job_type}</span>
                      </div>
                    )}
                  </div>

                  {/* Quick actions */}
                  {job && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {/* Status changer */}
                      <Select value={job.status} onValueChange={(v) => updateJobStatus(job.id, v)}>
                        <SelectTrigger className="h-8 w-[140px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(JOB_STATUS_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => toggleExpand(job.id)}>
                        <ClipboardList className="h-3 w-3" />Sjekkliste
                        <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </Button>

                      <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => openDocs(job.id)}>
                        <Camera className="h-3 w-3" />Bilder
                      </Button>

                      <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={() => navigate(`/tenant/crm/jobs/${job.id}`)}>
                        <FileText className="h-3 w-3" />Detaljer <ChevronRight className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Expanded checklist */}
                {isExpanded && job && (
                  <div className="border-t bg-muted/30 p-4 space-y-2">
                    {checklistLoading ? (
                      <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
                    ) : !checklistData?.length ? (
                      <p className="text-xs text-muted-foreground text-center py-2">Ingen sjekkliste</p>
                    ) : (
                      checklistData.map((cl: any) => (
                        <div key={cl.id} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-medium">{cl.template_name}</p>
                            {cl.completed_at && (
                              <Badge variant="secondary" className="text-[9px] gap-0.5">
                                <CheckCircle2 className="h-2.5 w-2.5" />Fullført
                              </Badge>
                            )}
                          </div>
                          {cl.items?.map((item: any) => (
                            <label key={item.id} className="flex items-center gap-2 py-1 cursor-pointer">
                              <Checkbox
                                checked={item.is_checked}
                                disabled={!!cl.completed_at}
                                onCheckedChange={(v) => toggleCheckItem(item.id, !!v)}
                              />
                              <span className={`text-sm ${item.is_checked ? "line-through text-muted-foreground" : ""}`}>
                                {item.label}
                              </span>
                            </label>
                          ))}
                          <p className="text-[10px] text-muted-foreground">
                            {cl.items?.filter((i: any) => i.is_checked).length}/{cl.items?.length} ferdig
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Documents upload sheet */}
      <Sheet open={docsSheetOpen} onOpenChange={setDocsSheetOpen}>
        <SheetContent side="bottom" className="h-[70vh]">
          <SheetHeader>
            <SheetTitle>Bilder og dokumenter</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto flex-1 py-4">
            {docsJobId && (
              <DocumentUploadSection
                documents={docsData}
                entityType="job"
                entityId={docsJobId}
                queryKey={["tech-job-docs", docsJobId]}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
