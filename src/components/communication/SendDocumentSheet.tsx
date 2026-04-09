import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Send, Loader2, FileText, Plus, Trash2, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { EMAIL_TEMPLATES, applyPlaceholders, type TemplatePlaceholders } from "@/lib/email-templates";

export interface SendDocumentContext {
  templateKey: string;
  placeholders: TemplatePlaceholders;
  /** Pre-filled recipient email */
  defaultTo?: string;
  /** Document info to display as attachment */
  attachments: { fileName: string; filePath: string }[];
  /** For activity logging */
  dealId?: string;
  companyId?: string;
  caseId?: string;
  /** Activity subject prefix */
  activitySubject?: string;
}

interface SendDocumentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: SendDocumentContext;
  onSent?: () => void;
}

export function SendDocumentSheet({ open, onOpenChange, context, onSent }: SendDocumentSheetProps) {
  const { tenantId, user } = useAuth();
  const template = EMAIL_TEMPLATES[context.templateKey];

  const [toList, setToList] = useState<string[]>([""]);
  const [ccList, setCcList] = useState<string[]>([]);
  const [showCc, setShowCc] = useState(false);
  const [subject, setSubject] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Prefill on open
  useEffect(() => {
    if (open && template) {
      const filled = applyPlaceholders(template.subject, context.placeholders);
      setSubject(filled);
      setBodyText(applyPlaceholders(template.body, context.placeholders));
      setToList(context.defaultTo ? [context.defaultTo] : [""]);
      setCcList([]);
      setShowCc(false);
      setSent(false);
    }
  }, [open, context.templateKey]);

  const validTo = toList.filter(e => e.trim());
  const canSend = validTo.length > 0 && bodyText.trim().length > 0 && subject.trim().length > 0;

  const handleSend = async () => {
    if (!canSend || !tenantId) return;
    setSending(true);
    try {
      const bodyHtml = bodyText.split("\n").map(line => `<p>${line || "&nbsp;"}</p>`).join("");
      const { data, error } = await supabase.functions.invoke("email-send", {
        body: {
          to: validTo,
          cc: ccList.filter(e => e.trim()),
          subject: subject.trim(),
          body_html: bodyHtml,
          case_id: context.caseId,
        },
      });
      if (error) throw error;
      if (data?.error) {
        // If no credentials, save as draft instead
        if (data.error === "No connected credentials" || data.error === "No mailbox configured") {
          await logActivity("draft");
          toast.success("Utkast lagret (ingen e-posttilkobling konfigurert)");
          setSent(true);
          onSent?.();
          return;
        }
        throw new Error(data.error);
      }

      await logActivity("sent");
      toast.success("E-post sendt");
      setSent(true);
      onSent?.();
    } catch (err: any) {
      console.error("Send error:", err);
      // Fallback: log as draft
      if (err.message?.includes("No connected") || err.message?.includes("No mailbox") || err.message?.includes("credentials")) {
        await logActivity("draft");
        toast.success("Utkast lagret (e-posttilkobling ikke tilgjengelig)");
        setSent(true);
        onSent?.();
        return;
      }
      toast.error("Kunne ikke sende e-post");
    } finally {
      setSending(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!tenantId) return;
    setSending(true);
    await logActivity("draft");
    toast.success("Utkast lagret");
    setSent(true);
    setSending(false);
    onSent?.();
  };

  const logActivity = async (action: "sent" | "draft") => {
    if (!tenantId) return;
    const actSubject = context.activitySubject || template?.label || "Dokument";
    const recipient = validTo.join(", ");

    await supabase.from("crm_activities").insert({
      tenant_id: tenantId,
      deal_id: context.dealId || null,
      company_id: context.companyId || null,
      type: action === "sent" ? "email" : "note",
      subject: action === "sent"
        ? `${actSubject} sendt til ${recipient}`
        : `${actSubject} – utkast opprettet`,
      body: action === "sent"
        ? `Emne: ${subject}\nMottaker: ${recipient}\nVedlegg: ${context.attachments.map(a => a.fileName).join(", ")}`
        : `Emne: ${subject}\nPlanlagt mottaker: ${recipient}`,
      created_by: user?.id,
    } as any);
  };

  const updateItem = (list: string[], setList: (v: string[]) => void, idx: number, value: string) => {
    const updated = [...list];
    updated[idx] = value;
    setList(updated);
  };

  const removeItem = (list: string[], setList: (v: string[]) => void, idx: number) => {
    setList(list.filter((_, i) => i !== idx));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            {template?.label ? `Send ${template.label.toLowerCase()}` : "Send dokument"}
          </SheetTitle>
        </SheetHeader>

        {sent ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            <p className="text-sm font-medium">Sendt</p>
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Lukk</Button>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Attachments preview */}
            {context.attachments.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Vedlegg</Label>
                {context.attachments.map((att, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="text-sm flex-1 truncate">{att.fileName}</span>
                    <Badge variant="secondary" className="text-[10px]">PDF</Badge>
                  </div>
                ))}
              </div>
            )}

            {context.attachments.length === 0 && (
              <div className="flex items-center gap-2 p-3 border border-amber-200 bg-amber-50 rounded-md">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <p className="text-xs text-amber-700">Ingen PDF generert ennå. Generer PDF først for å sende som vedlegg.</p>
              </div>
            )}

            <Separator />

            {/* To */}
            <div className="space-y-1.5">
              <Label className="text-xs">Til</Label>
              {toList.map((email, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={email}
                    onChange={e => updateItem(toList, setToList, idx, e.target.value)}
                    placeholder="e-post@example.com"
                    type="email"
                    className="flex-1"
                    disabled={sending}
                  />
                  {toList.length > 1 && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeItem(toList, setToList, idx)} disabled={sending}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => setToList([...toList, ""])} disabled={sending}>
                <Plus className="h-3 w-3" /> Legg til mottaker
              </Button>
            </div>

            {/* Cc */}
            <button type="button" onClick={() => setShowCc(!showCc)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              {showCc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />} Cc
            </button>
            {showCc && (
              <div className="space-y-1.5">
                {ccList.map((email, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input value={email} onChange={e => updateItem(ccList, setCcList, idx, e.target.value)} placeholder="e-post@example.com" type="email" className="flex-1" disabled={sending} />
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeItem(ccList, setCcList, idx)} disabled={sending}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => setCcList([...ccList, ""])} disabled={sending}>
                  <Plus className="h-3 w-3" /> Legg til
                </Button>
              </div>
            )}

            {/* Subject */}
            <div className="space-y-1.5">
              <Label className="text-xs">Emne</Label>
              <Input value={subject} onChange={e => setSubject(e.target.value)} disabled={sending} />
            </div>

            {/* Body */}
            <div className="space-y-1.5">
              <Label className="text-xs">Melding</Label>
              <Textarea value={bodyText} onChange={e => setBodyText(e.target.value)} rows={8} disabled={sending} />
            </div>
          </div>
        )}

        {!sent && (
          <SheetFooter className="flex gap-2 pt-2">
            <Button variant="outline" onClick={handleSaveDraft} disabled={sending} className="gap-1.5">
              Lagre utkast
            </Button>
            <Button onClick={handleSend} disabled={sending || !canSend} className="gap-1.5">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
