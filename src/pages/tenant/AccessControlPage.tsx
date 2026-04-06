import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Users, Info } from "lucide-react";
import { RolesTab } from "@/components/access-control/RolesTab";
import { UsersAccessTab } from "@/components/access-control/UsersAccessTab";

export default function AccessControlPage() {
  const [tab, setTab] = useState("roles");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Tilgangsstyring</h1>
        <p className="text-muted-foreground mt-1">Administrer roller og brukertilganger</p>
      </div>

      {/* Layer explanation */}
      <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Info className="h-3.5 w-3.5" />
          Tilgangssystemet har tre lag
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="space-y-0.5">
            <p className="font-semibold text-foreground">🎭 Rolle</p>
            <p className="text-muted-foreground">Standardpakke med anbefalte rettigheter. F.eks. Tekniker, Admin.</p>
          </div>
          <div className="space-y-0.5">
            <p className="font-semibold text-foreground">🔑 Rettigheter</p>
            <p className="text-muted-foreground">Detaljert kontroll over hva brukeren kan gjøre i hver modul.</p>
          </div>
          <div className="space-y-0.5">
            <p className="font-semibold text-foreground">⚡ Overstyringer</p>
            <p className="text-muted-foreground">Per-bruker justeringer som overtrumfer rollerettigheter.</p>
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="roles" className="gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            <span>Roller</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            <span>Brukere</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roles">
          <RolesTab />
        </TabsContent>
        <TabsContent value="users">
          <UsersAccessTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
