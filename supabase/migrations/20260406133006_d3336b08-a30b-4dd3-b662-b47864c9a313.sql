
-- 1) TENANT ROLES TABLE
CREATE TABLE public.tenant_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_system_role boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);
ALTER TABLE public.tenant_roles ENABLE ROW LEVEL SECURITY;

-- 2) ROLE PERMISSIONS TABLE
CREATE TABLE public.tenant_role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.tenant_roles(id) ON DELETE CASCADE,
  permission_key text NOT NULL,
  allowed boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(role_id, permission_key)
);
ALTER TABLE public.tenant_role_permissions ENABLE ROW LEVEL SECURITY;

-- 3) USER ROLE ASSIGNMENTS TABLE
CREATE TABLE public.tenant_user_role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role_id uuid NOT NULL REFERENCES public.tenant_roles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id, role_id)
);
ALTER TABLE public.tenant_user_role_assignments ENABLE ROW LEVEL SECURITY;

-- 4) USER PERMISSION OVERRIDES TABLE
CREATE TABLE public.tenant_user_permission_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  permission_key text NOT NULL,
  allowed boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id, permission_key)
);
ALTER TABLE public.tenant_user_permission_overrides ENABLE ROW LEVEL SECURITY;

-- 5) CHECK PERMISSION FUNCTION
CREATE OR REPLACE FUNCTION public.check_tenant_permission(_user_id uuid, _perm text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    -- 1. Check user-level overrides first
    (SELECT allowed FROM public.tenant_user_permission_overrides
     WHERE user_id = _user_id AND permission_key = _perm LIMIT 1),
    -- 2. Check role permissions (any role grants it)
    (SELECT bool_or(rp.allowed) FROM public.tenant_user_role_assignments ura
     JOIN public.tenant_role_permissions rp ON rp.role_id = ura.role_id
     WHERE ura.user_id = _user_id AND rp.permission_key = _perm),
    -- 3. Default false
    false
  )
$$;

-- 6) RLS POLICIES

-- tenant_roles
CREATE POLICY "Master admins can manage all tenant_roles" ON public.tenant_roles FOR ALL
  USING (has_role(auth.uid(), 'master_admin'));

CREATE POLICY "Tenant admins can manage their tenant_roles" ON public.tenant_roles FOR ALL
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'tenant_admin'));

CREATE POLICY "Users can view their tenant roles" ON public.tenant_roles FOR SELECT
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- tenant_role_permissions
CREATE POLICY "Master admins can manage all role_permissions" ON public.tenant_role_permissions FOR ALL
  USING (has_role(auth.uid(), 'master_admin'));

CREATE POLICY "Tenant admins can manage their role_permissions" ON public.tenant_role_permissions FOR ALL
  USING (EXISTS (SELECT 1 FROM public.tenant_roles r WHERE r.id = tenant_role_permissions.role_id AND r.tenant_id = get_user_tenant_id(auth.uid()))
    AND has_role(auth.uid(), 'tenant_admin'));

CREATE POLICY "Users can view their tenant role_permissions" ON public.tenant_role_permissions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.tenant_roles r WHERE r.id = tenant_role_permissions.role_id AND r.tenant_id = get_user_tenant_id(auth.uid())));

-- tenant_user_role_assignments
CREATE POLICY "Master admins can manage all user_role_assignments" ON public.tenant_user_role_assignments FOR ALL
  USING (has_role(auth.uid(), 'master_admin'));

CREATE POLICY "Tenant admins can manage their user_role_assignments" ON public.tenant_user_role_assignments FOR ALL
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'tenant_admin'));

CREATE POLICY "Users can view their own role assignments" ON public.tenant_user_role_assignments FOR SELECT
  USING (user_id = auth.uid());

-- tenant_user_permission_overrides
CREATE POLICY "Master admins can manage all permission_overrides" ON public.tenant_user_permission_overrides FOR ALL
  USING (has_role(auth.uid(), 'master_admin'));

CREATE POLICY "Tenant admins can manage their permission_overrides" ON public.tenant_user_permission_overrides FOR ALL
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'tenant_admin'));

CREATE POLICY "Users can view their own permission overrides" ON public.tenant_user_permission_overrides FOR SELECT
  USING (user_id = auth.uid());

-- 7) INDEXES
CREATE INDEX idx_tenant_roles_tenant ON public.tenant_roles(tenant_id);
CREATE INDEX idx_tenant_role_perms_role ON public.tenant_role_permissions(role_id);
CREATE INDEX idx_tenant_user_role_user ON public.tenant_user_role_assignments(user_id);
CREATE INDEX idx_tenant_user_role_tenant ON public.tenant_user_role_assignments(tenant_id);
CREATE INDEX idx_tenant_user_perm_ov_user ON public.tenant_user_permission_overrides(user_id);

-- 8) SEED DEFAULT ROLES FOR TEST TENANT (skipped in prod — tenant may not exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.tenants WHERE id = '504920aa-0f4f-4dc8-8f9f-b343e24ff88b') THEN
    INSERT INTO public.tenant_roles (id, tenant_id, name, description, is_system_role) VALUES
      ('a0000000-0000-0000-0000-000000000001', '504920aa-0f4f-4dc8-8f9f-b343e24ff88b', 'Tekniker', 'Basistilgang for teknikere – kan se sin kalender og saker', true),
      ('a0000000-0000-0000-0000-000000000002', '504920aa-0f4f-4dc8-8f9f-b343e24ff88b', 'Admin', 'Full tilgang til administrasjon og alle moduler', true),
      ('a0000000-0000-0000-0000-000000000003', '504920aa-0f4f-4dc8-8f9f-b343e24ff88b', 'Superadmin', 'Superadmin med tilgang til alt', true)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.tenant_role_permissions (role_id, permission_key, allowed) VALUES
      ('a0000000-0000-0000-0000-000000000001', 'module.dashboard', true),
      ('a0000000-0000-0000-0000-000000000001', 'module.ressursplanlegger', true),
      ('a0000000-0000-0000-0000-000000000001', 'ressursplan.view', true),
      ('a0000000-0000-0000-0000-000000000001', 'cases.view', true),
      ('a0000000-0000-0000-0000-000000000002', 'module.dashboard', true),
      ('a0000000-0000-0000-0000-000000000002', 'module.postkontoret', true),
      ('a0000000-0000-0000-0000-000000000002', 'module.ressursplanlegger', true),
      ('a0000000-0000-0000-0000-000000000002', 'module.integrations', true),
      ('a0000000-0000-0000-0000-000000000002', 'module.users', true),
      ('a0000000-0000-0000-0000-000000000002', 'module.modules', true),
      ('a0000000-0000-0000-0000-000000000002', 'module.access_control', true),
      ('a0000000-0000-0000-0000-000000000002', 'cases.view', true),
      ('a0000000-0000-0000-0000-000000000002', 'cases.create', true),
      ('a0000000-0000-0000-0000-000000000002', 'cases.edit', true),
      ('a0000000-0000-0000-0000-000000000002', 'cases.delete', true),
      ('a0000000-0000-0000-0000-000000000002', 'ressursplan.view', true),
      ('a0000000-0000-0000-0000-000000000002', 'ressursplan.schedule', true),
      ('a0000000-0000-0000-0000-000000000002', 'ressursplan.edit_others', true),
      ('a0000000-0000-0000-0000-000000000002', 'technicians.manage', true),
      ('a0000000-0000-0000-0000-000000000002', 'admin.manage_users', true),
      ('a0000000-0000-0000-0000-000000000002', 'admin.manage_roles', true),
      ('a0000000-0000-0000-0000-000000000002', 'admin.manage_settings', true),
      ('a0000000-0000-0000-0000-000000000002', 'integrations.manage', true),
      ('a0000000-0000-0000-0000-000000000003', 'module.dashboard', true),
      ('a0000000-0000-0000-0000-000000000003', 'module.postkontoret', true),
      ('a0000000-0000-0000-0000-000000000003', 'module.ressursplanlegger', true),
      ('a0000000-0000-0000-0000-000000000003', 'module.integrations', true),
      ('a0000000-0000-0000-0000-000000000003', 'module.users', true),
      ('a0000000-0000-0000-0000-000000000003', 'module.modules', true),
      ('a0000000-0000-0000-0000-000000000003', 'module.access_control', true),
      ('a0000000-0000-0000-0000-000000000003', 'cases.view', true),
      ('a0000000-0000-0000-0000-000000000003', 'cases.create', true),
      ('a0000000-0000-0000-0000-000000000003', 'cases.edit', true),
      ('a0000000-0000-0000-0000-000000000003', 'cases.delete', true),
      ('a0000000-0000-0000-0000-000000000003', 'cases.assign', true),
      ('a0000000-0000-0000-0000-000000000003', 'ressursplan.view', true),
      ('a0000000-0000-0000-0000-000000000003', 'ressursplan.schedule', true),
      ('a0000000-0000-0000-0000-000000000003', 'ressursplan.edit_others', true),
      ('a0000000-0000-0000-0000-000000000003', 'technicians.manage', true),
      ('a0000000-0000-0000-0000-000000000003', 'admin.manage_users', true),
      ('a0000000-0000-0000-0000-000000000003', 'admin.manage_roles', true),
      ('a0000000-0000-0000-0000-000000000003', 'admin.manage_settings', true),
      ('a0000000-0000-0000-0000-000000000003', 'integrations.manage', true),
      ('a0000000-0000-0000-0000-000000000003', 'postkontor.admin', true)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
