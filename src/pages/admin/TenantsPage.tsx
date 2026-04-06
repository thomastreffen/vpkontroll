import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Building2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Tenant = Tables<"tenants">;

export default function TenantsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [domain, setDomain] = useState("");
  const [status, setStatus] = useState<string>("trial");

  const { data: tenants, isLoading } = useQuery({
    queryKey: ["tenants"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Tenant[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tenants").insert({
        name,
        slug: slug || name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
        domain: domain || null,
        status: status as Tenant["status"],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      toast.success("Tenant opprettet");
      setOpen(false);
      setName("");
      setSlug("");
      setDomain("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const statusColors: Record<string, string> = {
    active: "bg-accent/10 text-accent border-accent/20",
    trial: "bg-yellow-100 text-yellow-700 border-yellow-200",
    inactive: "bg-muted text-muted-foreground",
    suspended: "bg-destructive/10 text-destructive border-destructive/20",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tenants</h1>
          <p className="text-muted-foreground mt-1">Administrer kundeselskaper</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Ny tenant</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Opprett ny tenant</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>Selskapsnavn</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Slug (URL-vennlig)</Label>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder={name.toLowerCase().replace(/\s+/g, "-")}
                />
              </div>
              <div className="space-y-2">
                <Label>Domene (valgfritt)</Label>
                <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="firma.no" />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial">Prøveperiode</SelectItem>
                    <SelectItem value="active">Aktiv</SelectItem>
                    <SelectItem value="inactive">Inaktiv</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Oppretter..." : "Opprett tenant"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-8 text-center text-muted-foreground">Laster...</p>
          ) : !tenants?.length ? (
            <div className="p-12 text-center">
              <Building2 className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">Ingen tenants ennå</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Navn</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Domene</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Opprettet</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="text-muted-foreground">{t.slug}</TableCell>
                    <TableCell className="text-muted-foreground">{t.domain || "–"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[t.status] ?? ""}>
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(t.created_at).toLocaleDateString("nb-NO")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
