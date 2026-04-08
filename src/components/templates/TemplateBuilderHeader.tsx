import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Save, Copy, Eye, Pencil, Star, StarOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { USE_CONTEXT_LABELS } from "@/lib/template-presets";

const CATEGORY_LABELS: Record<string, string> = {
  service: "Service",
  installation: "Installasjon",
  inspection: "Befaring",
  crm: "Salg og CRM",
  web: "Nettside",
  warranty: "Garanti/reklamasjon",
};

const CONTEXT_HELP: Record<string, string> = {
  service_visit: "Denne malen brukes i servicebesøk",
  installation_job: "Denne malen brukes i installasjonsjobber",
  site_visit: "Denne malen brukes ved befaring",
  crm_form: "Denne malen brukes i salg og CRM",
  web_form: "Denne malen brukes som nettskjema",
  warranty_case: "Denne malen brukes i garantisaker",
};

interface Props {
  name: string;
  category: string;
  useContext: string;
  saveStatus: "unsaved" | "saving" | "saved";
  onNameChange: (v: string) => void;
  onCategoryChange: (v: string) => void;
  onUseContextChange: (v: string) => void;
  onSave: () => void;
  onDuplicate?: () => void;
  saving: boolean;
  isEdit: boolean;
  previewMode: boolean;
  onTogglePreview: () => void;
  isDefault?: boolean;
  onToggleDefault?: () => void;
}

export default function TemplateBuilderHeader({
  name, category, useContext, saveStatus, onNameChange, onCategoryChange,
  onUseContextChange, onSave, onDuplicate, saving, isEdit, previewMode, onTogglePreview,
  isDefault, onToggleDefault,
}: Props) {
  const navigate = useNavigate();
  const helpText = useContext ? CONTEXT_HELP[useContext] : null;

  return (
    <header className="border-b border-border bg-card shrink-0">
      <div className="h-14 flex items-center gap-3 px-4">
        <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate("/tenant/templates")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <Input
          value={name}
          onChange={e => onNameChange(e.target.value)}
          placeholder="Malnavn..."
          className="h-9 max-w-xs border-0 bg-transparent text-base font-semibold placeholder:text-muted-foreground/50 focus-visible:ring-1"
        />

        <Select value={category} onValueChange={onCategoryChange}>
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={useContext || "_none"} onValueChange={v => onUseContextChange(v === "_none" ? "" : v)}>
          <SelectTrigger className="h-8 w-[160px] text-xs">
            <SelectValue placeholder="Brukskontekst..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_none">Ingen kontekst</SelectItem>
            {Object.entries(USE_CONTEXT_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Save status */}
        <Badge variant="outline" className="text-[10px] shrink-0">
          {saveStatus === "saving" ? "Lagrer..." : saveStatus === "saved" ? "✓ Lagret" : "Ikke lagret"}
        </Badge>

        {/* Default badge */}
        {isDefault && (
          <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 text-[10px] gap-1 shrink-0">
            <Star className="h-2.5 w-2.5" />Standard
          </Badge>
        )}

        <div className="flex-1" />

        {/* Preview toggle */}
        <div className="flex items-center border border-border rounded-md overflow-hidden">
          <Button
            variant={previewMode ? "ghost" : "secondary"}
            size="sm"
            className="rounded-none h-8 text-xs"
            onClick={() => previewMode && onTogglePreview()}
          >
            <Pencil className="h-3 w-3 mr-1" /> Bygg
          </Button>
          <Button
            variant={previewMode ? "secondary" : "ghost"}
            size="sm"
            className="rounded-none h-8 text-xs"
            onClick={() => !previewMode && onTogglePreview()}
          >
            <Eye className="h-3 w-3 mr-1" /> Forhåndsvis
          </Button>
        </div>

        {/* Default toggle */}
        {isEdit && useContext && onToggleDefault && (
          <Button variant="outline" size="sm" onClick={onToggleDefault} className="gap-1.5">
            {isDefault ? <StarOff className="h-3.5 w-3.5" /> : <Star className="h-3.5 w-3.5" />}
            {isDefault ? "Fjern standard" : "Sett som standard"}
          </Button>
        )}

        {isEdit && onDuplicate && (
          <Button variant="outline" size="sm" onClick={onDuplicate}>
            <Copy className="h-3.5 w-3.5 mr-1.5" /> Dupliser
          </Button>
        )}

        <Button size="sm" onClick={onSave} disabled={saving || !name.trim()}>
          {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
          {isEdit ? "Lagre" : "Opprett mal"}
        </Button>
      </div>
      {helpText && (
        <div className="px-4 pb-2">
          <p className="text-[11px] text-muted-foreground">{helpText}</p>
        </div>
      )}
    </header>
  );
}
