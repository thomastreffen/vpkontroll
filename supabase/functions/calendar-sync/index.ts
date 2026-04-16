import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/* ── Token refresh ── */

async function refreshGoogleToken(cred: any): Promise<string> {
  const clientId = cred.client_id || Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
  const clientSecret = cred.client_secret_encrypted || Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET");
  if (!clientId || !clientSecret || !cred.refresh_token_encrypted) {
    throw new Error("Google credentials incomplete");
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

async function refreshMicrosoftToken(cred: any): Promise<string> {
  if (!cred.client_id || !cred.client_secret_encrypted || !cred.refresh_token_encrypted) {
    throw new Error("Microsoft credentials incomplete");
  }
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
  if (!res.ok) throw new Error(`MS token refresh failed: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

/* ── Google Calendar API ── */

async function createGoogleCalendarEvent(
  accessToken: string, event: any, attendeeEmails: string[]
): Promise<string> {
  const body: any = {
    summary: event.title,
    location: event.address || undefined,
    description: [
      event.customer ? `Kunde: ${event.customer}` : null,
      event.description || null,
    ].filter(Boolean).join("\n"),
    start: { dateTime: event.start_time, timeZone: "Europe/Oslo" },
    end: { dateTime: event.end_time, timeZone: "Europe/Oslo" },
    attendees: attendeeEmails.map((e) => ({ email: e })),
    reminders: { useDefault: true },
  };
  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all",
    { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify(body) },
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Calendar API error ${res.status}: ${err}`);
  }
  return (await res.json()).id;
}

async function updateGoogleCalendarEvent(
  accessToken: string, externalId: string, event: any, attendeeEmails: string[]
): Promise<void> {
  const body: any = {
    summary: event.title,
    location: event.address || undefined,
    description: [
      event.customer ? `Kunde: ${event.customer}` : null,
      event.description || null,
    ].filter(Boolean).join("\n"),
    start: { dateTime: event.start_time, timeZone: "Europe/Oslo" },
    end: { dateTime: event.end_time, timeZone: "Europe/Oslo" },
    attendees: attendeeEmails.map((e) => ({ email: e })),
  };
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${externalId}?sendUpdates=all`,
    { method: "PUT", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify(body) },
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Calendar update error ${res.status}: ${err}`);
  }
  await res.text();
}

async function deleteGoogleCalendarEvent(accessToken: string, externalId: string): Promise<void> {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${externalId}?sendUpdates=all`,
    { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok && res.status !== 404) {
    console.error("Google Calendar delete failed:", await res.text());
  }
  if (res.body) await res.text().catch(() => {});
}

/* ── Microsoft Graph Calendar API ── */

async function createMicrosoftCalendarEvent(
  accessToken: string, event: any, attendeeEmails: string[]
): Promise<string> {
  const body = {
    subject: event.title,
    body: { contentType: "text", content: [event.customer ? `Kunde: ${event.customer}` : null, event.description || null].filter(Boolean).join("\n") },
    start: { dateTime: event.start_time, timeZone: "Europe/Oslo" },
    end: { dateTime: event.end_time, timeZone: "Europe/Oslo" },
    location: event.address ? { displayName: event.address } : undefined,
    attendees: attendeeEmails.map((e) => ({ emailAddress: { address: e }, type: "required" })),
  };
  const res = await fetch("https://graph.microsoft.com/v1.0/me/events", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`MS Calendar API error ${res.status}: ${err}`);
  }
  return (await res.json()).id;
}

/* ── Email notification (fallback when no calendar or as supplement) ── */

async function sendNotificationEmails(
  sb: any, cred: any, mailbox: any, event: any, techEmails: string[], isUpdate: boolean
): Promise<{ sent: number; failed: number }> {
  if (techEmails.length === 0) return { sent: 0, failed: 0 };
  if (!mailbox) return { sent: 0, failed: 0 };

  const startDate = new Date(event.start_time);
  const endDate = new Date(event.end_time);
  const dateStr = startDate.toLocaleDateString("nb-NO", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const timeStr = `${startDate.toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" })} – ${endDate.toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" })}`;

  const subjectLine = isUpdate
    ? `Oppdatert: ${event.title} – ${dateStr}`
    : `Ny oppgave: ${event.title} – ${dateStr}`;

  const bodyHtml = `
    <div style="font-family: -apple-system, sans-serif; max-width: 500px; margin: 0 auto;">
      <h2 style="color: #6D28D9; margin-bottom: 4px;">${isUpdate ? "📝 Oppdatert hendelse" : "📅 Ny planlagt hendelse"}</h2>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px 0; color: #666; width: 100px;">Tittel</td><td style="padding: 8px 0; font-weight: 600;">${event.title}</td></tr>
        <tr><td style="padding: 8px 0; color: #666;">Dato</td><td style="padding: 8px 0;">${dateStr}</td></tr>
        <tr><td style="padding: 8px 0; color: #666;">Tid</td><td style="padding: 8px 0;">${timeStr}</td></tr>
        ${event.customer ? `<tr><td style="padding: 8px 0; color: #666;">Kunde</td><td style="padding: 8px 0;">${event.customer}</td></tr>` : ""}
        ${event.address ? `<tr><td style="padding: 8px 0; color: #666;">Adresse</td><td style="padding: 8px 0;">${event.address}</td></tr>` : ""}
      </table>
      ${event.description ? `<p style="color: #555; border-left: 3px solid #6D28D9; padding-left: 12px; margin: 16px 0;">${event.description}</p>` : ""}
      <p style="color: #999; font-size: 12px; margin-top: 24px;">Sendt fra VPKontroll ressursplanlegger</p>
    </div>
  `;

  let accessToken: string;
  try {
    accessToken = cred.provider === "google"
      ? await refreshGoogleToken(cred)
      : await refreshMicrosoftToken(cred);
  } catch (e) {
    console.error("Token refresh for notification failed:", e);
    return { sent: 0, failed: techEmails.length };
  }

  let sent = 0, failed = 0;

  if (cred.provider === "google") {
    const boundary = `boundary_${Date.now()}`;
    for (const email of techEmails) {
      try {
        const rawParts = [
          `From: ${mailbox.address}`,
          `To: ${email}`,
          `Subject: ${subjectLine}`,
          `MIME-Version: 1.0`,
          `Content-Type: text/html; charset="UTF-8"`,
          ``,
          bodyHtml,
        ];
        const raw = rawParts.join("\r\n");
        const encoded = btoa(unescape(encodeURIComponent(raw)))
          .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
        const res = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/${mailbox.address}/messages/send`,
          { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ raw: encoded }) },
        );
        if (res.ok) { sent++; } else { failed++; console.error(`Gmail send to ${email} failed:`, await res.text()); }
      } catch { failed++; }
    }
  } else {
    // Microsoft
    for (const email of techEmails) {
      try {
        const message = {
          subject: subjectLine,
          body: { contentType: "HTML", content: bodyHtml },
          toRecipients: [{ emailAddress: { address: email } }],
        };
        const res = await fetch(
          `https://graph.microsoft.com/v1.0/users/${mailbox.address}/sendMail`,
          { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ message, saveToSentItems: true }) },
        );
        if (res.ok || res.status === 202) { sent++; } else { failed++; console.error(`MS send to ${email} failed:`, await res.text()); }
      } catch { failed++; }
    }
  }

  return { sent, failed };
}

/* ── Main handler ── */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { event_id, action } = await req.json();
    if (!event_id) {
      return new Response(JSON.stringify({ error: "event_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    // Fetch event
    const { data: event, error: evErr } = await sb
      .from("events").select("*").eq("id", event_id).single();

    if (evErr || !event) {
      return new Response(JSON.stringify({ error: "Event not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle delete action
    if (action === "delete" && event.external_calendar_event_id) {
      const { data: cred } = await sb
        .from("tenant_credentials").select("*")
        .eq("tenant_id", event.tenant_id).eq("status", "connected").limit(1).single();

      if (cred) {
        try {
          if (cred.provider === "google") {
            const token = await refreshGoogleToken(cred);
            await deleteGoogleCalendarEvent(token, event.external_calendar_event_id);
          }
        } catch (e) { console.error("Failed to delete external event:", e); }
      }

      await sb.from("events").update({
        calendar_sync_status: "none",
        external_calendar_event_id: null,
        calendar_sync_error: null,
      }).eq("id", event_id);

      return new Response(JSON.stringify({ ok: true, action: "deleted" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle notify-only action (send email without calendar sync)
    const isNotifyOnly = action === "notify";
    const isUpdate = !!event.external_calendar_event_id || event.notification_status === "sent";

    // Mark as pending
    await sb.from("events").update({ calendar_sync_status: "pending" }).eq("id", event_id);

    // Find tenant credentials
    const { data: cred } = await sb
      .from("tenant_credentials").select("*")
      .eq("tenant_id", event.tenant_id).eq("status", "connected").limit(1).single();

    // Get technician emails
    const { data: eventTechs } = await sb
      .from("event_technicians").select("technician_id").eq("event_id", event_id);

    let attendeeEmails: string[] = [];
    if (eventTechs && eventTechs.length > 0) {
      const techIds = eventTechs.map((et) => et.technician_id);
      const { data: techs } = await sb
        .from("technicians").select("email").in("id", techIds);
      attendeeEmails = (techs || []).map((t) => t.email).filter(Boolean) as string[];
    }

    // Get mailbox for notifications
    const { data: mailbox } = await sb
      .from("mailboxes").select("*")
      .eq("tenant_id", event.tenant_id).eq("is_enabled", true).limit(1).single();

    // If no credentials at all, try email-only notification
    if (!cred) {
      await sb.from("events").update({
        calendar_sync_status: "none",
        calendar_sync_error: "Ingen kalenderintegrasjon konfigurert",
        notification_status: "none",
      }).eq("id", event_id);

      return new Response(JSON.stringify({ ok: false, reason: "no_integration" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let calendarResult: { ok: boolean; externalId?: string } = { ok: false };
    let notifyResult = { sent: 0, failed: 0 };

    // ── Calendar sync (unless notify-only) ──
    if (!isNotifyOnly) {
      try {
        const accessToken = cred.provider === "google"
          ? await refreshGoogleToken(cred)
          : await refreshMicrosoftToken(cred);

        let externalId: string;
        if (event.external_calendar_event_id && cred.provider === "google") {
          await updateGoogleCalendarEvent(accessToken, event.external_calendar_event_id, event, attendeeEmails);
          externalId = event.external_calendar_event_id;
        } else if (cred.provider === "google") {
          externalId = await createGoogleCalendarEvent(accessToken, event, attendeeEmails);
        } else {
          externalId = await createMicrosoftCalendarEvent(accessToken, event, attendeeEmails);
        }

        calendarResult = { ok: true, externalId };

        await sb.from("events").update({
          calendar_sync_status: "synced",
          external_calendar_event_id: externalId,
          calendar_sync_error: null,
        }).eq("id", event_id);
      } catch (syncErr: any) {
        console.error("Calendar sync failed:", syncErr);
        await sb.from("events").update({
          calendar_sync_status: "failed",
          calendar_sync_error: syncErr.message?.substring(0, 500) || "Ukjent feil",
        }).eq("id", event_id);
      }
    }

    // ── Email notification (always attempt if techs have emails) ──
    if (attendeeEmails.length > 0 && mailbox) {
      notifyResult = await sendNotificationEmails(sb, cred, mailbox, event, attendeeEmails, isUpdate);

      const notifStatus = notifyResult.failed === 0 && notifyResult.sent > 0
        ? "sent"
        : notifyResult.sent > 0 ? "partial" : "failed";

      await sb.from("events").update({
        notification_status: notifStatus,
        notified_at: notifyResult.sent > 0 ? new Date().toISOString() : event.notified_at,
      }).eq("id", event_id);

      // Log notification
      await sb.from("event_logs").insert({
        event_id: event_id,
        tenant_id: event.tenant_id,
        action: "notification_sent",
        details: {
          emails: attendeeEmails,
          sent: notifyResult.sent,
          failed: notifyResult.failed,
          is_update: isUpdate,
          calendar_synced: calendarResult.ok,
        },
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        calendar: calendarResult.ok ? "synced" : "failed",
        notification: { sent: notifyResult.sent, failed: notifyResult.failed },
        provider: cred.provider,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("calendar-sync error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
