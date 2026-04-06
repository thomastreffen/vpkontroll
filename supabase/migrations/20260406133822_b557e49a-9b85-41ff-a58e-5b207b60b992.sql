
-- Add 'crm' to module_name enum
ALTER TYPE public.module_name ADD VALUE IF NOT EXISTS 'crm';

-- Deal stages for heat pump industry
CREATE TYPE public.deal_stage AS ENUM (
  'lead', 'qualified', 'quote_sent', 'site_visit', 'negotiation', 'won', 'lost'
);

CREATE TYPE public.activity_type AS ENUM (
  'note', 'call', 'email', 'meeting', 'task', 'status_change'
);

-- Companies
CREATE TABLE public.crm_companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  org_number TEXT,
  industry TEXT DEFAULT 'varmepumpe',
  website TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'Norge',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master admins can manage all companies" ON public.crm_companies FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'master_admin'));
CREATE POLICY "Tenant admins can manage their companies" ON public.crm_companies FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'tenant_admin'));
CREATE POLICY "Tenant users can view their companies" ON public.crm_companies FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Contacts
CREATE TABLE public.crm_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.crm_companies(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT,
  title TEXT,
  email TEXT,
  phone TEXT,
  mobile TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  notes TEXT,
  is_primary_contact BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master admins can manage all contacts" ON public.crm_contacts FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'master_admin'));
CREATE POLICY "Tenant admins can manage their contacts" ON public.crm_contacts FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'tenant_admin'));
CREATE POLICY "Tenant users can view their contacts" ON public.crm_contacts FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Deals
CREATE TABLE public.crm_deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.crm_companies(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  stage deal_stage NOT NULL DEFAULT 'lead',
  value NUMERIC(12,2),
  currency TEXT DEFAULT 'NOK',
  expected_close_date DATE,
  owner_user_id UUID,
  description TEXT,
  lost_reason TEXT,
  case_id UUID REFERENCES public.cases(id) ON DELETE SET NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

ALTER TABLE public.crm_deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master admins can manage all deals" ON public.crm_deals FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'master_admin'));
CREATE POLICY "Tenant admins can manage their deals" ON public.crm_deals FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'tenant_admin'));
CREATE POLICY "Tenant users can view their deals" ON public.crm_deals FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Activities
CREATE TABLE public.crm_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.crm_companies(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES public.crm_deals(id) ON DELETE CASCADE,
  case_id UUID REFERENCES public.cases(id) ON DELETE SET NULL,
  type activity_type NOT NULL DEFAULT 'note',
  subject TEXT,
  body TEXT,
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master admins can manage all activities" ON public.crm_activities FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'master_admin'));
CREATE POLICY "Tenant admins can manage their activities" ON public.crm_activities FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'tenant_admin'));
CREATE POLICY "Tenant users can view their activities" ON public.crm_activities FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_crm_companies_updated_at BEFORE UPDATE ON public.crm_companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_crm_contacts_updated_at BEFORE UPDATE ON public.crm_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_crm_deals_updated_at BEFORE UPDATE ON public.crm_deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for deals (pipeline updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_deals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_activities;
