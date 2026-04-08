import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, ClipboardCheck, Thermometer, Star, FileText } from "lucide-react";
import {
  ServiceReportData,
  MEASUREMENT_FIELDS,
  CONDITION_RATINGS,
} from "@/lib/service-report-schema";
import { format } from "date-fns";

interface Props {
  initialData: ServiceReportData;
  onSave: (data: ServiceReportData, markCompleted: boolean) => Promise<void>;
  onCancel: () => void;
  visitStatus?: string;
}

export function ServiceReportForm({ initialData, onSave, onCancel, visitStatus }: Props) {
  const [data, setData] = useState<ServiceReportData>({ ...initialData });
  const [saving, setSaving] = useState(false);
  const [markCompleted, setMarkCompleted] = useState(visitStatus !== "completed");

  const update = <K extends keyof ServiceReportData>(key: K, value: ServiceReportData[K]) =>
    setData(prev => ({ ...prev, [key]: value }));

  const updateChecklist = (idx: number, field: "checked" | "note", value: any) => {
    const list = [...data.checklist];
    list[idx] = { ...list[idx], [field]: value };
    update("checklist", list);
  };

  const updateMeasurement = (key: string, value: string) => {
    const num = value === "" ? null : parseFloat(value);
    update("measurements", { ...data.measurements, [key]: num });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const saveData = { ...data, completed_date: data.completed_date || format(new Date(), "yyyy-MM-dd") };
      await onSave(saveData);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Section 1: Customer & Asset info (readonly prefilled) */}
      <section>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4" />Kundeinformasjon
        </h3>
        <Card className="p-4 bg-muted/30">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <ReadonlyField label="Kunde" value={data.customer_name} />
            <ReadonlyField label="Adresse" value={data.site_address} />
            <ReadonlyField label="Produsent" value={data.asset_manufacturer} />
            <ReadonlyField label="Modell" value={data.asset_model} />
            <ReadonlyField label="Serienr. utedel" value={data.serial_number_outdoor} />
            <ReadonlyField label="Serienr. innedel" value={data.serial_number_indoor} />
            <ReadonlyField label="Energikilde" value={data.energy_source} />
          </div>
        </Card>
      </section>

      <Separator />

      {/* Section 2: Checklist */}
      <section>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4" />Servicepunkter
        </h3>
        <div className="space-y-2">
          {data.checklist.map((item, idx) => (
            <Card key={item.key} className="p-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={item.checked}
                  onCheckedChange={(checked) => updateChecklist(idx, "checked", !!checked)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${item.checked ? "line-through text-muted-foreground" : ""}`}>
                    {item.label}
                  </p>
                  <Input
                    placeholder="Notat (valgfritt)..."
                    value={item.note || ""}
                    onChange={(e) => updateChecklist(idx, "note", e.target.value)}
                    className="mt-1.5 h-8 text-xs"
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <Separator />

      {/* Section 3: Measurements */}
      <section>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Thermometer className="h-4 w-4" />Målinger
        </h3>
        <p className="text-xs text-muted-foreground mb-3">Alle felter er valgfrie. Fyll inn de målingene som er relevante.</p>
        <div className="grid grid-cols-2 gap-3">
          {MEASUREMENT_FIELDS.map(field => (
            <div key={field.key} className="space-y-1">
              <Label className="text-xs">{field.label}</Label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.1"
                  placeholder="–"
                  value={data.measurements[field.key] ?? ""}
                  onChange={(e) => updateMeasurement(field.key, e.target.value)}
                  className="pr-10 h-9"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {field.unit}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Separator />

      {/* Section 4: Condition rating */}
      <section>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Star className="h-4 w-4" />Tilstandsvurdering
        </h3>
        <div className="space-y-1.5">
          {CONDITION_RATINGS.map(r => (
            <button
              key={r.value}
              type="button"
              onClick={() => update("condition_rating", r.value)}
              className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-colors text-sm ${
                data.condition_rating === r.value
                  ? "border-primary bg-primary/5 font-medium"
                  : "border-transparent hover:bg-muted/50"
              }`}
            >
              <span className={`font-bold ${r.color}`}>{r.value}</span>
              <span className={data.condition_rating === r.value ? r.color : "text-foreground"}>
                {r.label}
              </span>
            </button>
          ))}
        </div>
      </section>

      <Separator />

      {/* Section 5: Findings, actions, recommendations */}
      <section className="space-y-4">
        <div className="space-y-1.5">
          <Label>Funn og observasjoner</Label>
          <Textarea
            rows={3}
            placeholder="Beskriv eventuelle funn..."
            value={data.findings_summary}
            onChange={(e) => update("findings_summary", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Utførte tiltak</Label>
          <Textarea
            rows={3}
            placeholder="Beskriv utførte tiltak..."
            value={data.actions_taken_summary}
            onChange={(e) => update("actions_taken_summary", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Anbefalinger</Label>
          <Textarea
            rows={2}
            placeholder="Anbefalinger for videre oppfølging..."
            value={data.recommendations}
            onChange={(e) => update("recommendations", e.target.value)}
          />
        </div>
      </section>

      <Separator />

      {/* Section 6: Technician & date */}
      <section>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Utført av</Label>
            <Input value={data.technician_name} onChange={(e) => update("technician_name", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Dato</Label>
            <Input
              type="date"
              value={data.completed_date || format(new Date(), "yyyy-MM-dd")}
              onChange={(e) => update("completed_date", e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button variant="outline" onClick={onCancel}>Avbryt</Button>
        <Button onClick={handleSave} disabled={saving} className="gap-1.5">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Lagre rapport
        </Button>
      </div>
    </div>
  );
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="mt-0.5 font-medium">{value || "–"}</p>
    </div>
  );
}
