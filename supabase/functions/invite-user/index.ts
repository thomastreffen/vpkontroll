import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Mangler autorisasjon" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify calling user is tenant_admin
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user: caller } } = await anonClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Ugyldig bruker" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get caller's tenant
    const { data: callerProfile } = await anonClient
      .from("profiles")
      .select("tenant_id")
      .eq("user_id", caller.id)
      .single();
    if (!callerProfile?.tenant_id) {
      return new Response(JSON.stringify({ error: "Ingen tenant funnet" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check caller is tenant_admin or master_admin
    const { data: callerRoles } = await anonClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);
    const roles = callerRoles?.map(r => r.role) || [];
    if (!roles.includes("tenant_admin") && !roles.includes("master_admin")) {
      return new Response(JSON.stringify({ error: "Bare administratorer kan invitere brukere" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { email, full_name, app_role, tenant_role_id } = body;

    if (!email) {
      return new Response(JSON.stringify({ error: "E-post er påkrevd" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to create user
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if user already exists
    const { data: existingProfiles } = await adminClient
      .from("profiles")
      .select("user_id, tenant_id")
      .eq("email", email);

    if (existingProfiles && existingProfiles.length > 0) {
      const existing = existingProfiles[0];
      if (existing.tenant_id === callerProfile.tenant_id) {
        return new Response(JSON.stringify({ error: "Brukeren er allerede i din virksomhet" }), {
          status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // User exists but in different tenant
      return new Response(JSON.stringify({ error: "E-postadressen er allerede i bruk" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create user with auto-confirm for pilot/testing
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      email_confirm: true,
      password: generateTempPassword(),
      user_metadata: { full_name: full_name || email },
    });

    if (createError) {
      console.error("Create user error:", createError);
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = newUser.user.id;

    // Update profile with tenant_id (profile is auto-created by trigger)
    // Wait a moment for the trigger to fire
    await new Promise(r => setTimeout(r, 500));
    
    await adminClient
      .from("profiles")
      .update({ 
        tenant_id: callerProfile.tenant_id,
        full_name: full_name || email,
      })
      .eq("user_id", userId);

    // Assign app_role (default to 'user')
    const roleToAssign = app_role || "user";
    await adminClient
      .from("user_roles")
      .insert({ user_id: userId, role: roleToAssign });

    // Assign tenant role if provided
    if (tenant_role_id) {
      await adminClient
        .from("tenant_user_role_assignments")
        .insert({
          user_id: userId,
          role_id: tenant_role_id,
          tenant_id: callerProfile.tenant_id,
        });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      user_id: userId,
      message: "Bruker opprettet" 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Invite user error:", err);
    return new Response(JSON.stringify({ error: "Intern feil" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function generateTempPassword(): string {
  const chars = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%";
  let password = "";
  for (let i = 0; i < 16; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  return password;
}
