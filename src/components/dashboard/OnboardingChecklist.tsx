import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Users, Boxes, Wrench, Building2, Mail, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CheckItem {
  key: string;
  label: string;
  done: boolean;
  icon: React.ElementType;
  navigateTo?: string;
}

export default function OnboardingChecklist() {
  const { tenantId } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<CheckItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    const check = async () => {
      const [
        { count: userCount },
        { count: moduleCount },
        { count: techCount },
        { count: companyCount },
        { count: mailboxCount },
        { count: docCount },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId),
        supabase.from("tenant_modules").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("is_active", true),
        supabase.from("technicians").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("is_active", true),
        supabase.from("crm_companies").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId).is("deleted_at", null),
        supabase.from("mailboxes").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("is_enabled", true),
        supabase.from("documents").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId).is("deleted_at", null),
      ]);

      const checkItems: CheckItem[] = [
        { key: "users",      label: "Bruker opprettet",               done: (userCount    || 0) >= 1, icon: Users,     navigateTo: "/tenant/users" },
        { key: "modules",    label: "Moduler aktivert",               done: (moduleCount  || 0) >= 1, icon: Boxes,     navigateTo: "/tenant/modules" },
        { key: "technician", label: "Tekniker koblet",                done: (techCount    || 0) >= 1, icon: Wrench,    navigateTo: "/tenant/users" },
        { key: "customer",   label: "Første kunde opprettet",         done: (companyCount || 0) >= 1, icon: Building2, navigateTo: "/tenant/crm/companies" },
        { key: "mailbox",    label: "Mailboks konfigurert",           done: (mailboxCount || 0) >= 1, icon: Mail,      navigateTo: "/tenant/postkontoret" },
        { key: "document",   label: "Dokumentopplasting testet",      done: (docCount     || 0) >= 1, icon: FileText },
      ];

      const doneCt = checkItems.filter(i => i.done).length;
      setItems(checkItems);
      setCollapsed(doneCt / checkItems.length < 0.5);
      setLoading(false);
    };
    check();
  }, [tenantId]);

  if (loading) return null;

  const doneCount = items.filter(i => i.done).length;
  const totalCount = items.length;
  const percent = Math.round((doneCount / totalCount) * 100);

  if (doneCount >= totalCount - 1) return null;

  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-3">
          <span className="text-xs font-medium text-foreground shrink-0">Oppstartssjekk</span>
          <div className="flex-1 min-w-0">
            <Progress value={percent} className="h-1" />
          </div>
          <span className="text-xs text-muted-foreground shrink-0 tabular-nums">{doneCount}/{totalCount}</span>
        </div>
        <button
          className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted transition-colors shrink-0"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed
            ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            : <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          }
        </button>
      </div>

      {!collapsed && (
        <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-0.5">
          {items.map(item => (
            <div
              key={item.key}
              className={`flex items-center gap-2 py-1 px-1.5 rounded text-xs ${
                item.navigateTo && !item.done ? "cursor-pointer hover:bg-muted/50" : ""
              }`}
              onClick={() => item.navigateTo && !item.done && navigate(item.navigateTo)}
            >
              {item.done
                ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                : <Circle className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
              }
              <span className={item.done ? "text-muted-foreground line-through" : "text-foreground/80"}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
