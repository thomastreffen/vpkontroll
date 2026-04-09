import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FIELD_TYPES = [
  "section_header", "text", "textarea", "checkbox", "checkbox_list",
  "dropdown", "number", "date", "rating", "measurement", "file",
];

const CATEGORIES: Record<string, string> = {
  service: "Servicebesøk på varmepumpe. Kontrollpunkter, målinger (trykk, temperatur), filter, kuldemedium, anbefalinger.",
  installation: "Installasjonsjobb for varmepumpe. Montering, serienummer, vakuumtest, trykktest, idriftsettelse, kundeoverlevering, bilder.",
  inspection: "Befaring for varmepumpeinstallasjon. Byggtype, eksisterende oppvarming, plasseringsvurdering, kapasitetsbehov, anbefalt løsning, bilder.",
  crm: "Salgsoppfølging/CRM. Kundebehov, budsjett, beslutningstaker, konkurrent, tilbud, oppfølgingsdato, neste steg.",
  web: "Nettskjema/henvendelse. Kontaktinfo (navn, telefon, e-post), henvendelsestype, beskrivelse, samtykke.",
  warranty: "Garanti/reklamasjon. Produkt, serienummer, kjøpsdato, feilbeskrivelse, bilder, intern vurdering, beslutning.",
};

const REVIEW_EXPECTATIONS: Record<string, string> = {
  service: `Forvent: sjekkpunkter (filter, kondens, kuldemedium, elektrisk), målinger (trykk bar, temperatur °C), tiltak/anbefaling-seksjon. Typisk 3-6 seksjoner.`,
  installation: `Forvent: montering, test/idriftsettelse (vakuumtest, trykktest, elektrisk kontroll), serienummer (inne/ute), kundeoverlevering, bilder før/etter. Typisk 4-5 seksjoner.`,
  inspection: `Forvent: kunde/sted-info, eksisterende oppvarming, tekniske observasjoner (plassering inne/ute, tilkomst), anbefalt løsning, estimert kapasitet, bilder/vedlegg.`,
  crm: `Forvent: kundebehov, budsjettavklaring, beslutningstaker, konkurrenter, neste steg, oppfølgingsdato, sannsynlighetsvurdering.`,
  web: `Forvent: kontaktdata (navn, e-post, telefon), henvendelsestype, beskrivelse, enkelhet, eventuelt samtykke. Skjemaet bør være kort og brukervennlig.`,
  warranty: `Forvent: feilbeskrivelse, produktinfo (modell, serienummer), kjøpsdato, dokumentasjon/bilder, intern vurdering, beslutning/tiltak.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, category, mode, existingFields } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const categoryContext = CATEGORIES[category] || CATEGORIES.service;

    // ── Review mode: return structured suggestions ──
    if (mode === "review" && existingFields) {
      const reviewExpectations = REVIEW_EXPECTATIONS[category] || REVIEW_EXPECTATIONS.service;

      const reviewSystemPrompt = `Du er en ekspert på skjemadesign for varmepumpebransjen i Norge.
Du skal kvalitetssjekke et eksisterende skjema og gi konkrete, handlingsrettede forbedringsforslag.

Bruksområde: ${categoryContext}
${reviewExpectations}

Analyser skjemaet og returner forslag via tool-kallet. Hver anbefaling skal ha:
- type: "add_field" (manglende felt), "move_field" (felt i feil seksjon), "add_section" (manglende seksjon), "improve_label" (utydeleg label), "remove_field" (unødvendig felt), "general" (generelt råd)
- message: kort norsk beskrivelse av problemet/forslaget
- field_type: hvis type er add_field, hvilken felttype
- field_key: slug for feltet
- label: label for feltet
- unit: eventuell enhet
- help_text: hjelpetekst
- target_section: hvilken seksjon feltet bør ligge i
- options: valgalternativer for dropdown/checkbox_list
- severity: "high" (viktig mangler), "medium" (bør forbedres), "low" (nice-to-have)

Vurder:
1. Mangler viktige felt for dette bruksområdet?
2. Er seksjonene logiske og godt navngitt?
3. Er felt plassert i riktig seksjon?
4. Er labels tydelige og faglig korrekte?
5. Er målinger med riktige enheter?
6. Er skjemaet for tynt eller for tungt?
7. Passer skjemaet til valgt bruksområde?

Gi 3-10 konkrete forslag. Prioriter de viktigste først.`;

      const fieldsDescription = existingFields.map((f: any) => ({
        type: f.field_type, label: f.label, key: f.field_key,
        unit: f.unit, help_text: f.help_text, options: f.options,
      }));

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: reviewSystemPrompt },
            { role: "user", content: `Skjemaet har disse feltene:\n${JSON.stringify(fieldsDescription, null, 2)}\n\nKvalitetssjekk dette skjemaet og gi forbedringsforslag.` },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "review_template",
                description: "Return quality review suggestions for a form template",
                parameters: {
                  type: "object",
                  properties: {
                    summary: { type: "string", description: "Kort oppsummering av skjemaets kvalitet (1-2 setninger)" },
                    suggestions: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          type: { type: "string", enum: ["add_field", "move_field", "add_section", "improve_label", "remove_field", "general"] },
                          severity: { type: "string", enum: ["high", "medium", "low"] },
                          message: { type: "string" },
                          field_type: { type: "string", enum: FIELD_TYPES },
                          field_key: { type: "string" },
                          label: { type: "string" },
                          unit: { type: "string" },
                          help_text: { type: "string" },
                          target_section: { type: "string" },
                          options: {
                            type: "object",
                            properties: { choices: { type: "array", items: { type: "string" } } },
                          },
                        },
                        required: ["type", "severity", "message"],
                      },
                    },
                  },
                  required: ["summary", "suggestions"],
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "review_template" } },
        }),
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 429) return new Response(JSON.stringify({ error: "For mange forespørsler. Prøv igjen om litt." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (status === 402) return new Response(JSON.stringify({ error: "AI-kreditter brukt opp." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        console.error("AI gateway error:", status, await response.text());
        return new Response(JSON.stringify({ error: "Kunne ikke analysere skjema" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall?.function?.arguments) {
        return new Response(JSON.stringify({ error: "Ingen analyse generert" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const parsed = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify({ review: parsed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Generate / Improve / Cleanup modes (existing) ──
    let systemPrompt = `Du er en ekspert på skjemadesign for varmepumpebransjen i Norge.
Du genererer skjemastrukturer som JSON.

Bruksområde: ${categoryContext}

Regler:
- Generer realistiske, faglige seksjoner og felt for varmepumpebransjen
- Bruk norsk språk for alle labels og hjelpetekster
- Hver seksjon starter med et section_header-felt
- Bruk passende felttyper: ${FIELD_TYPES.join(", ")}
- For measurement-felt: inkluder unit (bar, °C, kW, etc.)
- For dropdown/checkbox_list: inkluder options.choices array
- Generer 3-6 seksjoner med 2-8 felt per seksjon
- field_key skal være slugified versjon av label (lowercase, underscore)
- Returner kun tool-kallet, ingen annen tekst`;

    let userPrompt = "";

    if (mode === "improve" && existingFields) {
      userPrompt = `Eksisterende felt i malen:\n${JSON.stringify(existingFields.map((f: any) => ({ type: f.field_type, label: f.label })))}\n\nForeslå ytterligere relevante felt som mangler. Behold eksisterende felt og legg til nye. Brukerbeskrivelse: ${prompt || "Forbedre malen"}`;
    } else if (mode === "cleanup" && existingFields) {
      userPrompt = `Eksisterende felt i malen:\n${JSON.stringify(existingFields.map((f: any) => ({ type: f.field_type, label: f.label, section: f.help_text })))}\n\nReorganiser feltene i bedre seksjoner med mer logisk rekkefølge. Behold alle felt men forbedre strukturen. Brukerbeskrivelse: ${prompt || "Rydd opp i strukturen"}`;
    } else {
      userPrompt = prompt || `Lag et standard skjema for ${categoryContext}`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_template",
              description: "Generate a form template with sections and fields",
              parameters: {
                type: "object",
                properties: {
                  fields: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        field_type: { type: "string", enum: FIELD_TYPES },
                        field_key: { type: "string" },
                        label: { type: "string" },
                        unit: { type: "string" },
                        help_text: { type: "string" },
                        is_required: { type: "boolean" },
                        options: {
                          type: "object",
                          properties: { choices: { type: "array", items: { type: "string" } } },
                        },
                      },
                      required: ["field_type", "field_key", "label"],
                    },
                  },
                },
                required: ["fields"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_template" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "For mange forespørsler. Prøv igjen om litt." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "AI-kreditter brukt opp." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      console.error("AI gateway error:", status, await response.text());
      return new Response(JSON.stringify({ error: "Kunne ikke generere forslag" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "Ingen forslag generert" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    const fields = (parsed.fields || []).map((f: any, i: number) => ({
      field_type: f.field_type || "text",
      field_key: f.field_key || `field_${i}`,
      label: f.label || "",
      unit: f.unit || "",
      help_text: f.help_text || "",
      is_required: f.is_required || false,
      default_value: null,
      options: f.options || null,
      sort_order: i,
    }));

    return new Response(JSON.stringify({ fields }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("template-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Ukjent feil" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
