// Email templates for document sending

export interface EmailTemplate {
  key: string;
  label: string;
  subject: string;
  body: string;
}

export const EMAIL_TEMPLATES: Record<string, EmailTemplate> = {
  quote: {
    key: "quote",
    label: "Tilbud",
    subject: "Tilbud – {{deal_title}}",
    body: `Hei {{contact_name}},

Vedlagt finner du tilbudet for {{deal_title}}.

{{site_address}}

Ta gjerne kontakt om du har spørsmål.

Med vennlig hilsen`,
  },
  service_report: {
    key: "service_report",
    label: "Servicerapport",
    subject: "Servicerapport – {{customer_name}} – {{report_date}}",
    body: `Hei {{contact_name}},

Vedlagt finner du servicerapporten fra {{report_date}}.

{{site_address}}

Ta gjerne kontakt om du har spørsmål.

Med vennlig hilsen`,
  },
  inspection_report: {
    key: "inspection_report",
    label: "Befaringsrapport",
    subject: "Befaringsrapport – {{deal_title}}",
    body: `Hei {{contact_name}},

Vedlagt finner du befaringsrapporten for {{deal_title}}.

{{site_address}}

Ta gjerne kontakt om du har spørsmål.

Med vennlig hilsen`,
  },
  installation_report: {
    key: "installation_report",
    label: "Installasjonsrapport",
    subject: "Installasjonsrapport – {{customer_name}}",
    body: `Hei {{contact_name}},

Vedlagt finner du rapporten for installasjonen.

{{site_address}}

Ta gjerne kontakt om du har spørsmål.

Med vennlig hilsen`,
  },
};

export interface TemplatePlaceholders {
  customer_name?: string;
  contact_name?: string;
  deal_title?: string;
  site_address?: string;
  report_date?: string;
}

export function applyPlaceholders(text: string, placeholders: TemplatePlaceholders): string {
  let result = text;
  for (const [key, value] of Object.entries(placeholders)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value || "");
  }
  // Clean up empty lines from missing placeholders
  result = result.replace(/\n\n\n+/g, "\n\n");
  return result.trim();
}
