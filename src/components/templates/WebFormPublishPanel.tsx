import { Globe, Code, ExternalLink, Copy, Check, AlertCircle, CheckCircle2, Inbox } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const WEB_FORM_TYPES = [
  { value: "contact", label: "Kontaktskjema", desc: "Oppretter sak i Postkontoret" },
  { value: "service", label: "Bestill service", desc: "Oppretter serviceforespørsel i Postkontoret" },
  { value: "quote", label: "Be om pris", desc: "Oppretter ny lead/deal i CRM" },
  { value: "site_visit", label: "Bestill befaring", desc: "Oppretter befaringsforespørsel i CRM" },
  { value: "general", label: "Generell henvendelse", desc: "Oppretter generell sak i Postkontoret" },
];

interface WebFormPublishPanelProps {
  isPublished: boolean;
  publishKey: string | null;
  webFormType: string;
  successMessage: string;
  onTogglePublish: (v: boolean) => void;
  onFormTypeChange: (v: string) => void;
  onSuccessMessageChange: (v: string) => void;
  isEdit: boolean;
  isSaved: boolean;
  templateId?: string | null;
}

export default function WebFormPublishPanel({
  isPublished, publishKey, webFormType, successMessage,
  onTogglePublish, onFormTypeChange, onSuccessMessageChange,
  isEdit, isSaved, templateId,
}: WebFormPublishPanelProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [submissionCount, setSubmissionCount] = useState<number | null>(null);
  const [lastSubmission, setLastSubmission] = useState<string | null>(null);

  useEffect(() => {
    if (!templateId) return;
    (async () => {
      const { count } = await supabase
        .from("form_submissions" as any)
        .select("id", { count: "exact", head: true })
        .eq("template_id", templateId);
      setSubmissionCount(count ?? 0);

      const { data } = await supabase
        .from("form_submissions" as any)
        .select("submitted_at")
        .eq("template_id", templateId)
        .order("submitted_at", { ascending: false })
        .limit(1);
      if (data && data.length > 0) {
        setLastSubmission((data[0] as any).submitted_at);
      }
    })();
  }, [templateId]);

  const publicUrl = publishKey ? `${window.location.origin}/forms/${publishKey}` : null;
  const embedCode = publicUrl
    ? `<iframe src="${publicUrl}" width="100%" height="900" frameborder="0" style="border:none; max-width:640px;"></iframe>`
    : "";

  const currentType = WEB_FORM_TYPES.find(t => t.value === webFormType);

  const handleCopyLink = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyEmbed = () => {
    navigator.clipboard.writeText(embedCode);
    setCopiedEmbed(true);
    setTimeout(() => setCopiedEmbed(false), 2000);
  };

  return (
    <Card className={`mb-6 overflow-hidden ${isPublished ? "border-green-500/40 bg-green-50/50 dark:bg-green-950/20" : "border-amber-500/30 bg-amber-50/30 dark:bg-amber-950/10"}`}>
      <CardHeader className="pb-3 pt-4 px-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded-md ${isPublished ? "bg-green-100 dark:bg-green-900/40" : "bg-amber-100 dark:bg-amber-900/40"}`}>
              <Globe className={`h-4 w-4 ${isPublished ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`} />
            </div>
            <CardTitle className="text-sm font-semibold">Bruk på nettside</CardTitle>
          </div>
          <Badge variant={isPublished ? "default" : "secondary"} className={`text-[10px] ${isPublished ? "bg-green-600 hover:bg-green-600" : ""}`}>
            {isPublished ? (
              <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Publisert</span>
            ) : (
              <span className="flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Ikke publisert</span>
            )}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="px-5 pb-5 space-y-4">
        <p className="text-xs text-muted-foreground -mt-1">
          Her gjør du skjemaet tilgjengelig på nettsiden og henter kode eller lenke.
        </p>

        {/* Publish toggle */}
        <div className="flex items-center justify-between py-2 px-3 rounded-md bg-background border">
          <div>
            <p className="text-sm font-medium">Publiser skjema</p>
            <p className="text-[11px] text-muted-foreground">
              {isPublished ? "Skjemaet er tilgjengelig på offentlig lenke" : "Gjør skjemaet tilgjengelig via lenke og embed-kode"}
            </p>
          </div>
          <Switch checked={isPublished} onCheckedChange={onTogglePublish} />
        </div>

        {/* Form type */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Skjematype – hva skjer ved innsending?</Label>
          <Select value={webFormType} onValueChange={onFormTypeChange}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WEB_FORM_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {currentType && (
            <p className="text-[11px] text-muted-foreground pl-0.5">→ {currentType.desc}</p>
          )}
        </div>

        {/* Success message */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Suksessmelding etter innsending</Label>
          <Textarea
            value={successMessage}
            onChange={e => onSuccessMessageChange(e.target.value)}
            rows={2}
            className="text-sm resize-none"
            placeholder="Takk for din henvendelse!"
          />
        </div>

        {/* Published: show link + embed */}
        {isPublished && publishKey ? (
          <div className="space-y-4 pt-3 border-t border-border">
            <p className="text-xs text-green-600 dark:text-green-400 font-medium">
              ✓ Publisert og klar til bruk på nettside. Kopier lenken eller koden under.
            </p>
            {/* Direct link */}
            <div className="space-y-2">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <ExternalLink className="h-3 w-3" /> Offentlig lenke
              </Label>
              <div className="flex gap-2">
                <Input value={publicUrl || ""} readOnly className="text-xs font-mono h-9 flex-1 bg-background" />
                <Button variant="outline" size="sm" className="h-9 px-3 shrink-0 gap-1.5" onClick={handleCopyLink}>
                  {copiedLink ? <><Check className="h-3.5 w-3.5" /> Kopiert</> : <><Copy className="h-3.5 w-3.5" /> Kopier lenke</>}
                </Button>
                <Button variant="outline" size="sm" className="h-9 px-3 shrink-0" asChild>
                  <a href={publicUrl!} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span className="ml-1.5">Test skjema</span>
                  </a>
                </Button>
              </div>
            </div>

            {/* Embed code */}
            <div className="space-y-2">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Code className="h-3 w-3" /> Kode du limer inn på nettsiden
              </Label>
              <div className="relative">
                <Textarea value={embedCode} readOnly rows={3} className="text-[11px] font-mono resize-none pr-20 bg-background" />
                <Button
                  variant={copiedEmbed ? "default" : "outline"}
                  size="sm"
                  className="absolute top-2 right-2 h-7 text-[11px] gap-1"
                  onClick={handleCopyEmbed}
                >
                  {copiedEmbed ? <><Check className="h-3 w-3" /> Kopiert!</> : <><Copy className="h-3 w-3" /> Kopier kode</>}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Lim inn denne koden der skjemaet skal vises på nettsiden din.
              </p>
              <p className="text-[11px] text-muted-foreground/70">
                Usikker? Bruk lenken direkte, eller send koden til utvikleren din.
              </p>
            </div>
          </div>
        ) : isPublished && !publishKey ? (
          <div className="pt-3 border-t border-border">
            <p className="text-xs text-amber-600 flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" />
              {!isEdit ? "Lagre malen for å få lenke og embed-kode." : "Lagre endringene for å generere lenke."}
            </p>
          </div>
        ) : (
          <div className="pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Publiser skjemaet for å få offentlig lenke og embed-kode du kan bruke på nettsiden.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
