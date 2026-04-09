import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Loader2, Inbox, ExternalLink, FileText, Building2, Contact, TrendingUp, Mail, Globe } from "lucide-react";
import { formatDateTime } from "@/lib/domain-labels";

const WEB_FORM_TYPE_LABELS: Record<string, string> = {
  contact: "Kontaktskjema",
  service: "Bestill service",
  quote: "Be om pris",
  site_visit: "Bestill befaring",
  general: "Generell henvendelse",
};

export default function FormSubmissionsPage() {
  const { tenantId } = useAuth();
  const [searchParams] = useSearchParams();
  const templateFilter = searchParams.get("template");

  const [submissions, setSubmissions] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState(templateFilter || "all");
  const [detailItem, setDetailItem] = useState<any | null>(null);

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);

    // Load templates for filter
    const { data: tmplData } = await supabase
      .from("service_templates" as any)
      .select("id, name, category, web_form_type")
      .eq("tenant_id", tenantId)
      .eq("category", "web");
    setTemplates(tmplData || []);

    // Load submissions
    let query = supabase
      .from("form_submissions" as any)
      .select("*")
      .eq("tenant_id", tenantId)
      .order("submitted_at", { ascending: false })
      .limit(200);

    if (selectedTemplateId && selectedTemplateId !== "all") {
      query = query.eq("template_id", selectedTemplateId);
    }

    const { data } = await query;
    setSubmissions(data || []);
    setLoading(false);
  }, [tenantId, selectedTemplateId]);

  useEffect(() => { load(); }, [load]);

  const getTemplateName = (templateId: string) => {
    const t = templates.find((tmpl: any) => tmpl.id === templateId);
    return t ? t.name : "Ukjent skjema";
  };

  const extractField = (payload: any, ...keys: string[]) => {
    for (const k of keys) {
      if (payload?.[k]) return payload[k];
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" />
            Innsendinger fra nettskjema
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Oversikt over alle innsendinger fra publiserte skjema på nettsiden
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
            <SelectTrigger className="w-[220px] h-9 text-sm">
              <SelectValue placeholder="Alle skjema" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle skjema</SelectItem>
              {templates.map((t: any) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : submissions.length === 0 ? (
        <Card className="p-12 text-center">
          <Inbox className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">Ingen innsendinger ennå</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Innsendinger fra publiserte nettskjema vises her
          </p>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[160px]">Tidspunkt</TableHead>
                <TableHead>Skjema</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Navn</TableHead>
                <TableHead>E-post</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead>Opprettet</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((sub: any) => {
                const payload = sub.payload || {};
                const name = extractField(payload, "navn", "name", "full_name");
                const email = extractField(payload, "e_post", "epost", "email");
                const phone = extractField(payload, "telefon", "phone", "mobil");

                return (
                  <TableRow key={sub.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDetailItem(sub)}>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(sub.submitted_at)}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {getTemplateName(sub.template_id)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {WEB_FORM_TYPE_LABELS[sub.web_form_type] || sub.web_form_type || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{name || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{email || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{phone || "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {sub.created_case_id && (
                          <Badge variant="secondary" className="text-[10px] gap-1">
                            <Mail className="h-2.5 w-2.5" /> Sak
                          </Badge>
                        )}
                        {sub.created_deal_id && (
                          <Badge variant="secondary" className="text-[10px] gap-1">
                            <TrendingUp className="h-2.5 w-2.5" /> Deal
                          </Badge>
                        )}
                        {sub.created_contact_id && (
                          <Badge variant="secondary" className="text-[10px] gap-1">
                            <Contact className="h-2.5 w-2.5" /> Kontakt
                          </Badge>
                        )}
                        {!sub.created_case_id && !sub.created_deal_id && (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="h-7 text-xs">
                        Detaljer
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Detail sheet */}
      <Sheet open={!!detailItem} onOpenChange={open => !open && setDetailItem(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Innsending
            </SheetTitle>
          </SheetHeader>
          {detailItem && <SubmissionDetail sub={detailItem} templateName={getTemplateName(detailItem.template_id)} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function SubmissionDetail({ sub, templateName }: { sub: any; templateName: string }) {
  const payload = sub.payload || {};

  return (
    <div className="mt-4 space-y-5">
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Tidspunkt</p>
        <p className="text-sm font-medium">{formatDateTime(sub.submitted_at)}</p>
      </div>
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Skjema</p>
        <p className="text-sm font-medium">{templateName}</p>
      </div>
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Type</p>
        <Badge variant="outline" className="text-xs">
          {WEB_FORM_TYPE_LABELS[sub.web_form_type] || sub.web_form_type || "Ukjent"}
        </Badge>
      </div>
      {sub.source_url && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Kilde-URL</p>
          <p className="text-xs font-mono text-muted-foreground break-all">{sub.source_url}</p>
        </div>
      )}

      <Separator />

      <div>
        <p className="text-xs font-medium text-muted-foreground mb-3">Innsendte data</p>
        <div className="space-y-2">
          {Object.entries(payload).map(([key, value]) => (
            <div key={key} className="flex gap-3 text-sm">
              <span className="text-muted-foreground min-w-[120px] text-xs">{key}</span>
              <span className="flex-1 break-words">{String(value ?? "—")}</span>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <p className="text-xs font-medium text-muted-foreground mb-3">Sporbarhet – hva ble opprettet?</p>
        <div className="space-y-2">
          {sub.created_contact_id && (
            <Link to={`/tenant/crm/contacts/${sub.created_contact_id}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
              <Contact className="h-3.5 w-3.5" /> Se kontaktperson
              <ExternalLink className="h-3 w-3 ml-auto" />
            </Link>
          )}
          {sub.created_company_id && (
            <Link to={`/tenant/crm/companies/${sub.created_company_id}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
              <Building2 className="h-3.5 w-3.5" /> Se kunde
              <ExternalLink className="h-3 w-3 ml-auto" />
            </Link>
          )}
          {sub.created_case_id && (
            <Link to="/tenant/postkontoret" className="flex items-center gap-2 text-sm text-primary hover:underline">
              <Mail className="h-3.5 w-3.5" /> Se sak i Postkontoret
              <ExternalLink className="h-3 w-3 ml-auto" />
            </Link>
          )}
          {sub.created_deal_id && (
            <Link to={`/tenant/crm/deals/${sub.created_deal_id}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
              <TrendingUp className="h-3.5 w-3.5" /> Se deal
              <ExternalLink className="h-3 w-3 ml-auto" />
            </Link>
          )}
          {!sub.created_contact_id && !sub.created_case_id && !sub.created_deal_id && (
            <p className="text-xs text-muted-foreground">Ingen objekter ble opprettet fra denne innsendingen.</p>
          )}
        </div>
      </div>
    </div>
  );
}

const WEB_FORM_TYPE_LABELS_EXPORT = WEB_FORM_TYPE_LABELS;
