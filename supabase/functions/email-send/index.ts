import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.49.4/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { to, cc, subject, body_html, case_id } = body;

    if (!to || !Array.isArray(to) || to.length === 0) {
      return new Response(JSON.stringify({ error: "Missing 'to' recipients" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!subject || !body_html) {
      return new Response(JSON.stringify({ error: "Missing subject or body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Authenticate user
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get tenant
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("user_id", user.id)
      .single();

    if (!profile?.tenant_id) {
      return new Response(JSON.stringify({ error: "No tenant" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get credentials
    const { data: credentials } = await supabase
      .from("tenant_credentials")
      .select("*")
      .eq("tenant_id", profile.tenant_id)
      .eq("status", "connected")
      .limit(1);

    if (!credentials || credentials.length === 0) {
      return new Response(JSON.stringify({ error: "No connected credentials" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cred = credentials[0] as any;

    // Get mailbox for sending
    const { data: mailboxes } = await supabase
      .from("mailboxes")
      .select("*")
      .eq("tenant_id", profile.tenant_id)
      .eq("provider", cred.provider)
      .eq("is_enabled", true)
      .limit(1);

    const fromMailbox = mailboxes?.[0]?.address;
    if (!fromMailbox) {
      return new Response(JSON.stringify({ error: "No mailbox configured" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result: any;

    if (cred.provider === "microsoft") {
      result = await sendViaMicrosoft(cred, fromMailbox, to, cc || [], subject, body_html);
    } else {
      result = await sendViaGoogle(cred, fromMailbox, to, cc || [], subject, body_html);
    }

    // Log sent email as case_item if case_id provided
    if (case_id) {
      await supabase.from("case_items").insert({
        case_id,
        tenant_id: profile.tenant_id,
        type: "email",
        subject,
        from_email: fromMailbox,
        from_name: mailboxes?.[0]?.display_name || "",
        to_emails: to,
        cc_emails: cc || [],
        body_html,
        body_preview: body_html.replace(/<[^>]*>/g, "").substring(0, 200),
        sent_at: new Date().toISOString(),
        created_by: user.id,
      });

      // Update case activity
      await supabase.from("cases").update({
        last_activity_at: new Date().toISOString(),
        status: "in_progress",
      }).eq("id", case_id);
    }

    return new Response(JSON.stringify({ success: true, ...result }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Email send error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function sendViaMicrosoft(cred: any, fromMailbox: string, to: string[], cc: string[], subject: string, bodyHtml: string) {
  let accessToken = cred.access_token_encrypted;

  // Refresh if expired
  if (!cred.token_expires_at || new Date(cred.token_expires_at) <= new Date()) {
    const tenantId = cred.tenant_domain || "common";
    const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: cred.client_id,
        client_secret: cred.client_secret_encrypted,
        refresh_token: cred.refresh_token_encrypted,
        grant_type: "refresh_token",
        scope: "https://graph.microsoft.com/.default",
      }),
    });
    if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
    const data = await res.json();
    accessToken = data.access_token;
  }

  const message = {
    subject,
    body: { contentType: "HTML", content: bodyHtml },
    toRecipients: to.map((email) => ({ emailAddress: { address: email } })),
    ccRecipients: cc.map((email) => ({ emailAddress: { address: email } })),
  };

  const res = await fetch(`https://graph.microsoft.com/v1.0/users/${fromMailbox}/sendMail`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message, saveToSentItems: true }),
  });

  if (!res.ok) {
    const err = await res.text();
    if (res.status === 401) throw new Error("MS_REAUTH");
    throw new Error(`Send failed: ${res.status} - ${err}`);
  }

  // 202 Accepted = success for sendMail
  await res.text();
  return { provider: "microsoft" };
}

async function sendViaGoogle(cred: any, fromMailbox: string, to: string[], cc: string[], subject: string, bodyHtml: string) {
  let accessToken = cred.access_token_encrypted;

  if (!cred.token_expires_at || new Date(cred.token_expires_at) <= new Date()) {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: cred.client_id,
        client_secret: cred.client_secret_encrypted,
        refresh_token: cred.refresh_token_encrypted,
        grant_type: "refresh_token",
      }),
    });
    if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
    const data = await res.json();
    accessToken = data.access_token;
  }

  // Build RFC 2822 message
  const boundary = `boundary_${Date.now()}`;
  const rawParts = [
    `From: ${fromMailbox}`,
    `To: ${to.join(", ")}`,
    ...(cc.length > 0 ? [`Cc: ${cc.join(", ")}`] : []),
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset="UTF-8"`,
    ``,
    bodyHtml,
  ];
  const raw = rawParts.join("\r\n");
  const encoded = btoa(unescape(encodeURIComponent(raw)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/${fromMailbox}/messages/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: encoded }),
  });

  if (!res.ok) {
    const err = await res.text();
    if (res.status === 401) throw new Error("GOOGLE_REAUTH");
    throw new Error(`Send failed: ${res.status} - ${err}`);
  }

  const data = await res.json();
  return { provider: "google", message_id: data.id };
}
