import { ReactNode } from "react";
import { useTenantModules } from "@/hooks/useTenantModules";
import { usePermissions } from "@/hooks/usePermissions";

interface ModuleRouteGuardProps {
  /** Module name checked against tenant_modules activation */
  module: string;
  /** Optional permission key checked against user permissions */
  permission?: string;
  children: ReactNode;
}

/**
 * Two-layer guard:
 * 1. Checks if the module is activated for the tenant
 * 2. Optionally checks if the user has a specific permission
 */
export default function ModuleRouteGuard({ module, permission, children }: ModuleRouteGuardProps) {
  const { loading: modulesLoading, hasModule } = useTenantModules();
  const { loading: permsLoading, hasPermission } = usePermissions();

  if (modulesLoading || (permission && permsLoading)) {
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
          <p className="text-muted-foreground">Denne modulen må aktiveres for bedriften før den kan brukes.</p>
        </div>
      </div>
    );
  }

  if (permission && !hasPermission(permission)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-bold mb-2">Ingen tilgang</h2>
          <p className="text-muted-foreground">Du har ikke tilgang til denne funksjonen. Kontakt administrator.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
