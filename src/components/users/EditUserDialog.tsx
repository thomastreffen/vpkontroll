import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  is_active: boolean;
  tenant_id: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserProfile | null;
}

export function EditUserDialog({ open, onOpenChange, user }: Props) {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [tenantRoleId, setTenantRoleId] = useState("");

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || "");
      setIsActive(user.is_active);
    }
  }, [user]);

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

  // Current role assignment
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

  useEffect(() => {
    if (currentAssignment) setTenantRoleId(currentAssignment.role_id);
  }, [currentAssignment]);

  const save = useMutation({
    mutationFn: async () => {
      if (!user) return;
      // Update profile
      await supabase
        .from("profiles")
        .update({ full_name: fullName, is_active: isActive })
        .eq("id", user.id);

      // Update role assignment
      if (tenantRoleId && tenantId) {
        // Upsert: delete old, insert new
        await supabase
          .from("tenant_user_role_assignments")
          .delete()
          .eq("user_id", user.user_id)
          .eq("tenant_id", tenantId);
        
        await supabase
          .from("tenant_user_role_assignments")
          .insert({ user_id: user.user_id, role_id: tenantRoleId, tenant_id: tenantId });
      } else if (tenantId) {
        // Remove role
        await supabase
          .from("tenant_user_role_assignments")
          .delete()
          .eq("user_id", user.user_id)
          .eq("tenant_id", tenantId);
      }
    },
    onSuccess: () => {
      toast.success("Bruker oppdatert");
      queryClient.invalidateQueries({ queryKey: ["tenant-users"] });
      onOpenChange(false);
    },
    onError: () => toast.error("Kunne ikke oppdatere bruker"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Rediger bruker</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>E-post</Label>
            <Input value={user?.email || ""} disabled className="opacity-60" />
          </div>
          <div className="space-y-1.5">
            <Label>Fullt navn</Label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={isActive ? "active" : "inactive"} onValueChange={v => setIsActive(v === "active")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Aktiv</SelectItem>
                <SelectItem value="inactive">Deaktivert</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {tenantRoles && tenantRoles.length > 0 && (
            <div className="space-y-1.5">
              <Label>Tilgangsrolle</Label>
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
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Avbryt</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? "Lagrer..." : "Lagre"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
