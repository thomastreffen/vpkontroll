import { Button } from "@/components/ui/button";
import {
  Type, AlignLeft, CheckSquare, ListChecks, ChevronDown,
  Hash, Calendar, Star, Gauge, ImageIcon, Heading,
} from "lucide-react";

export const FIELD_TYPE_META: Record<string, { label: string; icon: typeof Type; description: string }> = {
  section_header: { label: "Seksjon", icon: Heading, description: "Gruppér felter visuelt" },
  text: { label: "Tekstfelt", icon: Type, description: "Kort tekst, navn, referanser" },
  textarea: { label: "Tekstområde", icon: AlignLeft, description: "Fritekst, notater, beskrivelse" },
  checkbox: { label: "Sjekkpunkt", icon: CheckSquare, description: "Ja/nei, utført/ikke utført" },
  checkbox_list: { label: "Sjekkliste", icon: ListChecks, description: "Flere valg fra en liste" },
  dropdown: { label: "Nedtrekksliste", icon: ChevronDown, description: "Velg ett alternativ" },
  number: { label: "Tallfelt", icon: Hash, description: "Tall, mengde, antall" },
  date: { label: "Dato", icon: Calendar, description: "Datovelger" },
  rating: { label: "Vurdering", icon: Star, description: "Tilstand 1–5" },
  measurement: { label: "Måling", icon: Gauge, description: "Verdi + enhet (bar, °C...)" },
  file: { label: "Fil/bilde", icon: ImageIcon, description: "Last opp dokumentasjon" },
};

interface Props {
  onAddField: (type: string) => void;
}

export default function FieldPalette({ onAddField }: Props) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-2">
        Feltbibliotek
      </p>
      {Object.entries(FIELD_TYPE_META).map(([key, meta]) => (
        <button
          key={key}
          onClick={() => onAddField(key)}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left hover:bg-accent/50 transition-colors group"
        >
          <div className="h-7 w-7 rounded bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10">
            <meta.icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium leading-tight">{meta.label}</p>
            <p className="text-[10px] text-muted-foreground leading-tight truncate">{meta.description}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
