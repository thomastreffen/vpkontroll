import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import { DynamicFormRenderer, type TemplateField } from "@/components/service/DynamicFormRenderer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

// Use anon client without auth for public access
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const anonClient = createClient(supabaseUrl, supabaseAnonKey);

export default function PublicFormPage() {
  const { publishKey } = useParams<{ publishKey: string }>();
  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState<any>(null);
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [values, setValues] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!publishKey) return;
    (async () => {
      const { data: tmpl, error: tErr } = await anonClient
        .from("service_templates")
        .select("*")
        .eq("publish_key", publishKey)
        .eq("is_published", true)
        .single();

      if (tErr || !tmpl) {
        setError("Skjemaet ble ikke funnet eller er ikke lenger tilgjengelig.");
        setLoading(false);
        return;
      }
      setTemplate(tmpl);

      const { data: fieldData } = await anonClient
        .from("service_template_fields")
        .select("*")
        .eq("template_id", tmpl.id)
        .order("sort_order");

      setFields(
        (fieldData || []).map((f: any) => ({
          id: f.id,
          field_type: f.field_type,
          field_key: f.field_key || f.id,
          label: f.label,
          unit: f.unit || "",
          help_text: f.help_text || "",
          is_required: f.is_required || false,
          default_value: f.default_value,
          options: f.options,
          sort_order: f.sort_order,
        }))
      );
      setLoading(false);
    })();
  }, [publishKey]);

  const handleSubmit = async () => {
    // Validate required fields
    const requiredFields = fields.filter(f => f.is_required && f.field_type !== "section_header");
    for (const f of requiredFields) {
      const key = f.field_key || f.id;
      const val = values[key];
      if (val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0)) {
        setError(`Feltet "${f.label}" er påkrevd.`);
        return;
      }
    }
    setError(null);
    setSubmitting(true);

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/form-submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: supabaseAnonKey,
          },
          body: JSON.stringify({
            publish_key: publishKey,
            payload: values,
            source_url: window.location.href,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Innsending feilet");
      setSuccessMessage(data.message || "Takk for din henvendelse!");
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Noe gikk galt. Prøv igjen.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full p-8 text-center space-y-4">
          <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
          <h1 className="text-xl font-semibold">Sendt!</h1>
          <p className="text-muted-foreground">{successMessage}</p>
        </Card>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full p-8 text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <h1 className="text-xl font-semibold">Skjema ikke funnet</h1>
          <p className="text-muted-foreground">{error}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-semibold">{template.name}</h1>
          {template.description && (
            <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
          )}
        </div>

        <Card className="p-6">
          <DynamicFormRenderer
            fields={fields}
            values={values}
            onChange={(key, val) => setValues(prev => ({ ...prev, [key]: val }))}
          />

          {error && (
            <p className="text-sm text-destructive mt-4 flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" /> {error}
            </p>
          )}

          <Button
            className="w-full mt-6"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            Send inn
          </Button>
        </Card>

        <p className="text-center text-[10px] text-muted-foreground">
          Drevet av VPkontroll
        </p>
      </div>
    </div>
  );
}
