import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, XCircle, Thermometer, Star, ClipboardCheck, FileText } from "lucide-react";
import {
  ServiceReportData,
  MEASUREMENT_FIELDS,
  CONDITION_RATINGS,
} from "@/lib/service-report-schema";
import { formatDate } from "@/lib/domain-labels";

interface Props {
  data: ServiceReportData;
}

export function ServiceReportView({ data }: Props) {
  const rating = CONDITION_RATINGS.find(r => r.value === data.condition_rating);
  const checkedCount = data.checklist.filter(c => c.checked).length;
  const hasMeasurements = MEASUREMENT_FIELDS.some(f => data.measurements[f.key] != null);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs gap-1">
          <ClipboardCheck className="h-3 w-3" />Servicerapport v{data.schema_version}
        </Badge>
        {data.completed_date && (
          <span className="text-xs text-muted-foreground">Utført {formatDate(data.completed_date)}</span>
        )}
      </div>

      {/* Customer / asset info */}
      <Card className="p-4 bg-muted/30">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <Field label="Kunde" value={data.customer_name} />
          <Field label="Adresse" value={data.site_address} />
          <Field label="Produsent" value={data.asset_manufacturer} />
          <Field label="Modell" value={data.asset_model} />
          <Field label="Serienr. utedel" value={data.serial_number_outdoor} />
          <Field label="Serienr. innedel" value={data.serial_number_indoor} />
        </div>
      </Card>

      {/* Checklist */}
      <section>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <ClipboardCheck className="h-3.5 w-3.5" />Servicepunkter ({checkedCount}/{data.checklist.length})
        </h4>
        <div className="grid grid-cols-1 gap-1">
          {data.checklist.map(item => (
            <div key={item.key} className="flex items-start gap-2 text-sm py-1">
              {item.checked
                ? <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                : <XCircle className="h-4 w-4 text-muted-foreground/40 mt-0.5 shrink-0" />
              }
              <div className="min-w-0">
                <span className={item.checked ? "" : "text-muted-foreground"}>{item.label}</span>
                {item.note && <p className="text-xs text-muted-foreground mt-0.5">{item.note}</p>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Measurements */}
      {hasMeasurements && (
        <>
          <Separator />
          <section>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Thermometer className="h-3.5 w-3.5" />Målinger
            </h4>
            <div className="grid grid-cols-3 gap-3">
              {MEASUREMENT_FIELDS.filter(f => data.measurements[f.key] != null).map(f => (
                <Card key={f.key} className="p-3 text-center">
                  <p className="text-lg font-bold">{data.measurements[f.key]}<span className="text-xs text-muted-foreground ml-1">{f.unit}</span></p>
                  <p className="text-[11px] text-muted-foreground">{f.label}</p>
                </Card>
              ))}
            </div>
          </section>
        </>
      )}

      {/* Condition rating */}
      {rating && (
        <>
          <Separator />
          <section>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5" />Tilstandsvurdering
            </h4>
            <div className={`flex items-center gap-2 text-sm font-medium ${rating.color}`}>
              <span className="text-lg font-bold">{rating.value}/5</span>
              <span>{rating.label}</span>
            </div>
          </section>
        </>
      )}

      {/* Text sections */}
      {(data.findings_summary || data.actions_taken_summary || data.recommendations) && (
        <>
          <Separator />
          <div className="space-y-3">
            {data.findings_summary && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Funn</p>
                <p className="text-sm whitespace-pre-wrap">{data.findings_summary}</p>
              </div>
            )}
            {data.actions_taken_summary && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Utførte tiltak</p>
                <p className="text-sm whitespace-pre-wrap">{data.actions_taken_summary}</p>
              </div>
            )}
            {data.recommendations && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Anbefalinger</p>
                <p className="text-sm whitespace-pre-wrap">{data.recommendations}</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Technician */}
      <Separator />
      <div className="flex items-center justify-between text-sm">
        <div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Utført av</p>
          <p className="font-medium">{data.technician_name || "–"}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Dato</p>
          <p className="font-medium">{formatDate(data.completed_date)}</p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="mt-0.5 font-medium">{value || "–"}</p>
    </div>
  );
}
