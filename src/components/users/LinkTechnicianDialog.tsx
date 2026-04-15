import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Link2, UserPlus } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  userEmail: string | null;
  currentTechnicianId?: string | null;
}

export function LinkTechnicianDialog({ open, onOpenChange, userId, userName, userEmail, currentTechnicianId }: Props) {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTechId, setSelectedTechId] = useState(currentTechnicianId || "");
  const [createNew, setCreateNew] = useState(false);

  useEffect(() => {
    setSelectedTechId(currentTechnicianId || "");
    setCreateNew(false);
  }, [currentTechnicianId, open]);

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

  // Unlinked technicians (no user_id or same user)
  const availableTechs = technicians?.filter(t => !t.user_id || t.user_id === userId) || [];

  const link = useMutation({
    mutationFn: async () => {
      if (createNew) {
        // Create new technician linked to user
        const { error } = await supabase.from("technicians").insert({
          tenant_id: tenantId!,
          name: userName,
          email: userEmail,
          user_id: userId,
          is_active: true,
        });
        if (error) throw error;
      } else if (selectedTechId) {
        // Unlink previous if any
        if (currentTechnicianId && currentTechnicianId !== selectedTechId) {
          await supabase.from("technicians").update({ user_id: null }).eq("id", currentTechnicianId);
        }
        // Link selected technician
        const { error } = await supabase.from("technicians").update({ user_id: userId }).eq("id", selectedTechId);
        if (error) throw error;
      } else {
        // Unlink
        if (currentTechnicianId) {
          await supabase.from("technicians").update({ user_id: null }).eq("id", currentTechnicianId);
        }
      }
    },
    onSuccess: () => {
      toast.success("Teknikerkobling oppdatert");
      queryClient.invalidateQueries({ queryKey: ["tenant-users"] });
      queryClient.invalidateQueries({ queryKey: ["technicians"] });
      onOpenChange(false);
    },
    onError: () => toast.error("Kunne ikke oppdatere kobling"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Koble tekniker
          </DialogTitle>
          <DialogDescription>
            Koble {userName} til en teknikerprofil for å aktivere «Mine oppdrag» og ressursplanlegging.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {!createNew ? (
            <>
              <div className="space-y-1.5">
                <Label>Velg tekniker</Label>
                <Select value={selectedTechId} onValueChange={setSelectedTechId}>
                  <SelectTrigger><SelectValue placeholder="Velg tekniker..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Ingen (fjern kobling)</SelectItem>
                    {availableTechs.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} {t.email ? `(${t.email})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setCreateNew(true)}>
                <UserPlus className="h-3.5 w-3.5" />
                Opprett ny teknikerprofil
              </Button>
            </>
          ) : (
            <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-1">
              <p className="font-medium">Ny teknikerprofil vil bli opprettet:</p>
              <p className="text-muted-foreground">Navn: {userName}</p>
              <p className="text-muted-foreground">E-post: {userEmail || "–"}</p>
              <Button variant="link" size="sm" className="px-0 h-auto text-xs" onClick={() => setCreateNew(false)}>
                Velg eksisterende i stedet
              </Button>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Avbryt</Button>
            <Button onClick={() => link.mutate()} disabled={link.isPending}>
              {link.isPending ? "Lagrer..." : "Lagre"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
