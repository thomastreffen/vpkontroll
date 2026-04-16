import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/* ── Token refresh (shared with inbox-sync pattern) ── */

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
  accessToken: string,
  event: any,
  attendeeEmails: string[],
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
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("Google Calendar create failed:", err);
    throw new Error(`Google Calendar API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.id; // external calendar event id
}

async function updateGoogleCalendarEvent(
  accessToken: string,
  externalId: string,
  event: any,
  attendeeEmails: string[],
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
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("Google Calendar update failed:", err);
    throw new Error(`Google Calendar update error ${res.status}: ${err}`);
  }
  await res.text(); // consume body
}

async function deleteGoogleCalendarEvent(
  accessToken: string,
  externalId: string,
): Promise<void> {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${externalId}?sendUpdates=all`,
    { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok && res.status !== 404) {
    const err = await res.text();
    console.error("Google Calendar delete failed:", err);
  }
  if (res.body) await res.text().catch(() => {});
}

/* ── Microsoft Graph Calendar API ── */

async function createMicrosoftCalendarEvent(
  accessToken: string,
  event: any,
  attendeeEmails: string[],
): Promise<string> {
  const body = {
    subject: event.title,
    body: {
      contentType: "text",
      content: [
        event.customer ? `Kunde: ${event.customer}` : null,
        event.description || null,
      ].filter(Boolean).join("\n"),
    },
    start: { dateTime: event.start_time, timeZone: "Europe/Oslo" },
    end: { dateTime: event.end_time, timeZone: "Europe/Oslo" },
    location: event.address ? { displayName: event.address } : undefined,
    attendees: attendeeEmails.map((e) => ({
      emailAddress: { address: e },
      type: "required",
    })),
  };

  const res = await fetch("https://graph.microsoft.com/v1.0/me/events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`MS Calendar API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.id;
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
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    // Fetch event
    const { data: event, error: evErr } = await sb
      .from("events")
      .select("*")
      .eq("id", event_id)
      .single();

    if (evErr || !event) {
      return new Response(JSON.stringify({ error: "Event not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle delete action
    if (action === "delete" && event.external_calendar_event_id) {
      const { data: cred } = await sb
        .from("tenant_credentials")
        .select("*")
        .eq("tenant_id", event.tenant_id)
        .eq("status", "active")
        .limit(1)
        .single();

      if (cred) {
        try {
          if (cred.provider === "google") {
            const token = await refreshGoogleToken(cred);
            await deleteGoogleCalendarEvent(token, event.external_calendar_event_id);
          }
          // Microsoft delete can be added similarly
        } catch (e) {
          console.error("Failed to delete external event:", e);
        }
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

    // Mark as pending
    await sb.from("events").update({ calendar_sync_status: "pending" }).eq("id", event_id);

    // Find tenant credentials (Google or Microsoft)
    const { data: cred } = await sb
      .from("tenant_credentials")
      .select("*")
      .eq("tenant_id", event.tenant_id)
      .eq("status", "active")
      .limit(1)
      .single();

    if (!cred) {
      await sb.from("events").update({
        calendar_sync_status: "none",
        calendar_sync_error: "Ingen kalenderintegrasjon konfigurert",
      }).eq("id", event_id);

      return new Response(JSON.stringify({ ok: false, reason: "no_integration" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get technician emails for attendees
    const { data: eventTechs } = await sb
      .from("event_technicians")
      .select("technician_id")
      .eq("event_id", event_id);

    let attendeeEmails: string[] = [];
    if (eventTechs && eventTechs.length > 0) {
      const techIds = eventTechs.map((et) => et.technician_id);
      const { data: techs } = await sb
        .from("technicians")
        .select("email")
        .in("id", techIds);

      attendeeEmails = (techs || [])
        .map((t) => t.email)
        .filter(Boolean) as string[];
    }

    // Push to calendar
    let externalId: string;
    try {
      const accessToken = cred.provider === "google"
        ? await refreshGoogleToken(cred)
        : await refreshMicrosoftToken(cred);

      if (event.external_calendar_event_id && cred.provider === "google") {
        // Update existing
        await updateGoogleCalendarEvent(
          accessToken,
          event.external_calendar_event_id,
          event,
          attendeeEmails,
        );
        externalId = event.external_calendar_event_id;
      } else if (cred.provider === "google") {
        externalId = await createGoogleCalendarEvent(accessToken, event, attendeeEmails);
      } else {
        externalId = await createMicrosoftCalendarEvent(accessToken, event, attendeeEmails);
      }

      await sb.from("events").update({
        calendar_sync_status: "synced",
        external_calendar_event_id: externalId,
        calendar_sync_error: null,
      }).eq("id", event_id);

      return new Response(
        JSON.stringify({ ok: true, external_id: externalId, provider: cred.provider }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch (syncErr: any) {
      console.error("Calendar sync failed:", syncErr);
      await sb.from("events").update({
        calendar_sync_status: "failed",
        calendar_sync_error: syncErr.message?.substring(0, 500) || "Ukjent feil",
      }).eq("id", event_id);

      return new Response(
        JSON.stringify({ ok: false, error: syncErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  } catch (err: any) {
    console.error("calendar-sync error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
