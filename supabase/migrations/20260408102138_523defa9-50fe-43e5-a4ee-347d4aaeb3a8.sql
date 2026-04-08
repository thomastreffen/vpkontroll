
-- Service Templates table
CREATE TABLE public.service_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.service_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master admins can manage all service_templates" ON public.service_templates FOR ALL TO authenticated USING (has_role(auth.uid(), 'master_admin'::app_role));
CREATE POLICY "Tenant admins can manage their service_templates" ON public.service_templates FOR ALL TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'tenant_admin'::app_role));
CREATE POLICY "Tenant users can view their service_templates" ON public.service_templates FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Service Template Fields table
CREATE TABLE public.service_template_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.service_templates(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  field_type TEXT NOT NULL DEFAULT 'checkbox',
  label TEXT NOT NULL,
  unit TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.service_template_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master admins can manage all service_template_fields" ON public.service_template_fields FOR ALL TO authenticated USING (has_role(auth.uid(), 'master_admin'::app_role));
CREATE POLICY "Tenant admins can manage their service_template_fields" ON public.service_template_fields FOR ALL TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'tenant_admin'::app_role));
CREATE POLICY "Tenant users can view their service_template_fields" ON public.service_template_fields FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Add service_template_id to service_agreements
ALTER TABLE public.service_agreements ADD COLUMN service_template_id UUID REFERENCES public.service_templates(id);
