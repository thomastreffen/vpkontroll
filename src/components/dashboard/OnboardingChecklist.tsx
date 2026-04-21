import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Users, Boxes, Wrench, Building2, Mail, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const [collapsed, setCollapsed] = useState(false);

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

      setItems([
        { key: "users", label: "Bruker opprettet", done: (userCount || 0) >= 1, icon: Users, navigateTo: "/tenant/users" },
        { key: "modules", label: "Moduler aktivert", done: (moduleCount || 0) >= 1, icon: Boxes, navigateTo: "/tenant/modules" },
        { key: "technician", label: "Tekniker koblet", done: (techCount || 0) >= 1, icon: Wrench, navigateTo: "/tenant/users" },
        { key: "customer", label: "Første kunde opprettet", done: (companyCount || 0) >= 1, icon: Building2, navigateTo: "/tenant/crm/companies" },
        { key: "mailbox", label: "Postkontoret mailboks konfigurert", done: (mailboxCount || 0) >= 1, icon: Mail, navigateTo: "/tenant/postkontoret" },
        { key: "document", label: "Dokumentopplasting testet", done: (docCount || 0) >= 1, icon: FileText },
      ]);
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
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Oppstartssjekk</h3>
          <Badge variant="outline" className="text-[10px]">{doneCount}/{totalCount}</Badge>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
        </Button>
      </div>
      <Progress value={percent} className="h-1.5 mb-3" />
      {!collapsed && (
        <div className="space-y-1.5">
          {items.map(item => (
            <div
              key={item.key}
              className={`flex items-center gap-2.5 py-1.5 px-2 rounded text-sm ${item.navigateTo && !item.done ? "cursor-pointer hover:bg-muted/50" : ""}`}
              onClick={() => item.navigateTo && !item.done && navigate(item.navigateTo)}
            >
              {item.done ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground/50 shrink-0" />
              )}
              <item.icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className={item.done ? "text-muted-foreground line-through" : ""}>{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
