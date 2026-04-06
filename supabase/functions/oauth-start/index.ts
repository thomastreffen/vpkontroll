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
    const { provider, credential_id } = await req.json();

    if (!provider || !credential_id) {
      return new Response(JSON.stringify({ error: "provider and credential_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch the credential to get client_id and tenant_domain
    const { data: cred, error: credErr } = await supabase
      .from("tenant_credentials")
      .select("*")
      .eq("id", credential_id)
      .single();

    if (credErr || !cred) {
      return new Response(JSON.stringify({ error: "Credential not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!cred.client_id) {
      return new Response(JSON.stringify({ error: "Client ID not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const redirectUri = `${supabaseUrl}/functions/v1/oauth-callback`;

    // State parameter encodes credential_id for the callback
    const state = btoa(JSON.stringify({ credential_id: cred.id }));

    let authUrl: string;

    if (provider === "microsoft") {
      const tenantId = cred.tenant_domain || "common";
      const scopes = [
        "offline_access",
        "https://graph.microsoft.com/Mail.Read",
        "https://graph.microsoft.com/Mail.Send",
        "https://graph.microsoft.com/Calendars.ReadWrite",
        "https://graph.microsoft.com/Contacts.Read",
      ];
      authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?` +
        new URLSearchParams({
          client_id: cred.client_id,
          response_type: "code",
          redirect_uri: redirectUri,
          scope: scopes.join(" "),
          state,
          response_mode: "query",
          prompt: "consent",
        }).toString();
    } else if (provider === "google") {
      const scopes = [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/contacts.readonly",
      ];
      authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        new URLSearchParams({
          client_id: cred.client_id,
          response_type: "code",
          redirect_uri: redirectUri,
          scope: scopes.join(" "),
          state,
          access_type: "offline",
          prompt: "consent",
        }).toString();
    } else {
      return new Response(JSON.stringify({ error: "Unknown provider" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ auth_url: authUrl, redirect_uri: redirectUri }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("oauth-start error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
