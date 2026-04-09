import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Save, Copy, Eye, Pencil, Star, StarOff, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CATEGORY_TO_CONTEXT, USE_CONTEXT_LABELS } from "@/lib/template-presets";
import React from "react";

const USE_AREA_OPTIONS: { value: string; label: string; description: string }[] = [
  { value: "service", label: "Servicebesøk", description: "Brukes på servicebesøk og i serviceavtaler" },
  { value: "installation", label: "Installasjonsjobb", description: "Brukes i installasjonsjobber under fanen Skjema" },
  { value: "inspection", label: "Befaring", description: "Brukes på deal/befaring i salgsflyten" },
  { value: "crm", label: "Salgsoppfølging", description: "Brukes i salg og CRM-oppfølging" },
  { value: "web", label: "Nettskjema", description: "Brukes som skjema på nettside for leadfangst" },
  { value: "warranty", label: "Garanti / reklamasjon", description: "Brukes i garanti- og reklamasjonssaker" },
];

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
  nameError?: boolean;
  nameInputRef?: React.RefObject<HTMLInputElement>;
}

export default function TemplateBuilderHeader({
  name, category, useContext, saveStatus, onNameChange, onCategoryChange,
  onUseContextChange, onSave, onDuplicate, saving, isEdit, previewMode, onTogglePreview,
  isDefault, onToggleDefault, nameError, nameInputRef,
}: Props) {
  const navigate = useNavigate();
  const activeArea = USE_AREA_OPTIONS.find(a => a.value === category);

  const handleAreaChange = (value: string) => {
    onCategoryChange(value);
  };

  return (
    <header className="border-b border-border bg-card shrink-0">
      <div className="h-14 flex items-center gap-3 px-4">
        <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate("/tenant/templates")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="flex flex-col">
          <Input
            ref={nameInputRef}
            value={name}
            onChange={e => onNameChange(e.target.value)}
            placeholder="F.eks. Kontaktskjema nettside"
            className={`h-9 max-w-xs border-0 bg-transparent text-base font-semibold placeholder:text-muted-foreground/50 focus-visible:ring-1 ${
              nameError ? "ring-2 ring-destructive" : ""
            }`}
          />
        </div>

        <Select value={category} onValueChange={handleAreaChange}>
          <SelectTrigger className="h-8 w-[180px] text-xs">
            <SelectValue placeholder="Velg bruksområde..." />
          </SelectTrigger>
          <SelectContent>
            {USE_AREA_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Save status */}
        <Badge variant="outline" className={`text-[10px] shrink-0 ${saveStatus === "unsaved" ? "border-amber-500/50 text-amber-600" : saveStatus === "saved" ? "border-green-500/50 text-green-600" : ""}`}>
          {saveStatus === "saving" ? "Lagrer..." : saveStatus === "saved" ? "✓ Lagret" : "● Ikke lagret"}
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

        <Button size="sm" onClick={onSave} disabled={saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
          {isEdit ? "Lagre endringer" : "Opprett mal"}
        </Button>
      </div>

      {/* Context explanation strip */}
      {activeArea && (
        <div className="px-4 pb-2.5 flex items-center gap-2">
          <Info className="h-3.5 w-3.5 text-primary/60 shrink-0" />
          <p className="text-[11px] text-muted-foreground">
            <span className="font-medium text-foreground/80">{activeArea.label}:</span>{" "}
            {activeArea.description}
          </p>
        </div>
      )}
    </header>
  );
}
