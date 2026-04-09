import {
  Type, AlignLeft, CheckSquare, ListChecks, ChevronDown,
  Hash, Calendar, Star, Gauge, ImageIcon, Heading, CircleDot,
} from "lucide-react";

export const FIELD_TYPE_META: Record<string, { label: string; icon: typeof Type; description: string }> = {
  section_header: { label: "Seksjon", icon: Heading, description: "Gruppér spørsmål under en overskrift" },
  text: { label: "Kort tekst", icon: Type, description: "Navn, referanse, kort svar" },
  textarea: { label: "Lang tekst", icon: AlignLeft, description: "Notater, beskrivelser, kommentarer" },
  checkbox: { label: "Ja / nei", icon: CheckSquare, description: "Utført, godkjent, bekreftet" },
  checkbox_list: { label: "Flere valg", icon: ListChecks, description: "Velg én eller flere fra en liste" },
  dropdown: { label: "Nedtrekksliste", icon: ChevronDown, description: "Velg ett svar fra en kompakt meny" },
  number: { label: "Tall", icon: Hash, description: "Mengde, antall, telleverdi" },
  date: { label: "Dato", icon: Calendar, description: "Velg en dato" },
  rating: { label: "Vurdering 1–5", icon: Star, description: "Tilstand, kvalitet, karakter" },
  measurement: { label: "Måling", icon: Gauge, description: "Verdi med enhet (bar, °C, kW)" },
  file: { label: "Fil / bilde", icon: ImageIcon, description: "Last opp dokumentasjon" },
};

interface Props {
  onAddField: (type: string) => void;
}

export default function FieldPalette({ onAddField }: Props) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-3">
        Legg til spørsmål
      </p>
      {Object.entries(FIELD_TYPE_META).map(([key, meta]) => (
        <button
          key={key}
          onClick={() => onAddField(key)}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left hover:bg-primary/5 transition-colors group"
        >
          <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
            <meta.icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium leading-tight">{meta.label}</p>
            <p className="text-[10px] text-muted-foreground/60 leading-tight truncate">{meta.description}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
