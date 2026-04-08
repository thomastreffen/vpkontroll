import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, XCircle, Loader2, Info } from "lucide-react";
import {
  parseFile, autoMapColumns, transformRow, detectDuplicates,
  IMPORT_FIELDS, type ImportFieldKey, type ParsedRow, type DuplicateMatch,
} from "@/lib/import-utils";

type Step = 1 | 2 | 3 | 4;

const STEP_LABELS = ["Last opp fil", "Kolonne-mapping", "Forhåndsvisning", "Importer"];

export default function CustomerImportPage() {
  const { tenantId, user } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>(1);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, ImportFieldKey | "">>({});
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [skipDuplicates, setSkipDuplicates] = useState<Set<number>>(new Set());
  const [skipErrors, setSkipErrors] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ created: number; contacts: number; sites: number; skipped: number } | null>(null);

  // Step 1: File upload
  const handleFile = async (file: File) => {
    try {
      const { headers: h, rows } = await parseFile(file);
      setFileName(file.name);
      setHeaders(h);
      setRawRows(rows);
      setMapping(autoMapColumns(h));
      setStep(2);
    } catch (err: any) {
      toast.error(err.message || "Kunne ikke lese filen");
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  // Step 2 → 3: Transform and detect duplicates
  const proceedToPreview = async () => {
    const rows = rawRows.map((r, i) => transformRow(r, mapping, i));
    setParsedRows(rows);

    // Fetch existing companies for duplicate check
    if (tenantId) {
      const { data } = await supabase
        .from("crm_companies")
        .select("id, name, org_number, postal_code")
        .eq("tenant_id", tenantId);
      if (data) {
        const dupes = detectDuplicates(rows, data as any);
        setDuplicates(dupes);
        // Auto-skip strong duplicates
        setSkipDuplicates(new Set(dupes.filter((d) => d.strength === "strong").map((d) => d.rowIndex)));
      }
    }
    setSkipErrors(new Set(rows.filter((r) => r.errors.length > 0).map((r) => r.index)));
    setStep(3);
  };

  // Step 4: Import
  const runImport = async () => {
    if (!tenantId || !user) return;
    setImporting(true);
    const toImport = parsedRows.filter(
      (r) => r.errors.length === 0 && !skipDuplicates.has(r.index) && !skipErrors.has(r.index)
    );

    let created = 0, contacts = 0, sites = 0, skipped = 0;
    const BATCH = 50;

    for (let i = 0; i < toImport.length; i += BATCH) {
      const batch = toImport.slice(i, i + BATCH);
      for (const row of batch) {
        try {
          const { data: company } = await supabase
            .from("crm_companies")
            .insert({
              tenant_id: tenantId,
              name: row.customer.name,
              customer_type: row.customer.customer_type as any,
              org_number: row.customer.org_number,
              phone: row.customer.phone,
              email: row.customer.email,
              address: row.customer.address,
              postal_code: row.customer.postal_code,
              city: row.customer.city,
              website: row.customer.website,
              created_by: user.id,
            } as any)
            .select("id")
            .single();

          if (!company) { skipped++; continue; }
          created++;

          if (row.contact) {
            await supabase.from("crm_contacts").insert({
              tenant_id: tenantId,
              company_id: company.id,
              first_name: row.contact.first_name,
              last_name: row.contact.last_name || null,
              email: row.contact.email,
              phone: row.contact.phone,
              mobile: row.contact.mobile,
              title: row.contact.title,
              created_by: user.id,
            } as any);
            contacts++;
          }

          if (row.site) {
            await supabase.from("customer_sites").insert({
              tenant_id: tenantId,
              company_id: company.id,
              name: row.site.name,
              site_type: row.site.site_type as any,
              address: row.site.address,
              postal_code: row.site.postal_code,
              city: row.site.city,
              access_info: row.site.access_info,
              created_by: user.id,
            } as any);
            sites++;
          }
        } catch {
          skipped++;
        }
      }
    }

    setResult({ created, contacts, sites, skipped });
    setImporting(false);
    setStep(4);
  };

  // Helpers
  const validCount = parsedRows.filter((r) => r.errors.length === 0 && !skipDuplicates.has(r.index)).length;
  const errorCount = parsedRows.filter((r) => r.errors.length > 0).length;
  const dupCount = duplicates.length;
  const hasMappedName = Object.values(mapping).includes("customer_name");

  const getDuplicateForRow = (index: number) => duplicates.find((d) => d.rowIndex === index);

  const strengthLabel = (s: string) => s === "strong" ? "Sannsynlig duplikat" : s === "medium" ? "Mulig duplikat" : "Svak match";
  const strengthColor = (s: string) => s === "strong" ? "text-destructive" : s === "medium" ? "text-yellow-600" : "text-muted-foreground";

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => step === 1 || step === 4 ? navigate("/tenant/crm/companies") : setStep((s) => (s - 1) as Step)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Importer kunder</h1>
          <p className="text-sm text-muted-foreground">{fileName || "Last opp en Excel- eller CSV-fil"}</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {STEP_LABELS.map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`flex items-center justify-center h-7 w-7 rounded-full text-xs font-medium ${step > i + 1 ? "bg-primary text-primary-foreground" : step === i + 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {step > i + 1 ? "✓" : i + 1}
            </div>
            <span className={`text-sm ${step === i + 1 ? "font-medium" : "text-muted-foreground"}`}>{label}</span>
            {i < 3 && <div className="w-8 h-px bg-border" />}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <Card
          className="border-2 border-dashed p-12 text-center cursor-pointer hover:border-primary/50 transition-colors"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
          />
          <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
          <p className="font-medium">Dra og slipp fil her, eller klikk for å velge</p>
          <p className="text-sm text-muted-foreground mt-1">Støtter .xlsx, .xls og .csv</p>
        </Card>
      )}

      {/* Step 2: Mapping */}
      {step === 2 && (
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{fileName}</span>
              <Badge variant="outline">{rawRows.length} rader</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Koble kolonnene i filen til riktig felt i systemet. Kolonner som ikke trengs kan stå som «Ignorer».</p>

            <div className="space-y-2">
              {["customer", "contact", "site"].map((group) => (
                <div key={group}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-3 mb-1.5">
                    {group === "customer" ? "Kunde" : group === "contact" ? "Kontaktperson" : "Anleggssted"}
                  </p>
                  {headers.filter((h) => {
                    const mapped = mapping[h];
                    if (!mapped) return group === "customer";
                    return IMPORT_FIELDS.find((f) => f.key === mapped)?.group === group;
                  }).length === 0 && (
                    <p className="text-xs text-muted-foreground italic ml-2">Ingen kolonner mappet</p>
                  )}
                </div>
              ))}

              <div className="grid gap-2 mt-2">
                {headers.map((header) => (
                  <div key={header} className="flex items-center gap-3 py-1.5">
                    <span className="text-sm font-mono bg-muted px-2 py-0.5 rounded min-w-[140px] truncate">{header}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <Select
                      value={mapping[header] || "__ignore__"}
                      onValueChange={(v) => setMapping({ ...mapping, [header]: v === "__ignore__" ? "" : v as ImportFieldKey })}
                    >
                      <SelectTrigger className="h-8 text-sm flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__ignore__">– Ignorer –</SelectItem>
                        {IMPORT_FIELDS.map((f) => (
                          <SelectItem key={f.key} value={f.key} disabled={Object.values(mapping).includes(f.key) && mapping[header] !== f.key}>
                            {f.label}{f.required ? " *" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>Tilbake</Button>
            <Button onClick={proceedToPreview} disabled={!hasMappedName}>
              Forhåndsvisning <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Preview & validation */}
      {step === 3 && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="flex gap-3">
            <Card className="flex-1 p-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">{validCount} gyldige</span>
            </Card>
            <Card className="flex-1 p-3 flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium">{errorCount} med feil</span>
            </Card>
            <Card className="flex-1 p-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium">{dupCount} mulige duplikater</span>
            </Card>
          </div>

          {/* Table */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-2 text-left w-10">#</th>
                    <th className="p-2 text-left">Kundenavn</th>
                    <th className="p-2 text-left">Type</th>
                    <th className="p-2 text-left">Kontakt</th>
                    <th className="p-2 text-left">Anleggssted</th>
                    <th className="p-2 text-left">Status</th>
                    <th className="p-2 text-center w-16">Hopp over</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.slice(0, 100).map((row) => {
                    const dup = getDuplicateForRow(row.index);
                    const hasError = row.errors.length > 0;
                    const isSkipped = skipDuplicates.has(row.index) || skipErrors.has(row.index);

                    return (
                      <tr key={row.index} className={`border-b ${hasError ? "bg-destructive/5" : dup ? "bg-yellow-50" : ""} ${isSkipped ? "opacity-50" : ""}`}>
                        <td className="p-2 text-muted-foreground">{row.index + 1}</td>
                        <td className="p-2 font-medium">{row.customer.name || "—"}</td>
                        <td className="p-2">{row.customer.customer_type === "private" ? "Privat" : row.customer.customer_type === "business" ? "Bedrift" : row.customer.customer_type}</td>
                        <td className="p-2 text-muted-foreground">{row.contact ? `${row.contact.first_name} ${row.contact.last_name}`.trim() : "—"}</td>
                        <td className="p-2 text-muted-foreground">{row.site?.address || row.site?.name || "—"}</td>
                        <td className="p-2">
                          {hasError && (
                            <span className="text-xs text-destructive flex items-center gap-1">
                              <XCircle className="h-3 w-3" /> {row.errors[0]}
                            </span>
                          )}
                          {!hasError && dup && (
                            <span className={`text-xs flex items-center gap-1 ${strengthColor(dup.strength)}`}>
                              <AlertTriangle className="h-3 w-3" /> {strengthLabel(dup.strength)}: {dup.reason}
                            </span>
                          )}
                          {!hasError && !dup && row.warnings.length > 0 && (
                            <span className="text-xs text-yellow-600 flex items-center gap-1">
                              <Info className="h-3 w-3" /> {row.warnings[0]}
                            </span>
                          )}
                          {!hasError && !dup && row.warnings.length === 0 && (
                            <span className="text-xs text-green-600 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" /> OK
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-center">
                          {!hasError && (
                            <Checkbox
                              checked={skipDuplicates.has(row.index)}
                              onCheckedChange={(checked) => {
                                const next = new Set(skipDuplicates);
                                checked ? next.add(row.index) : next.delete(row.index);
                                setSkipDuplicates(next);
                              }}
                            />
                          )}
                          {hasError && <span className="text-xs text-muted-foreground">Hoppes over</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {parsedRows.length > 100 && (
              <div className="p-2 text-center text-xs text-muted-foreground bg-muted/30">
                Viser 100 av {parsedRows.length} rader
              </div>
            )}
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>Tilbake til mapping</Button>
            <Button onClick={runImport} disabled={validCount === 0 || importing}>
              {importing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Importer {validCount - skipDuplicates.size} kunder
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Result */}
      {step === 4 && result && (
        <Card className="p-8 text-center space-y-4">
          <CheckCircle2 className="h-12 w-12 mx-auto text-green-600" />
          <h2 className="text-xl font-semibold">Import fullført</h2>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p><strong>{result.created}</strong> kunder opprettet</p>
            <p><strong>{result.contacts}</strong> kontaktpersoner opprettet</p>
            <p><strong>{result.sites}</strong> anleggssteder opprettet</p>
            {result.skipped > 0 && <p><strong>{result.skipped}</strong> rader hoppet over</p>}
          </div>
          <Button onClick={() => navigate("/tenant/crm/companies")} className="mt-4">
            Gå til kundelisten
          </Button>
        </Card>
      )}
    </div>
  );
}
