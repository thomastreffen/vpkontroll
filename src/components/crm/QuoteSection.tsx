import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  FileText, Plus, Send, CheckCircle2, XCircle, Loader2, Download, Eye,
  Copy, ArrowRight, Briefcase, ScrollText, ChevronDown, ChevronUp, Mail,
} from "lucide-react";
import { SendDocumentSheet, type SendDocumentContext } from "@/components/communication/SendDocumentSheet";
import {
  QUOTE_STATUS_LABELS, QUOTE_STATUS_COLORS, DEAL_STAGE_LABELS,
  formatCurrency, type DealStage,
} from "@/lib/crm-labels";
import { formatDate } from "@/lib/domain-labels";
import { generateQuotePdf, type QuotePdfLine, type QuotePdfContext } from "@/lib/quote-pdf";

interface QuoteSectionProps {
  deal: any;
  quotes: any[];
  company?: any;
  contact?: any;
  site?: any;
  linkedJob?: any;
  linkedAgreement?: any;
  isClosed: boolean;
  isWon: boolean;
  onRefresh: () => void;
  onChangeStage: (stage: DealStage) => Promise<void>;
  onOpenCreateJob: () => void;
  onOpenCreateAgreement: () => void;
}

interface QuoteLine {
  description: string;
  quantity: string;
  unit_price: string;
  unit: string;
  discount_percent: string;
}

const EMPTY_LINE: QuoteLine = { description: "", quantity: "1", unit_price: "", unit: "stk", discount_percent: "" };

export function QuoteSection({
  deal, quotes, company, contact, site, linkedJob, linkedAgreement,
  isClosed, isWon, onRefresh, onChangeStage, onOpenCreateJob, onOpenCreateAgreement,
}: QuoteSectionProps) {
  const { tenantId, user } = useAuth();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [lines, setLines] = useState<QuoteLine[]>([{ ...EMPTY_LINE }]);
  const [notes, setNotes] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);
  const [sendSheetOpen, setSendSheetOpen] = useState(false);

  // Sort: latest version first
  const sorted = [...quotes].sort((a, b) => b.version - a.version);
  const activeQuote = sorted.find(q => q.status !== "rejected" && q.status !== "expired") || sorted[0];
  const acceptedQuote = sorted.find(q => q.status === "accepted");
  const historyQuotes = sorted.filter(q => q.id !== activeQuote?.id);

  // Fetch lines for expanded quotes
  const activeQuoteLines = useQuery({
    queryKey: ["quote-lines", activeQuote?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("quote_lines")
        .select("*")
        .eq("quote_id", activeQuote!.id)
        .order("sort_order");
      return data ?? [];
    },
    enabled: !!activeQuote?.id,
  });

  // Fetch PDF for active quote
  const quotePdf = useQuery({
    queryKey: ["quote-pdf-doc", activeQuote?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("documents")
        .select("id, file_path, created_at")
        .eq("deal_id", deal.id)
        .eq("description", `Tilbuds-PDF ${activeQuote!.quote_number}`)
        .eq("mime_type", "application/pdf")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1);
      return data?.[0] || null;
    },
    enabled: !!activeQuote?.id,
  });

  const lineTotal = (l: QuoteLine) => {
    const qty = parseFloat(l.quantity) || 0;
    const price = parseFloat(l.unit_price) || 0;
    const disc = parseFloat(l.discount_percent) || 0;
    return qty * price * (1 - disc / 100);
  };

  const total = lines.reduce((s, l) => s + lineTotal(l), 0);

  const openNewQuote = (prefillFrom?: any, prefillLines?: any[]) => {
    if (prefillFrom && prefillLines) {
      setLines(prefillLines.map(l => ({
        description: l.description,
        quantity: String(l.quantity),
        unit_price: String(l.unit_price),
        unit: l.unit || "stk",
        discount_percent: l.discount_percent ? String(l.discount_percent) : "",
      })));
      setNotes(prefillFrom.notes || "");
      setValidUntil(prefillFrom.valid_until || "");
    } else {
      setLines([{ ...EMPTY_LINE }]);
      setNotes("");
      setValidUntil("");
    }
    setEditingQuoteId(null);
    setSheetOpen(true);
  };

  const openNewVersion = async () => {
    if (!activeQuote) return;
    const { data: existingLines } = await supabase
      .from("quote_lines").select("*").eq("quote_id", activeQuote.id).order("sort_order");
    openNewQuote(activeQuote, existingLines || []);
  };

  const saveQuote = async () => {
    if (!deal || !tenantId) return;
    const validLines = lines.filter(l => l.description.trim() && l.unit_price);
    if (validLines.length === 0) { toast.error("Legg til minst én linje"); return; }

    setSaving(true);
    const totalAmount = validLines.reduce((s, l) => s + lineTotal(l), 0);
    const vatAmount = Math.round(totalAmount * 0.25);
    const nextVersion = (sorted[0]?.version || 0) + 1;

    const { data: q, error } = await supabase.from("quotes").insert({
      tenant_id: tenantId, deal_id: deal.id, quote_number: "TEMP",
      total_amount: totalAmount, vat_amount: vatAmount,
      notes: notes || null, valid_until: validUntil || null,
      created_by: user?.id, version: nextVersion,
    } as any).select().single();

    if (error || !q) { setSaving(false); toast.error("Kunne ikke opprette tilbud"); return; }

    const lineInserts = validLines.map((l, i) => ({
      tenant_id: tenantId, quote_id: q.id, description: l.description.trim(),
      quantity: parseFloat(l.quantity) || 1, unit_price: parseFloat(l.unit_price) || 0,
      unit: l.unit || "stk", sort_order: i,
      line_total: lineTotal(l),
      discount_percent: l.discount_percent ? parseFloat(l.discount_percent) : null,
    }));
    await supabase.from("quote_lines").insert(lineInserts as any);

    await supabase.from("crm_activities").insert({
      tenant_id: tenantId, deal_id: deal.id, company_id: deal.company_id,
      type: "task",
      subject: `Tilbud ${q.quote_number} v${nextVersion} opprettet (${formatCurrency(totalAmount)})`,
      created_by: user?.id,
    } as any);

    setSaving(false);
    toast.success(`Tilbud ${q.quote_number} opprettet`);
    setSheetOpen(false);
    onRefresh();
  };

  const updateStatus = async (quoteId: string, status: string, quoteNumber: string) => {
    const payload: any = { status };
    if (status === "sent") payload.sent_at = new Date().toISOString();
    if (status === "accepted") payload.accepted_at = new Date().toISOString();

    const { error } = await supabase.from("quotes").update(payload).eq("id", quoteId);
    if (error) { toast.error("Kunne ikke oppdatere tilbud"); return; }

    if (status === "accepted" && deal.stage !== "won") {
      await onChangeStage("won");
    }

    if (tenantId) {
      await supabase.from("crm_activities").insert({
        tenant_id: tenantId, deal_id: deal.id, company_id: deal.company_id,
        type: "status_change",
        subject: `Tilbud ${quoteNumber} markert som ${QUOTE_STATUS_LABELS[status] || status}`,
        created_by: user?.id,
      } as any);
    }

    toast.success(`Tilbud markert som ${QUOTE_STATUS_LABELS[status] || status}`);
    onRefresh();
  };

  const generatePdf = async (quote: any) => {
    if (!tenantId) return;
    setGeneratingPdf(quote.id);
    try {
      const { data: qLines } = await supabase
        .from("quote_lines").select("*").eq("quote_id", quote.id).order("sort_order");

      const pdfLines: QuotePdfLine[] = (qLines || []).map(l => ({
        description: l.description, quantity: l.quantity,
        unit: l.unit || "stk", unit_price: l.unit_price,
        line_total: l.line_total, discount_percent: l.discount_percent,
      }));

      const ctx: QuotePdfContext = {
        quoteNumber: quote.quote_number, version: quote.version,
        customerName: company?.name, contactName: contact ? `${contact.first_name} ${contact.last_name || ""}`.trim() : undefined,
        address: site ? `${site.address || ""}, ${site.postal_code || ""} ${site.city || ""}`.trim() : undefined,
        dealTitle: deal.title,
        validUntil: quote.valid_until ? formatDate(quote.valid_until) : undefined,
        createdAt: formatDate(quote.created_at),
        notes: quote.notes,
      };

      const blob = generateQuotePdf(pdfLines, ctx, quote.total_amount, quote.vat_amount);
      const fileName = `Tilbud_${quote.quote_number}_v${quote.version}.pdf`;
      const filePath = `${tenantId}/deals/${deal.id}/${Date.now()}_${fileName}`;

      const { error: storageErr } = await supabase.storage
        .from("tenant-documents")
        .upload(filePath, blob, { upsert: false, contentType: "application/pdf" });
      if (storageErr) throw storageErr;

      const { error: dbErr } = await supabase.from("documents").insert({
        tenant_id: tenantId, deal_id: deal.id,
        category: "quote_pdf" as any, file_name: fileName, file_path: filePath,
        file_size_bytes: blob.size, mime_type: "application/pdf",
        uploaded_by: user?.id, description: `Tilbuds-PDF ${quote.quote_number}`,
      });
      if (dbErr) throw dbErr;

      toast.success("Tilbuds-PDF generert og lagret");
      quotePdf.refetch();
    } catch (e: any) {
      toast.error(`PDF-feil: ${e.message}`);
    } finally {
      setGeneratingPdf(null);
    }
  };

  const viewPdf = async () => {
    if (!quotePdf.data) return;
    const { data, error } = await supabase.storage
      .from("tenant-documents")
      .createSignedUrl(quotePdf.data.file_path, 3600);
    if (error) { toast.error("Kunne ikke åpne PDF"); return; }
    window.open(data.signedUrl, "_blank");
  };

  // ── No quotes yet ──
  if (quotes.length === 0) {
    return (
      <Card className="p-8 text-center">
        <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground mb-3">Ingen tilbud ennå</p>
        {!isClosed && (
          <Button size="sm" onClick={() => openNewQuote()} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />Opprett tilbud
          </Button>
        )}
        <QuoteBuilderSheet
          open={sheetOpen} onOpenChange={setSheetOpen}
          lines={lines} setLines={setLines}
          notes={notes} setNotes={setNotes}
          validUntil={validUntil} setValidUntil={setValidUntil}
          total={total} lineTotal={lineTotal}
          saving={saving} onSave={saveQuote}
          isNewVersion={false}
        />
      </Card>
    );
  }

  // ── With quotes ──
  return (
    <div className="space-y-4">
      {/* Accepted quote banner */}
      {acceptedQuote && (
        <Card className="p-4 border-emerald-500/30 bg-emerald-500/5">
          <div className="flex items-center gap-3 mb-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-700">Tilbud akseptert</p>
              <p className="text-xs text-muted-foreground">
                {acceptedQuote.quote_number} v{acceptedQuote.version} · {formatCurrency(acceptedQuote.total_amount)} ekskl. MVA
                {acceptedQuote.accepted_at && ` · Akseptert ${formatDate(acceptedQuote.accepted_at)}`}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {!linkedJob && (
              <Button size="sm" onClick={onOpenCreateJob} className="gap-1.5">
                <Briefcase className="h-3.5 w-3.5" />Opprett installasjonsjobb
              </Button>
            )}
            {!linkedAgreement && isWon && deal.company_id && deal.site_id && (
              <Button size="sm" variant="outline" onClick={onOpenCreateAgreement} className="gap-1.5">
                <ScrollText className="h-3.5 w-3.5" />Opprett serviceavtale
              </Button>
            )}
            {linkedJob && (
              <Badge variant="secondary" className="text-xs bg-primary/10 text-primary gap-1">
                <Briefcase className="h-3 w-3" />Jobb opprettet
              </Badge>
            )}
            {linkedAgreement && (
              <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-600 gap-1">
                <ScrollText className="h-3 w-3" />Avtale opprettet
              </Badge>
            )}
          </div>
        </Card>
      )}

      {/* Active quote card */}
      {activeQuote && (
        <Card className={`p-4 ${activeQuote.status === "accepted" ? "border-emerald-500/20" : "border-primary/20"}`}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm">{activeQuote.quote_number}</p>
                <Badge variant="secondary" className="text-[10px]">v{activeQuote.version}</Badge>
                <Badge className={`text-[10px] ${QUOTE_STATUS_COLORS[activeQuote.status] || ""}`}>
                  {QUOTE_STATUS_LABELS[activeQuote.status] || activeQuote.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Opprettet {formatDate(activeQuote.created_at)}
                {activeQuote.valid_until && ` · Gyldig til ${formatDate(activeQuote.valid_until)}`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">{formatCurrency(activeQuote.total_amount)}</p>
              <p className="text-[10px] text-muted-foreground">ekskl. MVA</p>
              <p className="text-xs text-muted-foreground">{formatCurrency(Math.round(activeQuote.total_amount * 1.25))} inkl. MVA</p>
            </div>
          </div>

          {/* Lines preview */}
          {activeQuoteLines.data && activeQuoteLines.data.length > 0 && (
            <div className="border rounded-md mb-3 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Beskrivelse</th>
                    <th className="text-right px-2 py-1.5 font-medium text-muted-foreground">Ant.</th>
                    <th className="text-right px-2 py-1.5 font-medium text-muted-foreground">Pris</th>
                    <th className="text-right px-3 py-1.5 font-medium text-muted-foreground">Sum</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {activeQuoteLines.data.map((l: any) => (
                    <tr key={l.id}>
                      <td className="px-3 py-1.5">{l.description}</td>
                      <td className="text-right px-2 py-1.5">{l.quantity} {l.unit}</td>
                      <td className="text-right px-2 py-1.5">{formatCurrency(l.unit_price)}</td>
                      <td className="text-right px-3 py-1.5 font-medium">{formatCurrency(l.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeQuote.notes && (
            <p className="text-xs text-muted-foreground mb-3 italic">{activeQuote.notes}</p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap pt-2 border-t">
            {activeQuote.status === "draft" && (
              <Button variant="default" size="sm" className="gap-1 text-xs" onClick={() => updateStatus(activeQuote.id, "sent", activeQuote.quote_number)}>
                <Send className="h-3 w-3" />Marker sendt
              </Button>
            )}
            {(activeQuote.status === "sent" || activeQuote.status === "draft") && (
              <>
                <Button variant="outline" size="sm" className="gap-1 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => updateStatus(activeQuote.id, "accepted", activeQuote.quote_number)}>
                  <CheckCircle2 className="h-3 w-3" />Akseptert
                </Button>
                <Button variant="ghost" size="sm" className="gap-1 text-xs text-destructive" onClick={() => updateStatus(activeQuote.id, "rejected", activeQuote.quote_number)}>
                  <XCircle className="h-3 w-3" />Avslått
                </Button>
              </>
            )}
            <Separator orientation="vertical" className="h-5" />
            <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => generatePdf(activeQuote)} disabled={!!generatingPdf}>
              {generatingPdf === activeQuote.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
              {quotePdf.data ? "Ny PDF" : "Generer PDF"}
            </Button>
            {quotePdf.data && (
              <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={viewPdf}>
                <Eye className="h-3 w-3" />Se PDF
              </Button>
            )}
            {quotePdf.data && (
              <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 gap-1">
                <FileText className="h-2.5 w-2.5" />PDF
              </Badge>
            )}
            {quotePdf.data && (
              <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => setSendSheetOpen(true)}>
                <Mail className="h-3 w-3" />Send tilbud
              </Button>
            )}
            <Separator orientation="vertical" className="h-5" />
            <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={openNewVersion}>
              <Copy className="h-3 w-3" />Ny versjon
            </Button>
            {!isClosed && (
              <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => openNewQuote()}>
                <Plus className="h-3 w-3" />Nytt tilbud
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* History */}
      {historyQuotes.length > 0 && (
        <div>
          <button
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
            onClick={() => setShowHistory(!showHistory)}
          >
            {showHistory ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            Tidligere tilbud ({historyQuotes.length})
          </button>
          {showHistory && (
            <div className="space-y-2">
              {historyQuotes.map(q => (
                <Card key={q.id} className="p-3 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-medium">{q.quote_number} v{q.version}</p>
                      <Badge className={`text-[9px] ${QUOTE_STATUS_COLORS[q.status] || ""}`}>
                        {QUOTE_STATUS_LABELS[q.status] || q.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">{formatCurrency(q.total_amount)}</span>
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={async () => {
                        const { data: ql } = await supabase.from("quote_lines").select("*").eq("quote_id", q.id).order("sort_order");
                        openNewQuote(q, ql || []);
                      }}>
                        <Copy className="h-2.5 w-2.5" />Bruk som grunnlag
                      </Button>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {formatDate(q.created_at)}{q.valid_until && ` · Gyldig til ${formatDate(q.valid_until)}`}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      <QuoteBuilderSheet
        open={sheetOpen} onOpenChange={setSheetOpen}
        lines={lines} setLines={setLines}
        notes={notes} setNotes={setNotes}
        validUntil={validUntil} setValidUntil={setValidUntil}
        total={total} lineTotal={lineTotal}
        saving={saving} onSave={saveQuote}
        isNewVersion={sorted.length > 0}
      />

      {/* Send quote sheet */}
      <SendDocumentSheet
        open={sendSheetOpen}
        onOpenChange={setSendSheetOpen}
        context={{
          templateKey: "quote",
          placeholders: {
            customer_name: company?.name,
            contact_name: contact ? `${contact.first_name} ${contact.last_name || ""}`.trim() : undefined,
            deal_title: deal.title,
            site_address: site ? `${site.address || ""}, ${site.postal_code || ""} ${site.city || ""}`.trim() : undefined,
          },
          defaultTo: contact?.email || company?.email || undefined,
          attachments: quotePdf.data ? [{ fileName: `Tilbud_${activeQuote?.quote_number}.pdf`, filePath: quotePdf.data.file_path }] : [],
          dealId: deal.id,
          companyId: deal.company_id,
          activitySubject: `Tilbud ${activeQuote?.quote_number || ""}`,
        }}
        onSent={() => onRefresh()}
      />
    </div>
  );
}

/* ─── Quote Builder Sheet ──────────────────────────────── */
function QuoteBuilderSheet({
  open, onOpenChange, lines, setLines, notes, setNotes,
  validUntil, setValidUntil, total, lineTotal, saving, onSave, isNewVersion,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  lines: QuoteLine[];
  setLines: (l: QuoteLine[]) => void;
  notes: string;
  setNotes: (n: string) => void;
  validUntil: string;
  setValidUntil: (v: string) => void;
  total: number;
  lineTotal: (l: QuoteLine) => number;
  saving: boolean;
  onSave: () => void;
  isNewVersion: boolean;
}) {
  const updateLine = (i: number, field: string, value: string) => {
    const updated = [...lines];
    (updated[i] as any)[field] = value;
    setLines(updated);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isNewVersion ? "Ny tilbudsversjon" : "Nytt tilbud"}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-1.5">
            <Label>Gyldig til</Label>
            <Input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
          </div>

          <Separator />
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tilbudslinjer</p>
            <Button variant="outline" size="sm" onClick={() => setLines([...lines, { ...EMPTY_LINE }])} className="gap-1 text-xs">
              <Plus className="h-3 w-3" />Legg til linje
            </Button>
          </div>

          <div className="space-y-3">
            {lines.map((line, i) => (
              <Card key={i} className="p-3">
                <div className="space-y-2">
                  <Input placeholder="Beskrivelse *" value={line.description} onChange={e => updateLine(i, "description", e.target.value)} />
                  <div className="grid grid-cols-5 gap-2">
                    <Input type="number" placeholder="Antall" value={line.quantity} onChange={e => updateLine(i, "quantity", e.target.value)} />
                    <Select value={line.unit} onValueChange={v => updateLine(i, "unit", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="stk">stk</SelectItem>
                        <SelectItem value="timer">timer</SelectItem>
                        <SelectItem value="m">m</SelectItem>
                        <SelectItem value="m2">m²</SelectItem>
                        <SelectItem value="rs">rs</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input type="number" placeholder="Enhetspris" value={line.unit_price} onChange={e => updateLine(i, "unit_price", e.target.value)} />
                    <Input type="number" placeholder="Rabatt %" value={line.discount_percent} onChange={e => updateLine(i, "discount_percent", e.target.value)} className="text-xs" />
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{formatCurrency(lineTotal(line))}</span>
                      {lines.length > 1 && (
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground" onClick={() => setLines(lines.filter((_, idx) => idx !== i))}>×</Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Separator />
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Sum ekskl. MVA</span>
              <span className="font-semibold text-lg">{formatCurrency(total)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">MVA (25%)</span>
              <span>{formatCurrency(Math.round(total * 0.25))}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="font-semibold">Totalt inkl. MVA</span>
              <span className="text-xl font-bold">{formatCurrency(Math.round(total * 1.25))}</span>
            </div>
          </div>

          <Separator />
          <div className="space-y-1.5">
            <Label>Vilkår og merknader</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Forutsetninger, leveringstid, betalingsbetingelser..." />
          </div>
        </div>
        <SheetFooter className="flex flex-row justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Avbryt</Button>
          <Button onClick={onSave} disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Opprett tilbud
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
