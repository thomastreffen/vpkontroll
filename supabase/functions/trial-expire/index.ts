import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Find all trial subscriptions past their trial_ends_at
    const { data: expired, error } = await admin
      .from("tenant_subscriptions")
      .select("id, tenant_id, trial_ends_at")
      .eq("status", "trial")
      .lt("trial_ends_at", new Date().toISOString());

    if (error) {
      console.error("Query error:", error);
      return new Response(
        JSON.stringify({ error: "Feil ved sjekk av utløpte trials" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!expired || expired.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, expired_count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let expiredCount = 0;

    for (const sub of expired) {
      // Update subscription status to expired
      const { error: updateErr } = await admin
        .from("tenant_subscriptions")
        .update({
          status: "expired",
          expires_at: new Date().toISOString(),
        })
        .eq("id", sub.id);

      if (updateErr) {
        console.error(`Failed to expire subscription ${sub.id}:`, updateErr);
        continue;
      }

      // Deactivate all modules for this tenant
      await admin
        .from("tenant_modules")
        .update({ is_active: false, deactivated_at: new Date().toISOString() })
        .eq("tenant_id", sub.tenant_id)
        .eq("is_active", true);

      expiredCount++;
      console.log(`Expired trial for tenant ${sub.tenant_id}`);
    }

    return new Response(
      JSON.stringify({ ok: true, expired_count: expiredCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Trial expire error:", err);
    return new Response(
      JSON.stringify({ error: "Intern feil" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
