import { ReactNode } from "react";
import { useTenantModules } from "@/hooks/useTenantModules";

interface ModuleRouteGuardProps {
  module: string;
  children: ReactNode;
}

export default function ModuleRouteGuard({ module, children }: ModuleRouteGuardProps) {
  const { loading, hasModule } = useTenantModules();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasModule(module)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-bold mb-2">Modulen er ikke aktiv</h2>
          <p className="text-muted-foreground">Denne modulen må aktiveres for tenant før den kan brukes.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
