import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TenantCredential {
  id: string;
  tenant_id: string;
  provider: "microsoft" | "google";
  client_id: string | null;
  client_secret_encrypted: string | null;
  access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
  token_expires_at: string | null;
  tenant_domain: string | null;
  scopes: any;
  status: string;
  last_sync_at: string | null;
  sync_cursor: string | null;
}

interface EmailMessage {
  id: string;
  subject: string;
  from_email: string;
  from_name: string;
  to_emails: string[];
  cc_emails: string[];
  body_preview: string;
  body_html: string;
  body_text: string;
  received_at: string;
  internet_message_id: string;
  has_attachments: boolean;
  attachments_meta: any[];
}

// ─── Microsoft Graph Provider ─────────────────
async function refreshMicrosoftToken(cred: TenantCredential): Promise<string> {
  if (!cred.client_id || !cred.client_secret_encrypted || !cred.refresh_token_encrypted) {
    throw new Error("Microsoft credentials incomplete");
  }

  // Check if token is still valid
  if (cred.token_expires_at && new Date(cred.token_expires_at) > new Date()) {
    return cred.access_token_encrypted!;
  }

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

  if (!res.ok) {
    const err = await res.text();
    console.error("Microsoft token refresh failed:", err);
    throw new Error(`Microsoft token refresh failed: ${res.status}`);
  }

  const data = await res.json();
  return data.access_token;
}

async function fetchMicrosoftEmails(accessToken: string, mailbox: string, cursor?: string): Promise<{ messages: EmailMessage[]; nextCursor?: string }> {
  let url = `https://graph.microsoft.com/v1.0/users/${mailbox}/messages?$top=50&$orderby=receivedDateTime desc&$select=id,subject,from,toRecipients,ccRecipients,bodyPreview,body,receivedDateTime,internetMessageId,hasAttachments`;
  
  if (cursor) {
    url += `&$filter=receivedDateTime gt ${cursor}`;
  }

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Microsoft Graph fetch failed:", err);
    if (res.status === 401) throw new Error("MS_REAUTH");
    throw new Error(`Graph API error: ${res.status}`);
  }

  const data = await res.json();
  const messages: EmailMessage[] = (data.value || []).map((m: any) => ({
    id: m.id,
    subject: m.subject || "",
    from_email: m.from?.emailAddress?.address || "",
    from_name: m.from?.emailAddress?.name || "",
    to_emails: (m.toRecipients || []).map((r: any) => r.emailAddress?.address).filter(Boolean),
    cc_emails: (m.ccRecipients || []).map((r: any) => r.emailAddress?.address).filter(Boolean),
    body_preview: m.bodyPreview || "",
    body_html: m.body?.contentType === "html" ? m.body?.content || "" : "",
    body_text: m.body?.contentType === "text" ? m.body?.content || "" : "",
    received_at: m.receivedDateTime,
    internet_message_id: m.internetMessageId || "",
    has_attachments: m.hasAttachments || false,
    attachments_meta: [],
  }));

  return { messages, nextCursor: data["@odata.nextLink"] ? undefined : undefined };
}

// ─── Google Gmail Provider ─────────────────
async function refreshGoogleToken(cred: TenantCredential): Promise<string> {
  // Use per-tenant credentials if available, otherwise fall back to central/shared OAuth keys
  const clientId = cred.client_id || Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
  const clientSecret = cred.client_secret_encrypted || Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET");

  if (!clientId || !clientSecret || !cred.refresh_token_encrypted) {
    throw new Error("Google credentials incomplete: missing " +
      (!clientId ? "client_id " : "") +
      (!clientSecret ? "client_secret " : "") +
      (!cred.refresh_token_encrypted ? "refresh_token" : ""));
  }

  if (cred.token_expires_at && new Date(cred.token_expires_at) > new Date()) {
    return cred.access_token_encrypted!;
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: cred.refresh_token_encrypted,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Google token refresh failed:", err);
    throw new Error(`Google token refresh failed: ${res.status}`);
  }

  const data = await res.json();
  return data.access_token;
}

async function fetchGoogleEmails(accessToken: string, _mailbox: string, cursor?: string): Promise<{ messages: EmailMessage[] }> {
  // Gmail OAuth tokens are scoped to the authenticated user — always use "me"
  let listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50`;
  if (cursor) {
    listUrl += `&q=after:${Math.floor(new Date(cursor).getTime() / 1000)}`;
  }

  const listRes = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!listRes.ok) {
    const err = await listRes.text();
    if (listRes.status === 401) throw new Error("GOOGLE_REAUTH");
    throw new Error(`Gmail API error: ${listRes.status} - ${err}`);
  }

  const listData = await listRes.json();
  const messageIds: string[] = (listData.messages || []).map((m: any) => m.id);

  if (messageIds.length === 0) return { messages: [] };

  // Fetch each message (batch in parallel, max 10 at a time)
  const messages: EmailMessage[] = [];
  const batchSize = 10;
  for (let i = 0; i < messageIds.length; i += batchSize) {
    const batch = messageIds.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (msgId) => {
        const res = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}?format=full`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (!res.ok) { await res.text(); return null; }
        return res.json();
      })
    );

    for (const msg of batchResults) {
      if (!msg) continue;
      const headers = msg.payload?.headers || [];
      const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || "";
      
      const fromRaw = getHeader("From");
      const fromMatch = fromRaw.match(/^(?:"?([^"]*)"?\s)?<?([^>]+)>?$/);
      
      // Decode body
      let bodyHtml = "";
      let bodyText = "";
      const decodePart = (part: any) => {
        if (part.mimeType === "text/html" && part.body?.data) {
          bodyHtml = atob(part.body.data.replace(/-/g, "+").replace(/_/g, "/"));
        } else if (part.mimeType === "text/plain" && part.body?.data) {
          bodyText = atob(part.body.data.replace(/-/g, "+").replace(/_/g, "/"));
        }
        if (part.parts) part.parts.forEach(decodePart);
      };
      if (msg.payload) decodePart(msg.payload);

      messages.push({
        id: msg.id,
        subject: getHeader("Subject"),
        from_email: fromMatch?.[2] || fromRaw,
        from_name: fromMatch?.[1] || "",
        to_emails: getHeader("To").split(",").map((e: string) => e.trim()).filter(Boolean),
        cc_emails: getHeader("Cc").split(",").map((e: string) => e.trim()).filter(Boolean),
        body_preview: (bodyText || bodyHtml).substring(0, 200),
        body_html: bodyHtml,
        body_text: bodyText,
        received_at: new Date(parseInt(msg.internalDate)).toISOString(),
        internet_message_id: getHeader("Message-ID"),
        has_attachments: (msg.payload?.parts || []).some((p: any) => p.filename && p.filename.length > 0),
        attachments_meta: [],
      });
    }
  }

  return { messages };
}

// ─── Main Handler ─────────────────────────────
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !serviceKey || !anonKey) {
      console.error("Missing env vars", { hasUrl: !!supabaseUrl, hasKey: !!serviceKey, hasAnon: !!anonKey });
      return new Response(JSON.stringify({ error: "Server-konfigurasjon mangler. Kontakt support." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Get user from token
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's tenant
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("user_id", user.id)
      .single();

    if (!profile?.tenant_id) {
      return new Response(JSON.stringify({ error: "No tenant found" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tenantId = profile.tenant_id;

    // Get credentials for this tenant
    const { data: credentials } = await supabase
      .from("tenant_credentials")
      .select("*")
      .eq("tenant_id", tenantId)
      .in("status", ["connected", "pending"]);

    if (!credentials || credentials.length === 0) {
      return new Response(JSON.stringify({ error: "No credentials configured", new_cases: 0, new_items: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get mailboxes for this tenant
    const { data: mailboxes } = await supabase
      .from("mailboxes")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("is_enabled", true);

    if (!mailboxes || mailboxes.length === 0) {
      return new Response(JSON.stringify({ error: "No mailboxes configured", new_cases: 0, new_items: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalNewCases = 0;
    let totalNewItems = 0;
    let msReauth = false;

    for (const mailbox of mailboxes) {
      const cred = credentials.find((c: any) => c.provider === mailbox.provider);
      if (!cred) continue;

      try {
        let accessToken: string;
        let messages: EmailMessage[];

        // Use the later of last_sync_at or mailbox.sync_from as the cursor
        // This prevents importing emails from before the mailbox was activated
        const syncFloor = mailbox.sync_from || new Date().toISOString();
        const cursor = cred.last_sync_at && new Date(cred.last_sync_at) > new Date(syncFloor)
          ? cred.last_sync_at
          : syncFloor;

        console.log(`Syncing mailbox ${mailbox.address} from cursor: ${cursor} (sync_from: ${syncFloor}, last_sync: ${cred.last_sync_at})`);

        if (cred.provider === "microsoft") {
          accessToken = await refreshMicrosoftToken(cred as unknown as TenantCredential);
          const result = await fetchMicrosoftEmails(accessToken, mailbox.address, cursor);
          messages = result.messages;
        } else {
          accessToken = await refreshGoogleToken(cred as unknown as TenantCredential);
          const result = await fetchGoogleEmails(accessToken, mailbox.address, cursor);
          messages = result.messages;
        }

        // Update token in credentials
        await supabase
          .from("tenant_credentials")
          .update({
            access_token_encrypted: accessToken,
            token_expires_at: new Date(Date.now() + 3500 * 1000).toISOString(),
            last_sync_at: new Date().toISOString(),
            status: "connected",
          })
          .eq("id", cred.id);

        // Process messages: check for duplicates and create cases/items
        for (const msg of messages) {
          // Skip if already imported
          const { data: existing } = await supabase
            .from("case_items")
            .select("id")
            .eq("tenant_id", tenantId)
            .eq("internet_message_id", msg.internet_message_id)
            .limit(1);

          if (existing && existing.length > 0) continue;

          // Try to find existing case by email thread (same sender)
          const { data: existingCases } = await supabase
            .from("cases")
            .select("id")
            .eq("tenant_id", tenantId)
            .eq("customer_email", msg.from_email)
            .not("status", "in", '("closed","archived","converted")')
            .order("created_at", { ascending: false })
            .limit(1);

          let caseId: string;

          if (existingCases && existingCases.length > 0) {
            caseId = existingCases[0].id;
            // Update case activity
            await supabase.from("cases").update({
              last_activity_at: msg.received_at,
              title: msg.subject || "(Uten emne)",
            }).eq("id", caseId);
          } else {
            // Create new case
            const { data: newCase, error: caseErr } = await supabase
              .from("cases")
              .insert({
                tenant_id: tenantId,
                case_number: "TEMP",
                title: msg.subject || "(Uten emne)",
                status: "new",
                priority: "normal",
                mailbox_address: mailbox.address,
                customer_name: msg.from_name,
                customer_email: msg.from_email,
                last_activity_at: msg.received_at,
              })
              .select("id")
              .single();

            if (caseErr || !newCase) {
              console.error("Failed to create case:", caseErr);
              continue;
            }
            caseId = newCase.id;
            totalNewCases++;
          }

          // Insert case item
          await supabase.from("case_items").insert({
            case_id: caseId,
            tenant_id: tenantId,
            type: "email",
            subject: msg.subject,
            from_email: msg.from_email,
            from_name: msg.from_name,
            to_emails: msg.to_emails,
            cc_emails: msg.cc_emails,
            body_preview: msg.body_preview,
            body_html: msg.body_html,
            body_text: msg.body_text,
            received_at: msg.received_at,
            internet_message_id: msg.internet_message_id,
            attachments_meta: msg.attachments_meta,
          });
          totalNewItems++;
        }
      } catch (err: any) {
        if (err.message === "MS_REAUTH") {
          msReauth = true;
          await supabase.from("tenant_credentials").update({ status: "error" }).eq("id", cred.id);
        } else if (err.message === "GOOGLE_REAUTH") {
          await supabase.from("tenant_credentials").update({ status: "error" }).eq("id", cred.id);
        } else {
          console.error(`Sync error for mailbox ${mailbox.address}:`, err);
        }
      }
    }

    return new Response(JSON.stringify({
      new_cases: totalNewCases,
      new_items: totalNewItems,
      ms_reauth: msReauth,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Inbox sync error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
