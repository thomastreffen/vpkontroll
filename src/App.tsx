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
import TemplateBuilderPage from "@/pages/tenant/TemplateBuilderPage";
import FormSubmissionsPage from "@/pages/tenant/FormSubmissionsPage";
import PublicFormPage from "@/pages/PublicFormPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

/** Wrapper for operative tenant routes – requires tenant membership, not admin role */
function TenantRoute({ children, module, permission }: { children: React.ReactNode; module?: string; permission?: string }) {
  const inner = module ? (
    <ModuleRouteGuard module={module} permission={permission}>{children}</ModuleRouteGuard>
  ) : (
    children
  );
  return (
    <ProtectedRoute requireRole="tenant_member">
      <TenantAdminLayout>{inner}</TenantAdminLayout>
    </ProtectedRoute>
  );
}

/** Wrapper for admin-only tenant routes – requires tenant_admin role */
function TenantAdminRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requireRole="tenant_admin">
      <TenantAdminLayout>{children}</TenantAdminLayout>
    </ProtectedRoute>
  );
}

function AppRoutes() {
  const { user, loading, isPasswordRecovery, isMasterAdmin, isTenantAdmin, tenantId } = useAuth();

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
    // Both tenant admins and regular tenant members go to /tenant
    if (isTenantAdmin || tenantId) return "/tenant";
    return "/login";
  };

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={getHomeRedirect()} replace /> : <LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/select-role" element={user ? <RoleSelectorPage /> : <Navigate to="/login" replace />} />

      {/* Master Admin routes – require master_admin role */}
      <Route path="/admin" element={<ProtectedRoute requireRole="master_admin"><MasterAdminLayout><DashboardPage /></MasterAdminLayout></ProtectedRoute>} />
      <Route path="/admin/tenants" element={<ProtectedRoute requireRole="master_admin"><MasterAdminLayout><TenantsPage /></MasterAdminLayout></ProtectedRoute>} />
      <Route path="/admin/modules" element={<ProtectedRoute requireRole="master_admin"><MasterAdminLayout><ModulesPage /></MasterAdminLayout></ProtectedRoute>} />
      <Route path="/admin/integrations" element={<ProtectedRoute requireRole="master_admin"><MasterAdminLayout><IntegrationsPage /></MasterAdminLayout></ProtectedRoute>} />
      <Route path="/admin/access-control" element={<ProtectedRoute requireRole="master_admin"><MasterAdminLayout><AdminAccessControlPage /></MasterAdminLayout></ProtectedRoute>} />

      {/* Tenant: Operative routes – open for all tenant members */}
      <Route path="/tenant" element={<TenantRoute><TenantDashboardPage /></TenantRoute>} />
      <Route path="/tenant/postkontoret" element={<TenantRoute module="postkontoret" permission="module.postkontoret"><PostkontoretPage /></TenantRoute>} />
      <Route path="/tenant/ressursplanlegger" element={<TenantRoute module="ressursplanlegger" permission="module.ressursplanlegger"><RessursplanleggerPage /></TenantRoute>} />

      {/* CRM routes – open for tenant members with module + permission checks */}
      <Route path="/tenant/crm/contacts" element={<TenantRoute module="crm" permission="module.crm"><CrmContactsPage /></TenantRoute>} />
      <Route path="/tenant/crm/companies" element={<TenantRoute module="crm" permission="module.crm"><CrmCompaniesPage /></TenantRoute>} />
      <Route path="/tenant/crm/deals" element={<TenantRoute module="crm" permission="module.crm"><CrmDealsPage /></TenantRoute>} />
      <Route path="/tenant/crm/jobs" element={<TenantRoute module="crm" permission="module.crm"><JobsListPage /></TenantRoute>} />
      <Route path="/tenant/crm/assets" element={<TenantRoute module="crm" permission="module.crm"><AssetsListPage /></TenantRoute>} />
      <Route path="/tenant/crm/agreements" element={<TenantRoute module="crm" permission="module.crm"><AgreementsListPage /></TenantRoute>} />
      <Route path="/tenant/crm/warranties" element={<TenantRoute module="crm" permission="module.crm"><WarrantyListPage /></TenantRoute>} />
      <Route path="/tenant/crm/companies/:id" element={<TenantRoute module="crm" permission="module.crm"><CompanyDetailPage /></TenantRoute>} />
      <Route path="/tenant/crm/assets/:id" element={<TenantRoute module="crm" permission="module.crm"><AssetDetailPage /></TenantRoute>} />
      <Route path="/tenant/crm/jobs/:id" element={<TenantRoute module="crm" permission="module.crm"><JobDetailPage /></TenantRoute>} />
      <Route path="/tenant/crm/agreements/:id" element={<TenantRoute module="crm" permission="module.crm"><AgreementDetailPage /></TenantRoute>} />
      <Route path="/tenant/crm/warranty/:id" element={<TenantRoute module="crm" permission="module.crm"><WarrantyDetailPage /></TenantRoute>} />
      <Route path="/tenant/crm/deals/:id" element={<TenantRoute module="crm" permission="module.crm"><DealDetailPage /></TenantRoute>} />
      <Route path="/tenant/crm/contacts/:id" element={<TenantRoute module="crm" permission="module.crm"><ContactDetailPage /></TenantRoute>} />
      <Route path="/tenant/crm/sites/:id" element={<TenantRoute module="crm" permission="module.crm"><SiteDetailPage /></TenantRoute>} />
      <Route path="/tenant/crm/customers/import" element={<TenantRoute module="crm" permission="module.crm"><CustomerImportPage /></TenantRoute>} />
      <Route path="/tenant/templates" element={<TenantRoute module="crm" permission="module.crm"><TemplatesPage /></TenantRoute>} />
      <Route path="/tenant/templates/new" element={<TenantRoute module="crm" permission="module.crm"><TemplateBuilderPage /></TenantRoute>} />
      <Route path="/tenant/templates/submissions" element={<TenantRoute module="crm" permission="module.crm"><FormSubmissionsPage /></TenantRoute>} />
      <Route path="/tenant/templates/:id" element={<TenantRoute module="crm" permission="module.crm"><TemplateBuilderPage /></TenantRoute>} />

      {/* Tenant: Admin-only routes – require tenant_admin role */}
      <Route path="/tenant/modules" element={<TenantAdminRoute><TenantModulesPage /></TenantAdminRoute>} />
      <Route path="/tenant/integrations" element={<TenantAdminRoute><TenantIntegrationsPage /></TenantAdminRoute>} />
      <Route path="/tenant/users" element={<TenantAdminRoute><TenantUsersPage /></TenantAdminRoute>} />
      <Route path="/tenant/access-control" element={<TenantAdminRoute><TenantAccessControlPage /></TenantAdminRoute>} />

      {/* Public form route - no auth required */}
      <Route path="/forms/:publishKey" element={<PublicFormPage />} />

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
