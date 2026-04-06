import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Send, Loader2, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

interface EmailComposeFormProps {
  caseId?: string;
  defaultTo?: string;
  defaultSubject?: string;
  onSent?: () => void;
}

export function EmailComposeForm({ caseId, defaultTo, defaultSubject, onSent }: EmailComposeFormProps) {
  const [toList, setToList] = useState<string[]>(defaultTo ? [defaultTo] : [""]);
  const [ccList, setCcList] = useState<string[]>([]);
  const [showCc, setShowCc] = useState(false);
  const [subject, setSubject] = useState(defaultSubject || "");
  const [bodyText, setBodyText] = useState("");
  const [sending, setSending] = useState(false);

  const validTo = toList.filter((e) => e.trim());
  const canSend = validTo.length > 0 && bodyText.trim().length > 0 && subject.trim().length > 0;

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      const bodyHtml = bodyText.split("\n").map((line) => `<p>${line || "&nbsp;"}</p>`).join("");
      const { data, error } = await supabase.functions.invoke("email-send", {
        body: {
          to: validTo,
          cc: ccList.filter((e) => e.trim()),
          subject: subject.trim(),
          body_html: bodyHtml,
          case_id: caseId,
        },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      toast.success("E-post sendt");
      setBodyText("");
      onSent?.();
    } catch (err: any) {
      console.error("Send error:", err);
      toast.error("Kunne ikke sende e-post");
    } finally {
      setSending(false);
    }
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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Mail className="h-4 w-4" /> Svar / Ny e-post
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* To */}
        <div className="space-y-1.5">
          <Label className="text-xs">Til</Label>
          {toList.map((email, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Input
                value={email}
                onChange={(e) => updateItem(toList, setToList, idx, e.target.value)}
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
            <Label className="text-xs">Cc</Label>
            {ccList.map((email, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input value={email} onChange={(e) => updateItem(ccList, setCcList, idx, e.target.value)} placeholder="e-post@example.com" type="email" className="flex-1" disabled={sending} />
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
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Emne..." disabled={sending} />
        </div>

        {/* Body */}
        <div className="space-y-1.5">
          <Label className="text-xs">Melding</Label>
          <Textarea value={bodyText} onChange={(e) => setBodyText(e.target.value)} rows={5} placeholder="Skriv meldingen din her..." disabled={sending} />
        </div>

        {/* Send */}
        <div className="flex justify-end pt-2">
          <Button onClick={handleSend} disabled={sending || !canSend} className="gap-1.5">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
