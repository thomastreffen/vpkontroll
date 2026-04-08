import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import ModuleRouteGuard from "@/components/ModuleRouteGuard";
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
import AdminAccessControlPage from "@/pages/admin/AccessControlPage";
import TenantDashboardPage from "@/pages/tenant/TenantDashboardPage";
import TenantModulesPage from "@/pages/tenant/TenantModulesPage";
import TenantIntegrationsPage from "@/pages/tenant/TenantIntegrationsPage";
import TenantUsersPage from "@/pages/tenant/TenantUsersPage";
import PostkontoretPage from "@/pages/tenant/PostkontoretPage";
import RessursplanleggerPage from "@/pages/tenant/RessursplanleggerPage";
import TenantAccessControlPage from "@/pages/tenant/AccessControlPage";
import CrmContactsPage from "@/pages/tenant/CrmContactsPage";
import CrmCompaniesPage from "@/pages/tenant/CrmCompaniesPage";
import CrmDealsPage from "@/pages/tenant/CrmDealsPage";
import CompanyDetailPage from "@/pages/tenant/CompanyDetailPage";
import AssetDetailPage from "@/pages/tenant/AssetDetailPage";
import JobDetailPage from "@/pages/tenant/JobDetailPage";
import AgreementDetailPage from "@/pages/tenant/AgreementDetailPage";
import WarrantyDetailPage from "@/pages/tenant/WarrantyDetailPage";
import JobsListPage from "@/pages/tenant/JobsListPage";
import AssetsListPage from "@/pages/tenant/AssetsListPage";
import AgreementsListPage from "@/pages/tenant/AgreementsListPage";
import WarrantyListPage from "@/pages/tenant/WarrantyListPage";
import DealDetailPage from "@/pages/tenant/DealDetailPage";
import ContactDetailPage from "@/pages/tenant/ContactDetailPage";
import SiteDetailPage from "@/pages/tenant/SiteDetailPage";
import CustomerImportPage from "@/pages/tenant/CustomerImportPage";
import TemplatesPage from "@/pages/tenant/TemplatesPage";
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
      <Route path="/admin/access-control" element={<ProtectedRoute requireRole="master_admin"><MasterAdminLayout><AdminAccessControlPage /></MasterAdminLayout></ProtectedRoute>} />

      {/* Tenant Admin routes */}
      <Route path="/tenant" element={<ProtectedRoute requireRole="tenant_admin"><TenantAdminLayout><TenantDashboardPage /></TenantAdminLayout></ProtectedRoute>} />
      <Route path="/tenant/postkontoret" element={<ProtectedRoute requireRole="tenant_admin"><TenantAdminLayout><ModuleRouteGuard module="postkontoret"><PostkontoretPage /></ModuleRouteGuard></TenantAdminLayout></ProtectedRoute>} />
      <Route path="/tenant/ressursplanlegger" element={<ProtectedRoute requireRole="tenant_admin"><TenantAdminLayout><ModuleRouteGuard module="ressursplanlegger"><RessursplanleggerPage /></ModuleRouteGuard></TenantAdminLayout></ProtectedRoute>} />
      <Route path="/tenant/modules" element={<ProtectedRoute requireRole="tenant_admin"><TenantAdminLayout><TenantModulesPage /></TenantAdminLayout></ProtectedRoute>} />
      <Route path="/tenant/integrations" element={<ProtectedRoute requireRole="tenant_admin"><TenantAdminLayout><TenantIntegrationsPage /></TenantAdminLayout></ProtectedRoute>} />
      <Route path="/tenant/users" element={<ProtectedRoute requireRole="tenant_admin"><TenantAdminLayout><TenantUsersPage /></TenantAdminLayout></ProtectedRoute>} />
      <Route path="/tenant/access-control" element={<ProtectedRoute requireRole="tenant_admin"><TenantAdminLayout><TenantAccessControlPage /></TenantAdminLayout></ProtectedRoute>} />

      {/* CRM routes */}
      <Route path="/tenant/crm/contacts" element={<ProtectedRoute requireRole="tenant_admin"><TenantAdminLayout><ModuleRouteGuard module="crm"><CrmContactsPage /></ModuleRouteGuard></TenantAdminLayout></ProtectedRoute>} />
      <Route path="/tenant/crm/companies" element={<ProtectedRoute requireRole="tenant_admin"><TenantAdminLayout><ModuleRouteGuard module="crm"><CrmCompaniesPage /></ModuleRouteGuard></TenantAdminLayout></ProtectedRoute>} />
      <Route path="/tenant/crm/deals" element={<ProtectedRoute requireRole="tenant_admin"><TenantAdminLayout><ModuleRouteGuard module="crm"><CrmDealsPage /></ModuleRouteGuard></TenantAdminLayout></ProtectedRoute>} />
      <Route path="/tenant/crm/jobs" element={<ProtectedRoute requireRole="tenant_admin"><TenantAdminLayout><ModuleRouteGuard module="crm"><JobsListPage /></ModuleRouteGuard></TenantAdminLayout></ProtectedRoute>} />
      <Route path="/tenant/crm/assets" element={<ProtectedRoute requireRole="tenant_admin"><TenantAdminLayout><ModuleRouteGuard module="crm"><AssetsListPage /></ModuleRouteGuard></TenantAdminLayout></ProtectedRoute>} />
      <Route path="/tenant/crm/agreements" element={<ProtectedRoute requireRole="tenant_admin"><TenantAdminLayout><ModuleRouteGuard module="crm"><AgreementsListPage /></ModuleRouteGuard></TenantAdminLayout></ProtectedRoute>} />
      <Route path="/tenant/crm/warranties" element={<ProtectedRoute requireRole="tenant_admin"><TenantAdminLayout><ModuleRouteGuard module="crm"><WarrantyListPage /></ModuleRouteGuard></TenantAdminLayout></ProtectedRoute>} />
      <Route path="/tenant/crm/companies/:id" element={<ProtectedRoute requireRole="tenant_admin"><TenantAdminLayout><ModuleRouteGuard module="crm"><CompanyDetailPage /></ModuleRouteGuard></TenantAdminLayout></ProtectedRoute>} />
      <Route path="/tenant/crm/assets/:id" element={<ProtectedRoute requireRole="tenant_admin"><TenantAdminLayout><ModuleRouteGuard module="crm"><AssetDetailPage /></ModuleRouteGuard></TenantAdminLayout></ProtectedRoute>} />
      <Route path="/tenant/crm/jobs/:id" element={<ProtectedRoute requireRole="tenant_admin"><TenantAdminLayout><ModuleRouteGuard module="crm"><JobDetailPage /></ModuleRouteGuard></TenantAdminLayout></ProtectedRoute>} />
      <Route path="/tenant/crm/agreements/:id" element={<ProtectedRoute requireRole="tenant_admin"><TenantAdminLayout><ModuleRouteGuard module="crm"><AgreementDetailPage /></ModuleRouteGuard></TenantAdminLayout></ProtectedRoute>} />
      <Route path="/tenant/crm/warranty/:id" element={<ProtectedRoute requireRole="tenant_admin"><TenantAdminLayout><ModuleRouteGuard module="crm"><WarrantyDetailPage /></ModuleRouteGuard></TenantAdminLayout></ProtectedRoute>} />
      <Route path="/tenant/crm/deals/:id" element={<ProtectedRoute requireRole="tenant_admin"><TenantAdminLayout><ModuleRouteGuard module="crm"><DealDetailPage /></ModuleRouteGuard></TenantAdminLayout></ProtectedRoute>} />
      <Route path="/tenant/crm/contacts/:id" element={<ProtectedRoute requireRole="tenant_admin"><TenantAdminLayout><ModuleRouteGuard module="crm"><ContactDetailPage /></ModuleRouteGuard></TenantAdminLayout></ProtectedRoute>} />
      <Route path="/tenant/crm/sites/:id" element={<ProtectedRoute requireRole="tenant_admin"><TenantAdminLayout><ModuleRouteGuard module="crm"><SiteDetailPage /></ModuleRouteGuard></TenantAdminLayout></ProtectedRoute>} />
      <Route path="/tenant/crm/customers/import" element={<ProtectedRoute requireRole="tenant_admin"><TenantAdminLayout><ModuleRouteGuard module="crm"><CustomerImportPage /></ModuleRouteGuard></TenantAdminLayout></ProtectedRoute>} />
      <Route path="/tenant/service/templates" element={<ProtectedRoute requireRole="tenant_admin"><TenantAdminLayout><ModuleRouteGuard module="crm"><ServiceTemplatesPage /></ModuleRouteGuard></TenantAdminLayout></ProtectedRoute>} />

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
