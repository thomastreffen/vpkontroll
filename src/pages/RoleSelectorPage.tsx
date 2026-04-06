import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Flame, Shield, Building2 } from "lucide-react";

export default function RoleSelectorPage() {
  const navigate = useNavigate();
  const { isMasterAdmin, isTenantAdmin } = useAuth();

  const roles = [
    ...(isMasterAdmin
      ? [{
          key: "master_admin",
          label: "Master Admin",
          description: "Administrer hele plattformen, tenants og moduler",
          icon: Shield,
          path: "/admin",
        }]
      : []),
    ...(isTenantAdmin
      ? [{
          key: "tenant_admin",
          label: "Tenant Admin",
          description: "Administrer din bedrift, integrasjoner og brukere",
          icon: Building2,
          path: "/tenant",
        }]
      : []),
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-3">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <Flame className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Velg rolle</h1>
          <p className="text-muted-foreground">Du har tilgang til flere roller. Velg hvilken du vil bruke nå.</p>
        </div>

        <div className="grid gap-4">
          {roles.map((role) => (
            <Card
              key={role.key}
              className="border-border/50 cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
              onClick={() => navigate(role.path)}
            >
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                  <role.icon className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle className="text-base">{role.label}</CardTitle>
                  <CardDescription className="text-sm mt-0.5">{role.description}</CardDescription>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
