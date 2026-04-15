import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Users, Plus, MoreHorizontal, Pencil, Shield, Link2, UserX, UserCheck, Wrench } from "lucide-react";
import { toast } from "sonner";
import { InviteUserDialog } from "@/components/users/InviteUserDialog";
import { EditUserDialog } from "@/components/users/EditUserDialog";
import { LinkTechnicianDialog } from "@/components/users/LinkTechnicianDialog";

export default function TenantUsersPage() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [linkUser, setLinkUser] = useState<any>(null);

  // Fetch profiles with role assignments and technician links
  const { data: users, isLoading } = useQuery({
    queryKey: ["tenant-users", tenantId],
    queryFn: async () => {
      // Profiles
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // User roles (app-level)
      const userIds = profiles?.map(p => p.user_id) || [];
      const { data: appRoles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      // Tenant role assignments
      const { data: roleAssignments } = await supabase
        .from("tenant_user_role_assignments")
        .select("user_id, role_id, tenant_roles(name)")
        .eq("tenant_id", tenantId!)
        .in("user_id", userIds);

      // Technicians linked to users
      const { data: technicians } = await supabase
        .from("technicians")
        .select("id, name, user_id")
        .eq("tenant_id", tenantId!)
        .in("user_id", userIds);

      return (profiles || []).map(p => ({
        ...p,
        appRoles: appRoles?.filter(r => r.user_id === p.user_id).map(r => r.role) || [],
        tenantRole: roleAssignments?.find(r => r.user_id === p.user_id),
        technician: technicians?.find(t => t.user_id === p.user_id) || null,
      }));
    },
    enabled: !!tenantId,
  });

  const toggleActive = useMutation({
    mutationFn: async ({ profileId, isActive }: { profileId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ is_active: isActive })
        .eq("id", profileId);
      if (error) throw error;
    },
    onSuccess: (_, { isActive }) => {
      toast.success(isActive ? "Bruker aktivert" : "Bruker deaktivert");
      queryClient.invalidateQueries({ queryKey: ["tenant-users"] });
    },
    onError: () => toast.error("Kunne ikke endre status"),
  });

  const getInitials = (name: string | null) =>
    (name ?? "?").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const getRoleBadge = (appRoles: string[]) => {
    if (appRoles.includes("master_admin")) return <Badge variant="default" className="text-[10px]">Master</Badge>;
    if (appRoles.includes("tenant_admin")) return <Badge variant="default" className="text-[10px]">Admin</Badge>;
    return <Badge variant="secondary" className="text-[10px]">Bruker</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Brukere og teknikere</h1>
          <p className="text-muted-foreground mt-1">Administrer brukere, roller og tekniker-koblinger</p>
        </div>
        <Button className="gap-1.5" onClick={() => setInviteOpen(true)}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Opprett bruker</span>
        </Button>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-8 text-center text-muted-foreground">Laster...</p>
          ) : !users?.length ? (
            <div className="p-12 text-center">
              <Users className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">Ingen brukere ennå</p>
              <Button variant="link" onClick={() => setInviteOpen(true)} className="mt-2">
                Opprett den første brukeren
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bruker</TableHead>
                  <TableHead>E-post</TableHead>
                  <TableHead>Systemrolle</TableHead>
                  <TableHead>Tilgangsrolle</TableHead>
                  <TableHead>Tekniker</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id} className={!u.is_active ? "opacity-50" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {getInitials(u.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm">{u.full_name || "Ukjent"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                    <TableCell>{getRoleBadge(u.appRoles)}</TableCell>
                    <TableCell className="text-sm">
                      {u.tenantRole ? (
                        <Badge variant="outline" className="text-[10px]">
                          {(u.tenantRole as any).tenant_roles?.name || "–"}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">Ingen</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {u.technician ? (
                        <Badge variant="outline" className="gap-1 text-[10px]">
                          <Wrench className="h-3 w-3" />
                          {u.technician.name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">Ikke koblet</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {u.is_active ? (
                        <Badge variant="secondary" className="bg-green-500/10 text-green-600 text-[10px]">Aktiv</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-red-500/10 text-red-600 text-[10px]">Deaktivert</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditUser(u)} className="gap-2">
                            <Pencil className="h-3.5 w-3.5" />
                            Rediger
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditUser(u)} className="gap-2">
                            <Shield className="h-3.5 w-3.5" />
                            Tildel rolle
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setLinkUser(u)}
                            className="gap-2"
                          >
                            <Link2 className="h-3.5 w-3.5" />
                            {u.technician ? "Endre teknikerkobling" : "Koble til tekniker"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => toggleActive.mutate({ profileId: u.id, isActive: !u.is_active })}
                            className="gap-2"
                          >
                            {u.is_active ? (
                              <>
                                <UserX className="h-3.5 w-3.5" />
                                Deaktiver
                              </>
                            ) : (
                              <>
                                <UserCheck className="h-3.5 w-3.5" />
                                Aktiver
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <InviteUserDialog open={inviteOpen} onOpenChange={setInviteOpen} />
      <EditUserDialog open={!!editUser} onOpenChange={o => !o && setEditUser(null)} user={editUser} />
      {linkUser && (
        <LinkTechnicianDialog
          open={!!linkUser}
          onOpenChange={o => !o && setLinkUser(null)}
          userId={linkUser.user_id}
          userName={linkUser.full_name || linkUser.email || ""}
          userEmail={linkUser.email}
          currentTechnicianId={linkUser.technician?.id}
        />
      )}
    </div>
  );
}
