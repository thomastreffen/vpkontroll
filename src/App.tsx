import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import MasterAdminLayout from "@/components/MasterAdminLayout";
import TenantAdminLayout from "@/components/TenantAdminLayout";
import LoginPage from "@/pages/LoginPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import RoleSelectorPage from "@/pages/RoleSelectorPage";
import DashboardPage from "@/pages/admin/DashboardPage";
import TenantsPage from "@/pages/admin/TenantsPage";
import ModulesPage from "@/pages/admin/ModulesPage";
import IntegrationsPage from "@/pages/admin/IntegrationsPage";
import TenantDashboardPage from "@/pages/tenant/TenantDashboardPage";
import TenantModulesPage from "@/pages/tenant/TenantModulesPage";
import TenantIntegrationsPage from "@/pages/tenant/TenantIntegrationsPage";
import TenantUsersPage from "@/pages/tenant/TenantUsersPage";
import PostkontoretPage from "@/pages/tenant/PostkontoretPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, loading, isPasswordRecovery, isMasterAdmin, isTenantAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isPasswordRecovery) {
    return (
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="*" element={<Navigate to="/reset-password" replace />} />
      </Routes>
    );
  }

  const getHomeRedirect = () => {
    if (!user) return "/login";
    // If user has multiple roles, show role selector
    if (isMasterAdmin && isTenantAdmin) return "/select-role";
    if (isMasterAdmin) return "/admin";
    if (isTenantAdmin) return "/tenant";
    return "/login";
  };

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={getHomeRedirect()} replace /> : <LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/select-role" element={user ? <RoleSelectorPage /> : <Navigate to="/login" replace />} />

      {/* Master Admin routes */}
      <Route path="/admin" element={<ProtectedRoute requireRole="master_admin"><MasterAdminLayout><DashboardPage /></MasterAdminLayout></ProtectedRoute>} />
      <Route path="/admin/tenants" element={<ProtectedRoute requireRole="master_admin"><MasterAdminLayout><TenantsPage /></MasterAdminLayout></ProtectedRoute>} />
      <Route path="/admin/modules" element={<ProtectedRoute requireRole="master_admin"><MasterAdminLayout><ModulesPage /></MasterAdminLayout></ProtectedRoute>} />
      <Route path="/admin/integrations" element={<ProtectedRoute requireRole="master_admin"><MasterAdminLayout><IntegrationsPage /></MasterAdminLayout></ProtectedRoute>} />

      {/* Tenant Admin routes */}
      <Route path="/tenant" element={<ProtectedRoute requireRole="tenant_admin"><TenantAdminLayout><TenantDashboardPage /></TenantAdminLayout></ProtectedRoute>} />
      <Route path="/tenant/postkontoret" element={<ProtectedRoute requireRole="tenant_admin"><TenantAdminLayout><PostkontoretPage /></TenantAdminLayout></ProtectedRoute>} />
      <Route path="/tenant/modules" element={<ProtectedRoute requireRole="tenant_admin"><TenantAdminLayout><TenantModulesPage /></TenantAdminLayout></ProtectedRoute>} />
      <Route path="/tenant/integrations" element={<ProtectedRoute requireRole="tenant_admin"><TenantAdminLayout><TenantIntegrationsPage /></TenantAdminLayout></ProtectedRoute>} />
      <Route path="/tenant/users" element={<ProtectedRoute requireRole="tenant_admin"><TenantAdminLayout><TenantUsersPage /></TenantAdminLayout></ProtectedRoute>} />

      <Route path="/" element={<Navigate to={getHomeRedirect()} replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
