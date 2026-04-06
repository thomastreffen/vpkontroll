
-- Enum for case status
CREATE TYPE public.case_status AS ENUM ('new', 'triage', 'in_progress', 'waiting_customer', 'waiting_internal', 'closed', 'archived', 'converted');

-- Enum for case priority
CREATE TYPE public.case_priority AS ENUM ('low', 'normal', 'high', 'critical');

-- Enum for case next action
CREATE TYPE public.case_next_action AS ENUM ('call', 'quote', 'clarify', 'order', 'schedule', 'document', 'none');

-- Mailboxes table: shared email addresses per tenant
CREATE TABLE public.mailboxes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  display_name TEXT NOT NULL,
  provider public.integration_provider NOT NULL DEFAULT 'microsoft',
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, address)
);

-- Cases table: incoming support/email cases per tenant
CREATE TABLE public.cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  case_number TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  status public.case_status NOT NULL DEFAULT 'new',
  priority public.case_priority NOT NULL DEFAULT 'normal',
  next_action public.case_next_action NOT NULL DEFAULT 'none',
  due_at TIMESTAMPTZ,
  mailbox_address TEXT,
  owner_user_id UUID,
  assigned_to_user_id UUID,
  assigned_at TIMESTAMPTZ,
  customer_name TEXT,
  customer_email TEXT,
  last_activity_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID
);

-- Case items: individual emails/notes within a case
CREATE TABLE public.case_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'email', -- email, note, system
  subject TEXT,
  from_email TEXT,
  from_name TEXT,
  to_emails TEXT[],
  cc_emails TEXT[],
  body_preview TEXT,
  body_html TEXT,
  body_text TEXT,
  received_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  internet_message_id TEXT,
  attachments_meta JSONB DEFAULT '[]'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mailboxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_items ENABLE ROW LEVEL SECURITY;

-- RLS: Mailboxes
CREATE POLICY "Master admins can manage all mailboxes" ON public.mailboxes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'master_admin'));

CREATE POLICY "Tenant admins can manage their mailboxes" ON public.mailboxes FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'tenant_admin'));

-- RLS: Cases
CREATE POLICY "Master admins can manage all cases" ON public.cases FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'master_admin'));

CREATE POLICY "Tenant users can view their tenant cases" ON public.cases FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant admins can manage their cases" ON public.cases FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'tenant_admin'));

-- RLS: Case Items
CREATE POLICY "Master admins can manage all case items" ON public.case_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'master_admin'));

CREATE POLICY "Tenant users can view their case items" ON public.case_items FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant admins can manage their case items" ON public.case_items FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'tenant_admin'));

-- Triggers for updated_at
CREATE TRIGGER update_mailboxes_updated_at BEFORE UPDATE ON public.mailboxes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON public.cases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for cases
ALTER PUBLICATION supabase_realtime ADD TABLE public.cases;

-- Auto-generate case numbers
CREATE OR REPLACE FUNCTION public.generate_case_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
DECLARE
  next_num INT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(case_number FROM '#([0-9]+)$') AS INT)), 0) + 1
    INTO next_num
    FROM public.cases
    WHERE tenant_id = NEW.tenant_id;
  NEW.case_number := 'SAK-' || LPAD(next_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_case_number BEFORE INSERT ON public.cases
  FOR EACH ROW EXECUTE FUNCTION public.generate_case_number();
