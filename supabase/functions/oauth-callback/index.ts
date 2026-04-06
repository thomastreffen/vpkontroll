import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const stateParam = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      const errorDesc = url.searchParams.get("error_description") || error;
      return htmlResponse(`
        <h1>Tilkobling avbrutt</h1>
        <p>${escapeHtml(errorDesc)}</p>
        <p>Du kan lukke dette vinduet.</p>
        <script>window.opener?.postMessage({ type: 'oauth-error', error: ${JSON.stringify(errorDesc)} }, '*'); window.close();</script>
      `);
    }

    if (!code || !stateParam) {
      return htmlResponse(`<h1>Ugyldig forespørsel</h1><p>Mangler code eller state.</p>`);
    }

    let credentialId: string;
    try {
      const parsed = JSON.parse(atob(stateParam));
      credentialId = parsed.credential_id;
    } catch {
      return htmlResponse(`<h1>Ugyldig state</h1>`);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: cred, error: credErr } = await supabase
      .from("tenant_credentials")
      .select("*")
      .eq("id", credentialId)
      .single();

    if (credErr || !cred) {
      return htmlResponse(`<h1>Credential ikke funnet</h1>`);
    }

    const redirectUri = `${supabaseUrl}/functions/v1/oauth-callback`;

    // Exchange code for tokens
    let tokenData: any;

    if (cred.provider === "microsoft") {
      const tenantId = cred.tenant_domain || "common";
      const tokenRes = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: cred.client_id!,
          client_secret: cred.client_secret_encrypted!,
          code,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });
      tokenData = await tokenRes.json();
    } else if (cred.provider === "google") {
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: cred.client_id!,
          client_secret: cred.client_secret_encrypted!,
          code,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });
      tokenData = await tokenRes.json();
    } else {
      return htmlResponse(`<h1>Ukjent provider</h1>`);
    }

    if (tokenData.error) {
      console.error("Token exchange error:", tokenData);
      return htmlResponse(`
        <h1>Token-feil</h1>
        <p>${escapeHtml(tokenData.error_description || tokenData.error)}</p>
        <script>window.opener?.postMessage({ type: 'oauth-error', error: 'token_exchange_failed' }, '*'); window.close();</script>
      `);
    }

    // Store tokens
    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : null;

    const { error: updateErr } = await supabase
      .from("tenant_credentials")
      .update({
        access_token_encrypted: tokenData.access_token,
        refresh_token_encrypted: tokenData.refresh_token || cred.refresh_token_encrypted,
        token_expires_at: expiresAt,
        status: "connected",
        last_verified_at: new Date().toISOString(),
      })
      .eq("id", credentialId);

    if (updateErr) {
      console.error("DB update error:", updateErr);
      return htmlResponse(`<h1>Lagringsfeil</h1><p>Kunne ikke lagre tokens.</p>`);
    }

    return htmlResponse(`
      <h1>✅ Tilkobling vellykket!</h1>
      <p>Du kan lukke dette vinduet og gå tilbake til VarmePumpe.</p>
      <script>window.opener?.postMessage({ type: 'oauth-success' }, '*'); setTimeout(() => window.close(), 2000);</script>
    `);
  } catch (err) {
    console.error("oauth-callback error:", err);
    return htmlResponse(`<h1>Serverfeil</h1><p>${escapeHtml((err as Error).message)}</p>`);
  }
});

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function htmlResponse(body: string): Response {
  return new Response(
    `<!DOCTYPE html>
<html lang="no">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>OAuth — VarmePumpe</title>
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8fafc;color:#1e293b}div{text-align:center;max-width:480px;padding:2rem}h1{font-size:1.25rem}p{color:#64748b;font-size:0.875rem}</style>
</head>
<body><div>${body}</div></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}
