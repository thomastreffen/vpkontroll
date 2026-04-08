import * as XLSX from "xlsx";

// ── Field definitions ──────────────────────────────────────────────

export type ImportFieldKey =
  | "customer_name" | "customer_type" | "org_number" | "customer_phone"
  | "customer_email" | "customer_address" | "customer_postal_code"
  | "customer_city" | "customer_website"
  | "contact_full_name" | "contact_first_name" | "contact_last_name"
  | "contact_email" | "contact_phone" | "contact_mobile" | "contact_title"
  | "site_name" | "site_type" | "site_address" | "site_postal_code"
  | "site_city" | "site_access_info";

export interface ImportField {
  key: ImportFieldKey;
  label: string;
  group: "customer" | "contact" | "site";
  required?: boolean;
}

export const IMPORT_FIELDS: ImportField[] = [
  { key: "customer_name", label: "Kundenavn", group: "customer", required: true },
  { key: "customer_type", label: "Kundetype", group: "customer" },
  { key: "org_number", label: "Org.nummer", group: "customer" },
  { key: "customer_phone", label: "Telefon (kunde)", group: "customer" },
  { key: "customer_email", label: "E-post (kunde)", group: "customer" },
  { key: "customer_address", label: "Adresse (kunde)", group: "customer" },
  { key: "customer_postal_code", label: "Postnr (kunde)", group: "customer" },
  { key: "customer_city", label: "By (kunde)", group: "customer" },
  { key: "customer_website", label: "Nettside", group: "customer" },
  { key: "contact_full_name", label: "Kontaktperson (fullt navn)", group: "contact" },
  { key: "contact_first_name", label: "Fornavn", group: "contact" },
  { key: "contact_last_name", label: "Etternavn", group: "contact" },
  { key: "contact_email", label: "E-post (kontakt)", group: "contact" },
  { key: "contact_phone", label: "Telefon (kontakt)", group: "contact" },
  { key: "contact_mobile", label: "Mobil (kontakt)", group: "contact" },
  { key: "contact_title", label: "Tittel (kontakt)", group: "contact" },
  { key: "site_name", label: "Anleggssted navn", group: "site" },
  { key: "site_type", label: "Anleggstype", group: "site" },
  { key: "site_address", label: "Adresse (anleggssted)", group: "site" },
  { key: "site_postal_code", label: "Postnr (anleggssted)", group: "site" },
  { key: "site_city", label: "By (anleggssted)", group: "site" },
  { key: "site_access_info", label: "Adkomst", group: "site" },
];

// ── Parsing ────────────────────────────────────────────────────────

export function parseFile(file: File): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        if (json.length < 2) return reject(new Error("Filen inneholder ingen datarader."));
        const headers = json[0].map((h) => String(h).trim());
        const rows = json.slice(1)
          .filter((r) => r.some((c) => String(c).trim()))
          .map((r) => {
            const obj: Record<string, string> = {};
            headers.forEach((h, i) => { obj[h] = String(r[i] ?? "").trim(); });
            return obj;
          });
        resolve({ headers, rows });
      } catch { reject(new Error("Kunne ikke lese filen. Kontroller at det er en gyldig Excel- eller CSV-fil.")); }
    };
    reader.onerror = () => reject(new Error("Feil ved lesing av fil."));
    reader.readAsArrayBuffer(file);
  });
}

// ── Auto-mapping ───────────────────────────────────────────────────

const ALIASES: Record<ImportFieldKey, string[]> = {
  customer_name: ["navn", "kundenavn", "firma", "bedrift", "name", "company", "customer"],
  customer_type: ["kundetype", "type", "customer_type", "kundegruppe"],
  org_number: ["orgnr", "org.nr", "org_number", "organisasjonsnummer", "org.nummer"],
  customer_phone: ["telefon", "tlf", "phone", "tel"],
  customer_email: ["epost", "e-post", "email", "mail"],
  customer_address: ["adresse", "address", "gateadresse"],
  customer_postal_code: ["postnr", "postnummer", "postal_code", "zip"],
  customer_city: ["by", "sted", "poststed", "city"],
  customer_website: ["nettside", "website", "url", "hjemmeside"],
  contact_full_name: ["kontakt", "kontaktperson", "contact", "contact_name"],
  contact_first_name: ["fornavn", "first_name", "firstname"],
  contact_last_name: ["etternavn", "last_name", "lastname", "surname"],
  contact_email: ["kontakt epost", "kontakt e-post", "contact_email", "kontakt email"],
  contact_phone: ["kontakt telefon", "kontakt tlf", "contact_phone"],
  contact_mobile: ["mobil", "mobilnr", "mobile", "mobiltelefon"],
  contact_title: ["tittel", "stilling", "title", "rolle"],
  site_name: ["anleggssted", "site", "site_name", "lokasjon", "anlegg"],
  site_type: ["anleggstype", "site_type"],
  site_address: ["anleggsadresse", "site_address", "installasjonsadresse"],
  site_postal_code: ["anlegg postnr", "site_postal_code"],
  site_city: ["anlegg by", "site_city"],
  site_access_info: ["adkomst", "access", "tilgang"],
};

export function autoMapColumns(headers: string[]): Record<string, ImportFieldKey | ""> {
  const mapping: Record<string, ImportFieldKey | ""> = {};
  const used = new Set<ImportFieldKey>();
  for (const header of headers) {
    const norm = header.toLowerCase().replace(/[^a-zæøå0-9]/g, "");
    let bestMatch: ImportFieldKey | "" = "";
    for (const [key, aliases] of Object.entries(ALIASES) as [ImportFieldKey, string[]][]) {
      if (used.has(key)) continue;
      for (const alias of aliases) {
        const normAlias = alias.toLowerCase().replace(/[^a-zæøå0-9]/g, "");
        if (norm === normAlias || norm.includes(normAlias) || normAlias.includes(norm)) {
          bestMatch = key;
          break;
        }
      }
      if (bestMatch) break;
    }
    mapping[header] = bestMatch;
    if (bestMatch) used.add(bestMatch);
  }
  return mapping;
}

// ── Customer type detection ────────────────────────────────────────

const CUSTOMER_TYPE_MAP: Record<string, string> = {
  privat: "private", private: "private", privatperson: "private", privatkunde: "private",
  bedrift: "business", business: "business", firma: "business", bedriftskunde: "business",
  borettslag: "housing_coop", brl: "housing_coop", housing_coop: "housing_coop",
  offentlig: "public_sector", public: "public_sector", kommune: "public_sector",
};

const SITE_TYPE_MAP: Record<string, string> = {
  bolig: "residential", residential: "residential", enebolig: "residential", leilighet: "residential",
  næring: "commercial", commercial: "commercial", kontor: "commercial",
  industri: "industrial", industrial: "industrial",
  hytte: "cabin", cabin: "cabin", fritidsbolig: "cabin",
};

// ── Row validation & transformation ────────────────────────────────

export interface ParsedRow {
  index: number;
  customer: { name: string; customer_type: string; org_number: string | null; phone: string | null; email: string | null; address: string | null; postal_code: string | null; city: string | null; website: string | null };
  contact: { first_name: string; last_name: string; email: string | null; phone: string | null; mobile: string | null; title: string | null } | null;
  site: { name: string | null; site_type: string; address: string | null; postal_code: string | null; city: string | null; access_info: string | null } | null;
  errors: string[];
  warnings: string[];
}

export function transformRow(
  raw: Record<string, string>,
  mapping: Record<string, ImportFieldKey | "">,
  index: number
): ParsedRow {
  const val = (key: ImportFieldKey): string => {
    for (const [col, mapped] of Object.entries(mapping)) {
      if (mapped === key) return raw[col] || "";
    }
    return "";
  };

  const errors: string[] = [];
  const warnings: string[] = [];

  // Customer
  const name = val("customer_name");
  if (!name) errors.push("Kundenavn mangler");
  const rawType = val("customer_type").toLowerCase().trim();
  const customer_type = CUSTOMER_TYPE_MAP[rawType] || "private";
  const email = val("customer_email") || null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) warnings.push("Ugyldig e-post (kunde)");

  // Contact
  let contact: ParsedRow["contact"] = null;
  const fullName = val("contact_full_name");
  let firstName = val("contact_first_name");
  let lastName = val("contact_last_name");
  if (fullName && !firstName) {
    const parts = fullName.trim().split(/\s+/);
    firstName = parts[0];
    lastName = parts.slice(1).join(" ");
  }
  if (firstName) {
    contact = {
      first_name: firstName,
      last_name: lastName || "",
      email: val("contact_email") || null,
      phone: val("contact_phone") || null,
      mobile: val("contact_mobile") || null,
      title: val("contact_title") || null,
    };
  }

  // Site
  const siteAddress = val("site_address");
  const siteName = val("site_name");
  const siteCity = val("site_city");
  const hasSiteData = siteAddress || siteName || siteCity;
  let site: ParsedRow["site"] = null;
  if (hasSiteData) {
    const rawSiteType = val("site_type").toLowerCase().trim();
    site = {
      name: siteName || null,
      site_type: SITE_TYPE_MAP[rawSiteType] || "residential",
      address: siteAddress || null,
      postal_code: val("site_postal_code") || null,
      city: siteCity || null,
      access_info: val("site_access_info") || null,
    };
  }

  return {
    index,
    customer: {
      name,
      customer_type,
      org_number: val("org_number") || null,
      phone: val("customer_phone") || null,
      email,
      address: val("customer_address") || null,
      postal_code: val("customer_postal_code") || null,
      city: val("customer_city") || null,
      website: val("customer_website") || null,
    },
    contact,
    site,
    errors,
    warnings,
  };
}

// ── Duplicate detection ────────────────────────────────────────────

export type DuplicateStrength = "strong" | "medium" | "weak";

export interface DuplicateMatch {
  rowIndex: number;
  existingId: string;
  existingName: string;
  strength: DuplicateStrength;
  reason: string;
}

export function detectDuplicates(
  rows: ParsedRow[],
  existing: { id: string; name: string; org_number: string | null; postal_code: string | null }[]
): DuplicateMatch[] {
  const matches: DuplicateMatch[] = [];
  for (const row of rows) {
    if (row.errors.length) continue;
    for (const ex of existing) {
      // Strong: org_number match
      if (row.customer.org_number && ex.org_number && row.customer.org_number.replace(/\s/g, "") === ex.org_number.replace(/\s/g, "")) {
        matches.push({ rowIndex: row.index, existingId: ex.id, existingName: ex.name, strength: "strong", reason: `Samme org.nr: ${row.customer.org_number}` });
        break;
      }
      // Medium: name + postal_code
      if (row.customer.name.toLowerCase() === ex.name.toLowerCase() && row.customer.postal_code && ex.postal_code && row.customer.postal_code === ex.postal_code) {
        matches.push({ rowIndex: row.index, existingId: ex.id, existingName: ex.name, strength: "medium", reason: `Samme navn + postnr` });
        break;
      }
      // Weak: name only
      if (row.customer.name.toLowerCase() === ex.name.toLowerCase()) {
        matches.push({ rowIndex: row.index, existingId: ex.id, existingName: ex.name, strength: "weak", reason: `Samme navn` });
        break;
      }
    }
  }
  return matches;
}
