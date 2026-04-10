import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { Building2, LogOut } from "lucide-react";

export default function NoTenantPage() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full p-8 text-center space-y-4">
        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <Building2 className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-xl font-bold">Ikke tilknyttet en bedrift</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Kontoen din ({user?.email}) er ikke koblet til noen bedrift i systemet ennå. 
          Kontakt din administrator for å bli lagt til.
        </p>
        <Button variant="outline" onClick={signOut} className="gap-2 mt-4">
          <LogOut className="h-4 w-4" /> Logg ut
        </Button>
      </Card>
    </div>
  );
}
