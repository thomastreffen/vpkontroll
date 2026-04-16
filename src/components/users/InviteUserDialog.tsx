import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteUserDialog({ open, onOpenChange }: Props) {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [appRole, setAppRole] = useState("user");
  const [tenantRoleId, setTenantRoleId] = useState("");

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

  const invite = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: { email, full_name: fullName, app_role: appRole, tenant_role_id: (tenantRoleId && tenantRoleId !== "__none__") ? tenantRoleId : undefined },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("Bruker opprettet");
      queryClient.invalidateQueries({ queryKey: ["tenant-users"] });
      onOpenChange(false);
      setEmail(""); setFullName(""); setAppRole("user"); setTenantRoleId("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Kunne ikke opprette bruker");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Opprett ny bruker</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>E-post *</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="bruker@eksempel.no" />
          </div>
          <div className="space-y-1.5">
            <Label>Fullt navn</Label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Ola Nordmann" />
          </div>
          <div className="space-y-1.5">
            <Label>Systemrolle</Label>
            <Select value={appRole} onValueChange={setAppRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Bruker</SelectItem>
                <SelectItem value="tenant_admin">Administrator</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {tenantRoles && tenantRoles.length > 0 && (
            <div className="space-y-1.5">
              <Label>Tilgangsrolle (valgfri)</Label>
              <Select value={tenantRoleId} onValueChange={setTenantRoleId}>
                <SelectTrigger><SelectValue placeholder="Velg rolle..." /></SelectTrigger>
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
            <Button onClick={() => invite.mutate()} disabled={!email || invite.isPending}>
              {invite.isPending ? "Oppretter..." : "Opprett bruker"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
