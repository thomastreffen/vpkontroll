import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INTERVAL_MONTHS: Record<string, number> = {
  monthly: 1,
  quarterly: 3,
  semi_annual: 6,
  annual: 12,
  biennial: 24,
};

function addMonths(date: Date, months: number): string {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split("T")[0];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Parse optional params
  let lookAheadDays = 30;
  let triggeredBy = "cron";
  try {
    const body = await req.json().catch(() => ({}));
    if (body.look_ahead_days) lookAheadDays = Number(body.look_ahead_days);
    if (body.triggered_by) triggeredBy = String(body.triggered_by);
  } catch { /* use defaults */ }

  // Create run log
  const { data: run, error: runErr } = await supabase
    .from("service_generation_runs")
    .insert({ triggered_by: triggeredBy })
    .select("id")
    .single();

  if (runErr || !run) {
    return new Response(JSON.stringify({ error: "Failed to create run log", details: runErr }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const runId = run.id;
  const today = new Date().toISOString().split("T")[0];
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + lookAheadDays);
  const futureDateStr = futureDate.toISOString().split("T")[0];

  let agreementsScanned = 0;
  let visitsCreated = 0;
  let jobsCreated = 0;
  let errorsCount = 0;
  const errorDetails: unknown[] = [];

  try {
    // Fetch active agreements with next_visit_due in window
    const { data: agreements, error: agErr } = await supabase
      .from("service_agreements")
      .select("id, tenant_id, company_id, site_id, asset_id, interval, next_visit_due, scope_description")
      .eq("status", "active")
      .not("next_visit_due", "is", null)
      .gte("next_visit_due", today)
      .lte("next_visit_due", futureDateStr)
      .is("deleted_at", null);

    if (agErr) throw agErr;

    agreementsScanned = agreements?.length ?? 0;

    for (const ag of agreements ?? []) {
      try {
        const period = ag.next_visit_due; // date string

        // Check idempotency: does a visit already exist for this period?
        const { data: existing } = await supabase
          .from("service_visits")
          .select("id")
          .eq("tenant_id", ag.tenant_id)
          .eq("agreement_id", ag.id)
          .eq("agreement_period", period)
          .maybeSingle();

        if (existing) continue; // Already generated

        // Create job
        const { data: job, error: jobErr } = await supabase
          .from("jobs")
          .insert({
            tenant_id: ag.tenant_id,
            job_number: "AUTO", // trigger will generate
            job_type: "service",
            title: `Service – ${ag.scope_description || "Serviceavtale"}`,
            company_id: ag.company_id,
            site_id: ag.site_id,
            asset_id: ag.asset_id,
            scheduled_start: period,
            status: "planned",
            priority: "normal",
          })
          .select("id")
          .single();

        if (jobErr) throw { agreement_id: ag.id, step: "job", error: jobErr };
        jobsCreated++;

        // Create service_visit
        const { error: visitErr } = await supabase
          .from("service_visits")
          .insert({
            tenant_id: ag.tenant_id,
            agreement_id: ag.id,
            job_id: job.id,
            asset_id: ag.asset_id,
            site_id: ag.site_id,
            scheduled_date: period,
            agreement_period: period,
            status: "planned",
          });

        if (visitErr) throw { agreement_id: ag.id, step: "visit", error: visitErr };
        visitsCreated++;

        // Update next_visit_due
        const months = INTERVAL_MONTHS[ag.interval] ?? 12;
        const nextDue = addMonths(new Date(period), months);

        const { error: updateErr } = await supabase
          .from("service_agreements")
          .update({ next_visit_due: nextDue })
          .eq("id", ag.id);

        if (updateErr) throw { agreement_id: ag.id, step: "update_due", error: updateErr };

      } catch (innerErr) {
        errorsCount++;
        errorDetails.push(innerErr);
      }
    }

    // Finalize run log
    await supabase
      .from("service_generation_runs")
      .update({
        completed_at: new Date().toISOString(),
        status: errorsCount > 0 ? "completed_with_errors" : "completed",
        agreements_scanned: agreementsScanned,
        visits_created: visitsCreated,
        jobs_created: jobsCreated,
        errors_count: errorsCount,
        error_details: errorDetails,
      })
      .eq("id", runId);

    return new Response(
      JSON.stringify({
        run_id: runId,
        agreements_scanned: agreementsScanned,
        visits_created: visitsCreated,
        jobs_created: jobsCreated,
        errors_count: errorsCount,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (fatalErr) {
    await supabase
      .from("service_generation_runs")
      .update({
        completed_at: new Date().toISOString(),
        status: "failed",
        agreements_scanned: agreementsScanned,
        errors_count: 1,
        error_details: [{ fatal: String(fatalErr) }],
      })
      .eq("id", runId);

    return new Response(
      JSON.stringify({ error: "Fatal error", details: String(fatalErr) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
