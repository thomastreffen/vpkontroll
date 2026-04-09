import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { publish_key, payload, source_url } = await req.json();
    if (!publish_key || !payload) {
      return new Response(JSON.stringify({ error: "Missing publish_key or payload" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceRoleKey);

    // 1. Look up published template
    const { data: template, error: tErr } = await sb
      .from("service_templates")
      .select("id, tenant_id, web_form_type, success_message, name")
      .eq("publish_key", publish_key)
      .eq("is_published", true)
      .single();

    if (tErr || !template) {
      return new Response(JSON.stringify({ error: "Form not found or not published" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tenantId = template.tenant_id;
    const formType = template.web_form_type || "general";

    // 2. Extract contact info from payload
    const email = payload.e_post || payload.epost || payload.email || null;
    const phone = payload.telefon || payload.phone || payload.mobil || null;
    const name = payload.navn || payload.name || payload.full_name || null;
    const firstName = name ? name.split(" ")[0] : null;
    const lastName = name ? name.split(" ").slice(1).join(" ") || null : null;

    // 3. Match or create contact
    let contactId: string | null = null;
    let companyId: string | null = null;

    if (email) {
      const { data: existing } = await sb
        .from("crm_contacts")
        .select("id, company_id")
        .eq("tenant_id", tenantId)
        .eq("email", email)
        .is("deleted_at", null)
        .limit(1)
        .maybeSingle();

      if (existing) {
        contactId = existing.id;
        companyId = existing.company_id;
      }
    }

    if (!contactId && (firstName || email)) {
      const { data: newContact } = await sb
        .from("crm_contacts")
        .insert({
          tenant_id: tenantId,
          first_name: firstName || email || "Ukjent",
          last_name: lastName,
          email,
          phone,
          mobile: phone,
        })
        .select("id")
        .single();
      if (newContact) contactId = newContact.id;
    }

    // 4. Route based on form type
    let createdCaseId: string | null = null;
    let createdDealId: string | null = null;

    if (formType === "contact" || formType === "service" || formType === "general") {
      // Create case in Postkontoret
      const caseTitle =
        formType === "service"
          ? `Serviceforespørsel: ${name || email || "Nettskjema"}`
          : formType === "contact"
          ? `Kontaktskjema: ${name || email || "Nettskjema"}`
          : `Henvendelse: ${name || email || "Nettskjema"}`;

      const { data: newCase } = await sb
        .from("cases")
        .insert({
          tenant_id: tenantId,
          case_number: "pending",
          title: caseTitle,
          status: "new",
          priority: "normal",
          customer_name: name,
          customer_email: email,
          company_id: companyId,
        })
        .select("id")
        .single();
      if (newCase) createdCaseId = newCase.id;
    } else if (formType === "quote" || formType === "site_visit") {
      // Create deal in CRM
      const dealTitle =
        formType === "quote"
          ? `Prisforespørsel: ${name || email || "Nettskjema"}`
          : `Befaringsbestilling: ${name || email || "Nettskjema"}`;

      const stage = formType === "site_visit" ? "qualified" : "lead";

      const { data: newDeal } = await sb
        .from("crm_deals")
        .insert({
          tenant_id: tenantId,
          title: dealTitle,
          stage,
          company_id: companyId,
          contact_id: contactId,
        })
        .select("id")
        .single();
      if (newDeal) createdDealId = newDeal.id;
    }

    // 5. Save submission
    await sb.from("form_submissions").insert({
      template_id: template.id,
      tenant_id: tenantId,
      payload,
      source_url: source_url || null,
      web_form_type: formType,
      created_case_id: createdCaseId,
      created_deal_id: createdDealId,
      created_company_id: companyId,
      created_contact_id: contactId,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: template.success_message || "Takk for din henvendelse!",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("form-submit error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
