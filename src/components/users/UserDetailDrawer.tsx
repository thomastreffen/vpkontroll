import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Wrench, UserPlus, Link2, Unlink, Save, UserCheck, UserX } from "lucide-react";

interface UserRow {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  is_active: boolean;
  tenant_id: string | null;
  appRoles: string[];
  tenantRole: any;
  technician: { id: string; name: string; user_id: string | null } | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserRow | null;
}

export function UserDetailDrawer({ open, onOpenChange, user }: Props) {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  const [fullName, setFullName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [tenantRoleId, setTenantRoleId] = useState("__none__");
  const [selectedTechId, setSelectedTechId] = useState("__none__");

  // Load tenant roles
  const { data: tenantRoles } = useQuery({
    queryKey: ["tenant-roles", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tenant_roles")
        .select("id, name")
        .eq("tenant_id", tenantId!)
        .order("name");
      return data || [];
    },
    enabled: !!tenantId && open,
  });

  // Load current role assignment
  const { data: currentAssignment } = useQuery({
    queryKey: ["user-role-assignment", user?.user_id, tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tenant_user_role_assignments")
        .select("role_id")
        .eq("user_id", user!.user_id)
        .eq("tenant_id", tenantId!)
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user && !!tenantId && open,
  });

  // Load available technicians (unlinked or linked to this user)
  const { data: technicians } = useQuery({
    queryKey: ["technicians-for-link", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("technicians")
        .select("id, name, email, user_id")
        .eq("tenant_id", tenantId!)
        .eq("is_active", true)
        .order("name");
      return data || [];
    },
    enabled: !!tenantId && open,
  });

  const availableTechs = technicians?.filter(t => !t.user_id || t.user_id === user?.user_id) || [];

  // Populate form when user changes
  useEffect(() => {
    if (user) {
      setFullName(user.full_name || "");
      setIsActive(user.is_active);
      setSelectedTechId(user.technician?.id || "__none__");
    }
  }, [user]);

  useEffect(() => {
    if (currentAssignment) {
      setTenantRoleId(currentAssignment.role_id);
    } else {
      setTenantRoleId("__none__");
    }
  }, [currentAssignment]);

  // Save profile + role
  const saveProfile = useMutation({
    mutationFn: async () => {
      if (!user || !tenantId) return;
      // Update profile
      await supabase
        .from("profiles")
        .update({ full_name: fullName, is_active: isActive })
        .eq("id", user.id);

      // Upsert role assignment
      await supabase
        .from("tenant_user_role_assignments")
        .delete()
        .eq("user_id", user.user_id)
        .eq("tenant_id", tenantId);

      if (tenantRoleId && tenantRoleId !== "__none__") {
        await supabase
          .from("tenant_user_role_assignments")
          .insert({ user_id: user.user_id, role_id: tenantRoleId, tenant_id: tenantId });
      }
    },
    onSuccess: () => {
      toast.success("Bruker oppdatert");
      queryClient.invalidateQueries({ queryKey: ["tenant-users"] });
    },
    onError: () => toast.error("Kunne ikke oppdatere bruker"),
  });

  // Create technician profile from user
  const createTechnician = useMutation({
    mutationFn: async () => {
      if (!user || !tenantId) return;
      const { error } = await supabase.from("technicians").insert({
        tenant_id: tenantId,
        name: user.full_name || user.email || "Ukjent",
        email: user.email,
        user_id: user.user_id,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Teknikerprofil opprettet – brukeren er nå tilgjengelig i ressursplan og «Mine oppdrag»");
      queryClient.invalidateQueries({ queryKey: ["tenant-users"] });
      queryClient.invalidateQueries({ queryKey: ["technicians"] });
    },
    onError: () => toast.error("Kunne ikke opprette teknikerprofil"),
  });

  // Link/unlink technician
  const linkTechnician = useMutation({
    mutationFn: async (techId: string) => {
      if (!user || !tenantId) return;
      // Unlink current
      if (user.technician?.id) {
        await supabase.from("technicians").update({ user_id: null }).eq("id", user.technician.id);
      }
      // Link new
      if (techId !== "__none__") {
        const { error } = await supabase.from("technicians").update({ user_id: user.user_id }).eq("id", techId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Teknikerkobling oppdatert");
      queryClient.invalidateQueries({ queryKey: ["tenant-users"] });
      queryClient.invalidateQueries({ queryKey: ["technicians"] });
    },
    onError: () => toast.error("Kunne ikke oppdatere kobling"),
  });

  // Unlink technician
  const unlinkTechnician = useMutation({
    mutationFn: async () => {
      if (!user?.technician?.id) return;
      await supabase.from("technicians").update({ user_id: null }).eq("id", user.technician.id);
    },
    onSuccess: () => {
      toast.success("Teknikerkobling fjernet");
      setSelectedTechId("__none__");
      queryClient.invalidateQueries({ queryKey: ["tenant-users"] });
      queryClient.invalidateQueries({ queryKey: ["technicians"] });
    },
    onError: () => toast.error("Kunne ikke fjerne kobling"),
  });

  if (!user) return null;

  const getInitials = (name: string | null) =>
    (name ?? "?").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const systemRole = user.appRoles.includes("master_admin")
    ? "Master Admin"
    : user.appRoles.includes("tenant_admin")
    ? "Administrator"
    : "Bruker";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {getInitials(user.full_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <SheetTitle className="text-left">{user.full_name || "Ukjent bruker"}</SheetTitle>
              <SheetDescription className="text-left">{user.email}</SheetDescription>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-2">
            <Badge variant="outline" className="text-[10px]">{systemRole}</Badge>
            {user.is_active ? (
              <Badge variant="secondary" className="bg-green-500/10 text-green-600 text-[10px]">Aktiv</Badge>
            ) : (
              <Badge variant="secondary" className="bg-red-500/10 text-red-600 text-[10px]">Deaktivert</Badge>
            )}
            {user.technician ? (
              <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 text-[10px] gap-1">
                <Wrench className="h-3 w-3" />
                Tekniker
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-muted-foreground text-[10px]">Ikke tekniker</Badge>
            )}
          </div>
        </SheetHeader>

        <div className="space-y-6 pt-2">
          {/* === Section 1: Profil & rolle === */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Profil og rolle</h3>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Fullt navn</Label>
                <Input value={fullName} onChange={e => setFullName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={isActive ? "active" : "inactive"} onValueChange={v => setIsActive(v === "active")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">
                      <span className="flex items-center gap-1.5"><UserCheck className="h-3.5 w-3.5 text-green-600" /> Aktiv</span>
                    </SelectItem>
                    <SelectItem value="inactive">
                      <span className="flex items-center gap-1.5"><UserX className="h-3.5 w-3.5 text-red-500" /> Deaktivert</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {tenantRoles && tenantRoles.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Tilgangsrolle</Label>
                  <Select value={tenantRoleId} onValueChange={setTenantRoleId}>
                    <SelectTrigger><SelectValue placeholder="Ingen rolle" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Ingen</SelectItem>
                      {tenantRoles.map(r => (
                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => saveProfile.mutate()}
                disabled={saveProfile.isPending}
              >
                <Save className="h-3.5 w-3.5" />
                {saveProfile.isPending ? "Lagrer..." : "Lagre profil"}
              </Button>
            </div>
          </section>

          <Separator />

          {/* === Section 2: Tekniker === */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Tekniker og ressursplan</h3>

            {user.technician ? (
              /* User IS linked to a technician */
              <div className="space-y-3">
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Wrench className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-sm">Koblet til: {user.technician.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Brukeren er synlig i ressursplanlegger og kan se «Mine oppdrag».
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-destructive hover:text-destructive"
                  onClick={() => unlinkTechnician.mutate()}
                  disabled={unlinkTechnician.isPending}
                >
                  <Unlink className="h-3.5 w-3.5" />
                  Fjern teknikerkobling
                </Button>
              </div>
            ) : (
              /* User is NOT linked to a technician */
              <div className="space-y-4">
                <div className="rounded-lg border border-dashed border-muted-foreground/30 p-4">
                  <p className="text-sm text-muted-foreground mb-3">
                    Denne brukeren er ikke koblet til en teknikerprofil. For å gjøre brukeren tilgjengelig i ressursplanlegger og «Mine oppdrag», velg ett av alternativene:
                  </p>

                  {/* Option A: Create new technician */}
                  <div className="space-y-2 mb-4">
                    <p className="text-xs font-semibold text-foreground">Alternativ 1: Opprett ny teknikerprofil</p>
                    <div className="rounded-md border bg-muted/20 p-3 text-xs space-y-0.5">
                      <p><span className="text-muted-foreground">Navn:</span> {user.full_name || "–"}</p>
                      <p><span className="text-muted-foreground">E-post:</span> {user.email || "–"}</p>
                    </div>
                    <Button
                      size="sm"
                      className="gap-1.5"
                      onClick={() => createTechnician.mutate()}
                      disabled={createTechnician.isPending}
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      {createTechnician.isPending ? "Oppretter..." : "Opprett teknikerprofil"}
                    </Button>
                  </div>

                  <Separator className="my-3" />

                  {/* Option B: Link existing technician */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-foreground">Alternativ 2: Koble til eksisterende tekniker</p>
                    {availableTechs.length > 0 ? (
                      <div className="flex items-end gap-2">
                        <div className="flex-1 space-y-1">
                          <Select value={selectedTechId} onValueChange={setSelectedTechId}>
                            <SelectTrigger className="h-9"><SelectValue placeholder="Velg tekniker..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Velg tekniker...</SelectItem>
                              {availableTechs.map(t => (
                                <SelectItem key={t.id} value={t.id}>
                                  {t.name} {t.email ? `(${t.email})` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          disabled={!selectedTechId || selectedTechId === "__none__" || linkTechnician.isPending}
                          onClick={() => linkTechnician.mutate(selectedTechId)}
                        >
                          <Link2 className="h-3.5 w-3.5" />
                          Koble
                        </Button>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Ingen tilgjengelige teknikere å koble til.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
