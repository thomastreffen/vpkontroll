import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AlertTriangle, Clock } from "lucide-react";

export default function TrialBanner() {
  const { tenantId } = useAuth();

  const { data: sub } = useQuery({
    queryKey: ["my_subscription", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data, error } = await supabase
        .from("tenant_subscriptions")
        .select("*, saas_plans(name)")
        .eq("tenant_id", tenantId)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!tenantId,
  });

  if (!sub || sub.status !== "trial" || !sub.trial_ends_at) return null;

  const daysLeft = Math.ceil((new Date(sub.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysLeft > 7) return null;

  const isExpired = daysLeft <= 0;

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm ${
      isExpired
        ? "bg-destructive/10 border-destructive/20 text-destructive"
        : "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300"
    }`}>
      {isExpired ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <Clock className="w-4 h-4 shrink-0" />}
      <span className="font-medium">
        {isExpired
          ? "Prøveperioden din har utløpt. Kontakt oss for å fortsette å bruke VPKontroll."
          : `Prøveperioden din utløper om ${daysLeft} ${daysLeft === 1 ? "dag" : "dager"}. Kontakt oss for å oppgradere til en betalt plan.`
        }
      </span>
    </div>
  );
}
