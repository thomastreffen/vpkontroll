
-- Fix RLS policies on tenant_role_permissions: change from public to authenticated
DROP POLICY IF EXISTS "Master admins can manage all role_permissions" ON public.tenant_role_permissions;
DROP POLICY IF EXISTS "Tenant admins can manage their role_permissions" ON public.tenant_role_permissions;
DROP POLICY IF EXISTS "Users can view their tenant role_permissions" ON public.tenant_role_permissions;

CREATE POLICY "Master admins can manage all role_permissions" ON public.tenant_role_permissions FOR ALL TO authenticated USING (has_role(auth.uid(), 'master_admin'::app_role));
CREATE POLICY "Tenant admins can manage their role_permissions" ON public.tenant_role_permissions FOR ALL TO authenticated USING ((EXISTS (SELECT 1 FROM tenant_roles r WHERE r.id = tenant_role_permissions.role_id AND r.tenant_id = get_user_tenant_id(auth.uid()))) AND has_role(auth.uid(), 'tenant_admin'::app_role));
CREATE POLICY "Users can view their tenant role_permissions" ON public.tenant_role_permissions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM tenant_roles r WHERE r.id = tenant_role_permissions.role_id AND r.tenant_id = get_user_tenant_id(auth.uid())));

-- Fix RLS policies on tenant_roles: change from public to authenticated
DROP POLICY IF EXISTS "Master admins can manage all tenant_roles" ON public.tenant_roles;
DROP POLICY IF EXISTS "Tenant admins can manage their tenant_roles" ON public.tenant_roles;
DROP POLICY IF EXISTS "Users can view their tenant roles" ON public.tenant_roles;

CREATE POLICY "Master admins can manage all tenant_roles" ON public.tenant_roles FOR ALL TO authenticated USING (has_role(auth.uid(), 'master_admin'::app_role));
CREATE POLICY "Tenant admins can manage their tenant_roles" ON public.tenant_roles FOR ALL TO authenticated USING ((tenant_id = get_user_tenant_id(auth.uid())) AND has_role(auth.uid(), 'tenant_admin'::app_role));
CREATE POLICY "Users can view their tenant roles" ON public.tenant_roles FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Fix RLS policies on tenant_user_permission_overrides: change from public to authenticated
DROP POLICY IF EXISTS "Master admins can manage all permission_overrides" ON public.tenant_user_permission_overrides;
DROP POLICY IF EXISTS "Tenant admins can manage their permission_overrides" ON public.tenant_user_permission_overrides;
DROP POLICY IF EXISTS "Users can view their own permission overrides" ON public.tenant_user_permission_overrides;

CREATE POLICY "Master admins can manage all permission_overrides" ON public.tenant_user_permission_overrides FOR ALL TO authenticated USING (has_role(auth.uid(), 'master_admin'::app_role));
CREATE POLICY "Tenant admins can manage their permission_overrides" ON public.tenant_user_permission_overrides FOR ALL TO authenticated USING ((tenant_id = get_user_tenant_id(auth.uid())) AND has_role(auth.uid(), 'tenant_admin'::app_role));
CREATE POLICY "Users can view their own permission overrides" ON public.tenant_user_permission_overrides FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Fix RLS policies on tenant_user_role_assignments: change from public to authenticated
DROP POLICY IF EXISTS "Master admins can manage all user_role_assignments" ON public.tenant_user_role_assignments;
DROP POLICY IF EXISTS "Tenant admins can manage their user_role_assignments" ON public.tenant_user_role_assignments;
DROP POLICY IF EXISTS "Users can view their own role assignments" ON public.tenant_user_role_assignments;

CREATE POLICY "Master admins can manage all user_role_assignments" ON public.tenant_user_role_assignments FOR ALL TO authenticated USING (has_role(auth.uid(), 'master_admin'::app_role));
CREATE POLICY "Tenant admins can manage their user_role_assignments" ON public.tenant_user_role_assignments FOR ALL TO authenticated USING ((tenant_id = get_user_tenant_id(auth.uid())) AND has_role(auth.uid(), 'tenant_admin'::app_role));
CREATE POLICY "Users can view their own role assignments" ON public.tenant_user_role_assignments FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Add profiles SELECT policy for tenant admins
CREATE POLICY "Tenant admins can view tenant profiles" ON public.profiles FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));
