import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle } from "lucide-react";
import type { SignoffData } from "@/lib/form-pdf";

interface FormSignoffSectionProps {
  signoff: SignoffData;
  onChange: (signoff: SignoffData) => void;
  readonly?: boolean;
}

export function FormSignoffSection({ signoff, onChange, readonly = false }: FormSignoffSectionProps) {
  const update = (partial: Partial<SignoffData>) => {
    onChange({ ...signoff, ...partial });
  };

  if (readonly) {
    return (
      <div className="space-y-3 border rounded-lg p-4 bg-muted/20">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Signering / bekreftelse</p>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Tekniker</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-medium">{signoff.technician_name || "–"}</span>
              {signoff.signed_by_technician ? (
                <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 gap-1">
                  <CheckCircle2 className="h-2.5 w-2.5" />Bekreftet
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] text-muted-foreground gap-1">
                  <XCircle className="h-2.5 w-2.5" />Ikke bekreftet
                </Badge>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Kunde</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-medium">{signoff.customer_name || "–"}</span>
              {signoff.signed_by_customer ? (
                <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 gap-1">
                  <CheckCircle2 className="h-2.5 w-2.5" />Bekreftet
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] text-muted-foreground gap-1">
                  <XCircle className="h-2.5 w-2.5" />Ikke bekreftet
                </Badge>
              )}
            </div>
          </div>
        </div>
        {signoff.signed_at && <p className="text-xs text-muted-foreground">Signert: {new Date(signoff.signed_at).toLocaleDateString("nb-NO")}</p>}
        {signoff.comment && (
          <div>
            <p className="text-xs text-muted-foreground">Kommentar</p>
            <p className="text-sm mt-0.5">{signoff.comment}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 border rounded-lg p-4">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Signering / bekreftelse</p>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Tekniker</Label>
          <Input
            value={signoff.technician_name}
            onChange={e => update({ technician_name: e.target.value })}
            placeholder="Navn på tekniker"
            className="h-8 text-sm"
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={signoff.signed_by_technician}
              onCheckedChange={c => update({
                signed_by_technician: !!c,
                signed_at: c ? new Date().toISOString() : signoff.signed_at,
              })}
            />
            <span className="text-sm">Utført bekreftet</span>
          </label>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Kunde</Label>
          <Input
            value={signoff.customer_name}
            onChange={e => update({ customer_name: e.target.value })}
            placeholder="Navn på kunde"
            className="h-8 text-sm"
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={signoff.signed_by_customer}
              onCheckedChange={c => update({
                signed_by_customer: !!c,
                signed_at: c ? new Date().toISOString() : signoff.signed_at,
              })}
            />
            <span className="text-sm">Mottatt/gjennomgått</span>
          </label>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Kommentar (valgfritt)</Label>
        <Textarea
          value={signoff.comment}
          onChange={e => update({ comment: e.target.value })}
          rows={2}
          placeholder="Eventuelle merknader..."
          className="text-sm"
        />
      </div>
    </div>
  );
}

export const DEFAULT_SIGNOFF: SignoffData = {
  technician_name: "",
  customer_name: "",
  signed_by_technician: false,
  signed_by_customer: false,
  signed_at: null,
  comment: "",
};
