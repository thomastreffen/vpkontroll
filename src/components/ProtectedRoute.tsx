import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  children: ReactNode;
  /** 
   * "master_admin" – only master admins
   * "tenant_admin" – only tenant admins (or master admins)
   * "tenant_member" – any authenticated user with a tenant_id
   * undefined – any authenticated user
   */
  requireRole?: "master_admin" | "tenant_admin" | "tenant_member";
}

export default function ProtectedRoute({ children, requireRole }: Props) {
  const { user, loading, isMasterAdmin, isTenantAdmin, tenantId } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (requireRole === "master_admin" && !isMasterAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Ingen tilgang</h2>
          <p className="text-muted-foreground">Du har ikke master admin-tilgang.</p>
        </div>
      </div>
    );
  }

  if (requireRole === "tenant_admin" && !isTenantAdmin && !isMasterAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Ingen tilgang</h2>
          <p className="text-muted-foreground">Du har ikke tenant admin-tilgang.</p>
        </div>
      </div>
    );
  }

  if (requireRole === "tenant_member" && !tenantId && !isMasterAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Ingen tilgang</h2>
          <p className="text-muted-foreground">Du er ikke tilknyttet en bedrift. Kontakt administrator.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
