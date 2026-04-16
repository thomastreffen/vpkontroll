import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .substring(0, 48);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { company_name, admin_email, admin_name, admin_password } =
      await req.json();

    // Validate input
    if (!company_name || !admin_email || !admin_password) {
      return new Response(
        JSON.stringify({
          error:
            "company_name, admin_email og admin_password er påkrevd",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (admin_password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Passord må være minst 6 tegn" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Get demo plan
    const { data: demoPlan, error: planErr } = await admin
      .from("saas_plans")
      .select("*")
      .eq("slug", "demo")
      .eq("is_active", true)
      .single();

    if (planErr || !demoPlan) {
      return new Response(
        JSON.stringify({ error: "Demo-plan ikke funnet" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Check if email already exists
    const { data: existingUsers } = await admin.auth.admin.listUsers();
    const emailExists = existingUsers?.users?.some(
      (u) => u.email?.toLowerCase() === admin_email.toLowerCase()
    );
    if (emailExists) {
      return new Response(
        JSON.stringify({
          error: "Denne e-postadressen er allerede registrert",
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Create tenant
    const slug = slugify(company_name) + "-" + Date.now().toString(36);
    const { data: tenant, error: tenantErr } = await admin
      .from("tenants")
      .insert({
        name: company_name.trim(),
        slug,
        status: "active",
      })
      .select("id")
      .single();

    if (tenantErr || !tenant) {
      console.error("Tenant creation failed:", tenantErr);
      return new Response(
        JSON.stringify({ error: "Kunne ikke opprette bedrift" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Create auth user (auto-confirmed for demo)
    const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
      email: admin_email.toLowerCase().trim(),
      password: admin_password,
      email_confirm: true,
      user_metadata: {
        full_name: admin_name || admin_email.split("@")[0],
      },
    });

    if (authErr || !authUser?.user) {
      console.error("Auth user creation failed:", authErr);
      // Clean up tenant
      await admin.from("tenants").delete().eq("id", tenant.id);
      return new Response(
        JSON.stringify({ error: "Kunne ikke opprette brukerkonto" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = authUser.user.id;

    // 5. Update profile with tenant_id
    await admin
      .from("profiles")
      .update({ tenant_id: tenant.id })
      .eq("user_id", userId);

    // 6. Assign tenant_admin role
    await admin.from("user_roles").insert({
      user_id: userId,
      role: "tenant_admin",
    });

    // 7. Create subscription (triggers module sync automatically)
    const trialEnds = new Date();
    trialEnds.setDate(trialEnds.getDate() + (demoPlan.trial_days || 14));

    await admin.from("tenant_subscriptions").insert({
      tenant_id: tenant.id,
      plan_id: demoPlan.id,
      status: "trial",
      started_at: new Date().toISOString(),
      trial_ends_at: trialEnds.toISOString(),
      source: "website_signup",
      notes: `Selvbetjent demo opprettet av ${admin_email}`,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        tenant_id: tenant.id,
        message: "Demo-konto opprettet! Du kan nå logge inn.",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Demo signup error:", err);
    return new Response(
      JSON.stringify({ error: "Intern feil ved opprettelse av demo" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
