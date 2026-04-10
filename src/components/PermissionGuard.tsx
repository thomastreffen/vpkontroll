import { ReactNode } from "react";
import { usePermissions } from "@/hooks/usePermissions";

interface PermissionGuardProps {
  /** Permission key required to render children */
  permission: string;
  /** Optional fallback – defaults to "Ingen tilgang" message */
  fallback?: ReactNode;
  /** If true, render nothing instead of a message when denied */
  silent?: boolean;
  children: ReactNode;
}

/**
 * Renders children only if the current user has the specified permission.
 * Master admins and tenant admins always pass.
 */
export default function PermissionGuard({ permission, fallback, silent, children }: PermissionGuardProps) {
  const { loading, hasPermission } = usePermissions();

  if (loading) {
    return (
      <div className="min-h-[200px] flex items-center justify-center">
        <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasPermission(permission)) {
    if (silent) return null;
    if (fallback) return <>{fallback}</>;
    return (
      <div className="min-h-[300px] flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-bold mb-2">Ingen tilgang</h2>
          <p className="text-muted-foreground">Du har ikke tilgang til denne funksjonen. Kontakt administrator for å få tilgang.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
