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
import { Users, Plus, Wrench, ChevronRight } from "lucide-react";
import { InviteUserDialog } from "@/components/users/InviteUserDialog";
import { UserDetailDrawer } from "@/components/users/UserDetailDrawer";

export default function TenantUsersPage() {
  const { tenantId } = useAuth();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ["tenant-users", tenantId],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const userIds = profiles?.map(p => p.user_id) || [];
      const { data: appRoles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      const { data: roleAssignments } = await supabase
        .from("tenant_user_role_assignments")
        .select("user_id, role_id, tenant_roles(name)")
        .eq("tenant_id", tenantId!)
        .in("user_id", userIds);

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

  const getInitials = (name: string | null) =>
    (name ?? "?").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const getSystemRole = (appRoles: string[]) => {
    if (appRoles.includes("master_admin")) return "Master";
    if (appRoles.includes("tenant_admin")) return "Admin";
    return "Bruker";
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
                  <TableHead className="hidden md:table-cell">E-post</TableHead>
                  <TableHead>Roller</TableHead>
                  <TableHead>Tekniker</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[40px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow
                    key={u.id}
                    className={`cursor-pointer transition-colors hover:bg-muted/50 ${!u.is_active ? "opacity-50" : ""}`}
                    onClick={() => setSelectedUser(u)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {getInitials(u.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{u.full_name || "Ukjent"}</p>
                          <p className="text-xs text-muted-foreground md:hidden truncate">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden md:table-cell">{u.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline" className="text-[10px]">
                          {getSystemRole(u.appRoles)}
                        </Badge>
                        {u.tenantRole && (
                          <Badge variant="secondary" className="text-[10px]">
                            {(u.tenantRole as any).tenant_roles?.name || "–"}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {u.technician ? (
                        <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 gap-1 text-[10px]">
                          <Wrench className="h-3 w-3" />
                          Aktiv
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">–</span>
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
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <InviteUserDialog open={inviteOpen} onOpenChange={setInviteOpen} />
      <UserDetailDrawer
        open={!!selectedUser}
        onOpenChange={o => !o && setSelectedUser(null)}
        user={selectedUser}
      />
    </div>
  );
}
