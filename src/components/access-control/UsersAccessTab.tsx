import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronRight, Shield, ShieldAlert, ChevronDown, Info } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PERMISSION_CATEGORIES, getPermLabel, getPermDescription } from "@/lib/permission-labels";

interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  role_assignments: { role_id: string; role_name: string }[];
  overrides: { permission_key: string; allowed: boolean }[];
}

interface RoleOption { id: string; name: string; }

const ALL_OVERRIDE_KEYS = PERMISSION_CATEGORIES.flatMap((c) => c.keys);

export function UsersAccessTab() {
  const { tenantId } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [overrides, setOverrides] = useState<Record<string, "allow" | "deny" | "inherit">>({});
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const fetchAll = async () => {
    if (!tenantId) return;
    setLoading(true);

    const [{ data: profiles }, { data: rolesData }, { data: assignments }, { data: overridesData }] = await Promise.all([
      supabase.from("profiles").select("user_id, email, full_name").eq("tenant_id", tenantId),
      supabase.from("tenant_roles").select("id, name").eq("tenant_id", tenantId).order("name"),
      supabase.from("tenant_user_role_assignments").select("user_id, role_id").eq("tenant_id", tenantId),
      supabase.from("tenant_user_permission_overrides").select("user_id, permission_key, allowed").eq("tenant_id", tenantId),
    ]);

    const roleMap = new Map((rolesData as any[] || []).map((r: any) => [r.id, r.name]));

    const enriched: UserRow[] = (profiles as any[] || []).map((p: any) => ({
      id: p.user_id,
      email: p.email || "",
      full_name: p.full_name,
      role_assignments: (assignments as any[] || [])
        .filter((a: any) => a.user_id === p.user_id)
        .map((a: any) => ({ role_id: a.role_id, role_name: roleMap.get(a.role_id) || "?" })),
      overrides: (overridesData as any[] || [])
        .filter((o: any) => o.user_id === p.user_id)
        .map((o: any) => ({ permission_key: o.permission_key, allowed: o.allowed })),
    }));

    setUsers(enriched);
    setRoles((rolesData as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [tenantId]);

  const openEdit = (u: UserRow) => {
    setSelectedUser(u);
    setSelectedRoles(u.role_assignments.map((r) => r.role_id));
    const ov: Record<string, "allow" | "deny" | "inherit"> = {};
    for (const o of u.overrides) {
      ov[o.permission_key] = o.allowed ? "allow" : "deny";
    }
    setOverrides(ov);
    setShowAdvanced(Object.keys(ov).length > 0);
    setDialogOpen(true);
  };

  const selectRole = (roleId: string) => {
    setSelectedRoles((prev) => prev.includes(roleId) ? prev.filter((r) => r !== roleId) : [...prev, roleId]);
  };

  const cycleOverride = (key: string) => {
    setOverrides((prev) => {
      const current = prev[key] || "inherit";
      const next = current === "inherit" ? "allow" : current === "allow" ? "deny" : "inherit";
      const copy = { ...prev };
      if (next === "inherit") delete copy[key];
      else copy[key] = next;
      return copy;
    });
  };

  const handleSave = async () => {
    if (!selectedUser || !tenantId) return;
    setSaving(true);
    try {
      const uid = selectedUser.id;

      await supabase.from("tenant_user_role_assignments").delete().eq("user_id", uid).eq("tenant_id", tenantId);
      if (selectedRoles.length > 0) {
        await supabase.from("tenant_user_role_assignments").insert(
          selectedRoles.map((rid) => ({ tenant_id: tenantId, user_id: uid, role_id: rid }))
        );
      }

      await supabase.from("tenant_user_permission_overrides").delete().eq("user_id", uid).eq("tenant_id", tenantId);
      const ovRows = Object.entries(overrides).map(([key, val]) => ({
        tenant_id: tenantId, user_id: uid, permission_key: key, allowed: val === "allow",
      }));
      if (ovRows.length > 0) {
        await supabase.from("tenant_user_permission_overrides").insert(ovRows);
      }

      toast.success("Bruker oppdatert");
      setDialogOpen(false);
      fetchAll();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const activeOverrideCount = Object.keys(overrides).length;

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <TooltipProvider>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Brukere ({users.length})</h3>
        </div>

        {users.map((u) => (
          <Card key={u.id} className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => openEdit(u)}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{u.full_name || u.email}</p>
                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  {u.role_assignments.map((r, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] gap-1">
                      <Shield className="h-3 w-3" />{r.role_name}
                    </Badge>
                  ))}
                  {u.role_assignments.length === 0 && (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">Ingen rolle</Badge>
                  )}
                  {u.overrides.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] gap-1">
                      <ShieldAlert className="h-3 w-3" />{u.overrides.length} overstyr.
                    </Badge>
                  )}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </CardContent>
          </Card>
        ))}

        {/* Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg max-h-[85vh]">
            <DialogHeader>
              <DialogTitle>Rediger tilgang: {selectedUser?.full_name || selectedUser?.email}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-5">
                {/* Role selection */}
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Roller</Label>
                  <p className="text-[11px] text-muted-foreground mb-3">Velg hvilke roller brukeren skal ha.</p>
                  <div className="space-y-2">
                    {roles.map((r) => (
                      <label key={r.id} className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent/30 transition-colors">
                        <Checkbox checked={selectedRoles.includes(r.id)} onCheckedChange={() => selectRole(r.id)} />
                        <span className="text-sm font-medium">{r.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Advanced: overrides */}
                <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground">
                      <span className="flex items-center gap-2 text-xs">
                        <ShieldAlert className="h-3.5 w-3.5" />Individuelle overstyringer
                        {activeOverrideCount > 0 && <Badge variant="secondary" className="text-[10px]">{activeOverrideCount} aktive</Badge>}
                      </span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-3 space-y-4">
                    <div className="rounded-lg border border-border bg-muted/30 p-3 flex gap-2">
                      <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <p className="text-[11px] text-muted-foreground">
                        Overstyringer overtrumfer rollerettigheter. Klikk for å veksle: <strong className="text-green-600">✓ Tillatt</strong> → <strong className="text-destructive">✗ Nektet</strong> → Arv fra rolle.
                      </p>
                    </div>
                    {PERMISSION_CATEGORIES.map((group) => (
                      <div key={group.category}>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{group.category}</p>
                        <div className="space-y-1.5 mt-1">
                          {group.keys.map((key) => {
                            const state = overrides[key] || "inherit";
                            const desc = getPermDescription(key);
                            return (
                              <button key={key} type="button" onClick={() => cycleOverride(key)}
                                className="flex items-center gap-2 w-full text-left text-sm py-0.5 hover:bg-accent/30 rounded px-1">
                                <span className={`w-5 text-center text-xs font-bold ${state === "allow" ? "text-green-600" : state === "deny" ? "text-destructive" : "text-muted-foreground"}`}>
                                  {state === "allow" ? "✓" : state === "deny" ? "✗" : "–"}
                                </span>
                                <span className={state !== "inherit" ? "font-medium" : ""}>{getPermLabel(key)}</span>
                                {desc && (
                                  <Tooltip><TooltipTrigger asChild><Info className="h-3 w-3 text-muted-foreground shrink-0" /></TooltipTrigger>
                                    <TooltipContent side="right" className="max-w-[250px] text-xs">{desc}</TooltipContent></Tooltip>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button onClick={handleSave} disabled={saving}>{saving ? "Lagrer…" : "Lagre"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
