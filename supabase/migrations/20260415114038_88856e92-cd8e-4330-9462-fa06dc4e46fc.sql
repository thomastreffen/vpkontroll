
-- Add is_active to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Allow tenant admins to update profiles within their tenant (for activate/deactivate)
CREATE POLICY "Tenant admins can update tenant profiles"
ON public.profiles
FOR UPDATE
USING (
  tenant_id = get_user_tenant_id(auth.uid())
  AND has_role(auth.uid(), 'tenant_admin'::app_role)
);
