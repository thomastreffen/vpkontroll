import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Loader2, GripVertical, Briefcase, ChevronDown, ChevronUp } from "lucide-react";
import { JOB_STATUS_LABELS, JOB_STATUS_COLORS, JOB_TYPE_LABELS } from "@/lib/domain-labels";
import { cn } from "@/lib/utils";

type UnplannedJob = {
  id: string;
  job_number: string;
  title: string;
  status: string;
  job_type: string;
  company_name: string | null;
  site_address: string | null;
  estimated_hours: number | null;
};

interface UnplannedJobsStripProps {
  onJobDrop?: (job: UnplannedJob, date: Date) => void;
  onJobClick?: (job: UnplannedJob) => void;
}

export function UnplannedJobsStrip({ onJobDrop, onJobClick }: UnplannedJobsStripProps) {
  const { tenantId } = useAuth();
  const [jobs, setJobs] = useState<UnplannedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  const fetchUnplannedJobs = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);

    // Get jobs that have no events linked
    const { data: jobsData } = await supabase
      .from("jobs")
      .select("id, job_number, title, status, job_type, estimated_hours, company:crm_companies(name), site:customer_sites(address, city)")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .in("status", ["planned", "scheduled"])
      .order("created_at", { ascending: false })
      .limit(50);

    if (!jobsData) { setJobs([]); setLoading(false); return; }

    // Check which jobs already have events
    const jobIds = jobsData.map((j: any) => j.id);
    const { data: eventLinks } = jobIds.length > 0
      ? await supabase.from("events").select("job_id").in("job_id", jobIds).is("deleted_at", null)
      : { data: [] };

    const linkedJobIds = new Set((eventLinks || []).map((e: any) => e.job_id));

    setJobs(
      jobsData
        .filter((j: any) => !linkedJobIds.has(j.id))
        .map((j: any) => ({
          id: j.id,
          job_number: j.job_number,
          title: j.title,
          status: j.status,
          job_type: j.job_type,
          estimated_hours: j.estimated_hours,
          company_name: j.company?.name || null,
          site_address: j.site ? [j.site.address, j.site.city].filter(Boolean).join(", ") : null,
        }))
    );
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { fetchUnplannedJobs(); }, [fetchUnplannedJobs]);

  // Realtime refresh when jobs change
  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel("unplanned-jobs-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, () => fetchUnplannedJobs())
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => fetchUnplannedJobs())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchUnplannedJobs, tenantId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Laster uplanlagte jobber...
      </div>
    );
  }

  if (jobs.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/30 bg-card shadow-sm">
      <button
        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-muted/30 transition-colors rounded-t-xl"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Uplanlagte jobber</span>
          <Badge variant="secondary" className="text-[10px] px-1.5">{jobs.length}</Badge>
        </div>
        {collapsed ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
      </button>

      {!collapsed && (
        <ScrollArea className="w-full">
          <div className="flex gap-2 px-4 pb-3 pt-1">
            {jobs.map(job => (
              <div
                key={job.id}
                draggable
                className={cn(
                  "vpk-draggable-job flex-shrink-0 w-56 rounded-lg border border-border/50 bg-background p-3 cursor-grab active:cursor-grabbing",
                  "hover:border-primary/40 hover:shadow-sm transition-all group"
                )}
                data-vpk-job={JSON.stringify(job)}
                data-event={JSON.stringify({
                  title: `${job.job_number} – ${job.title}`,
                  duration: job.estimated_hours ? `${String(Math.floor(job.estimated_hours)).padStart(2, "0")}:00` : "02:00",
                  extendedProps: { vpkJobData: job },
                })}
                onDragStart={(e) => {
                  e.dataTransfer.setData("application/vpk-job", JSON.stringify(job));
                  e.dataTransfer.effectAllowed = "copy";
                }}
                onClick={() => onJobClick?.(job)}
              >
                <div className="flex items-start gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground/40 mt-0.5 shrink-0 group-hover:text-primary/60" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-mono text-muted-foreground">{job.job_number}</p>
                    <p className="text-sm font-medium truncate mt-0.5">{job.title}</p>
                    {job.company_name && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{job.company_name}</p>
                    )}
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <Badge variant="secondary" className={cn("text-[9px] px-1", JOB_STATUS_COLORS[job.status] || "")}>
                        {JOB_STATUS_LABELS[job.status] || job.status}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">{JOB_TYPE_LABELS[job.job_type] || job.job_type}</span>
                      {job.estimated_hours && (
                        <span className="text-[10px] text-muted-foreground">{job.estimated_hours}t</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}
    </div>
  );
}
