
-- ============================================================
-- FASE 2: Tilbud, service og garanti
-- ============================================================

-- 1. ENUM-TYPER (5 stk)
CREATE TYPE public.quote_status AS ENUM ('draft', 'sent', 'accepted', 'rejected', 'expired');
CREATE TYPE public.agreement_interval AS ENUM ('monthly', 'quarterly', 'semi_annual', 'annual', 'biennial');
CREATE TYPE public.agreement_status AS ENUM ('active', 'paused', 'expired', 'cancelled');
CREATE TYPE public.visit_status AS ENUM ('planned', 'confirmed', 'in_progress', 'completed', 'missed', 'cancelled');
CREATE TYPE public.warranty_status AS ENUM ('open', 'investigating', 'approved', 'rejected', 'resolved');

-- 2. UNIQUE CONSTRAINTS på parent-tabeller for composite FKs (de som mangler)
-- customer_sites, hvac_assets, jobs, crm_companies, crm_deals allerede har (tenant_id, id) UQ fra Fase 1

-- 3. TABELLER

-- quotes
CREATE TABLE public.quotes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  deal_id uuid NOT NULL,
  quote_number text NOT NULL,
  status public.quote_status NOT NULL DEFAULT 'draft',
  version int NOT NULL DEFAULT 1,
  valid_until date,
  total_amount numeric NOT NULL DEFAULT 0,
  vat_amount numeric NOT NULL DEFAULT 0,
  discount_percent numeric,
  notes text,
  sent_at timestamptz,
  accepted_at timestamptz,
  created_by uuid,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quotes_tenant_id_id_uq UNIQUE (tenant_id, id),
  CONSTRAINT quotes_tenant_number_uq UNIQUE (tenant_id, quote_number),
  CONSTRAINT quotes_deal_fk FOREIGN KEY (tenant_id, deal_id) REFERENCES public.crm_deals(tenant_id, id)
);

CREATE INDEX idx_quotes_tenant_deal ON public.quotes(tenant_id, deal_id);

-- quote_lines
CREATE TABLE public.quote_lines (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  quote_id uuid NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit text DEFAULT 'stk',
  unit_price numeric NOT NULL DEFAULT 0,
  discount_percent numeric,
  line_total numeric NOT NULL DEFAULT 0,
  CONSTRAINT quote_lines_quote_fk FOREIGN KEY (tenant_id, quote_id) REFERENCES public.quotes(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX idx_quote_lines_quote ON public.quote_lines(quote_id, sort_order);

-- service_agreements
CREATE TABLE public.service_agreements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  company_id uuid NOT NULL,
  site_id uuid,
  asset_id uuid,
  agreement_number text NOT NULL,
  status public.agreement_status NOT NULL DEFAULT 'active',
  "interval" public.agreement_interval NOT NULL DEFAULT 'annual',
  start_date date NOT NULL,
  end_date date,
  annual_price numeric,
  next_visit_due date,
  scope_description text,
  notes text,
  created_by uuid,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT service_agreements_tenant_id_id_uq UNIQUE (tenant_id, id),
  CONSTRAINT service_agreements_tenant_number_uq UNIQUE (tenant_id, agreement_number),
  CONSTRAINT service_agreements_company_fk FOREIGN KEY (tenant_id, company_id) REFERENCES public.crm_companies(tenant_id, id),
  CONSTRAINT service_agreements_site_fk FOREIGN KEY (tenant_id, site_id) REFERENCES public.customer_sites(tenant_id, id),
  CONSTRAINT service_agreements_asset_fk FOREIGN KEY (tenant_id, asset_id) REFERENCES public.hvac_assets(tenant_id, id)
);

CREATE INDEX idx_service_agreements_tenant_status ON public.service_agreements(tenant_id, status);
CREATE INDEX idx_service_agreements_next_visit ON public.service_agreements(tenant_id, next_visit_due);

-- service_visits
CREATE TABLE public.service_visits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  agreement_id uuid,
  job_id uuid,
  asset_id uuid,
  site_id uuid,
  status public.visit_status NOT NULL DEFAULT 'planned',
  scheduled_date date,
  completed_at timestamptz,
  technician_id uuid REFERENCES public.technicians(id),
  findings text,
  actions_taken text,
  next_visit_recommended date,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT service_visits_tenant_id_id_uq UNIQUE (tenant_id, id),
  CONSTRAINT service_visits_agreement_fk FOREIGN KEY (tenant_id, agreement_id) REFERENCES public.service_agreements(tenant_id, id),
  CONSTRAINT service_visits_job_fk FOREIGN KEY (tenant_id, job_id) REFERENCES public.jobs(tenant_id, id),
  CONSTRAINT service_visits_asset_fk FOREIGN KEY (tenant_id, asset_id) REFERENCES public.hvac_assets(tenant_id, id),
  CONSTRAINT service_visits_site_fk FOREIGN KEY (tenant_id, site_id) REFERENCES public.customer_sites(tenant_id, id)
);

CREATE INDEX idx_service_visits_tenant_date ON public.service_visits(tenant_id, scheduled_date);
CREATE INDEX idx_service_visits_tenant_agreement ON public.service_visits(tenant_id, agreement_id);

-- warranty_cases
CREATE TABLE public.warranty_cases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  case_id uuid REFERENCES public.cases(id),
  asset_id uuid,
  company_id uuid,
  job_id uuid,
  warranty_number text NOT NULL,
  status public.warranty_status NOT NULL DEFAULT 'open',
  issue_description text NOT NULL,
  manufacturer_ref text,
  resolution text,
  resolved_at timestamptz,
  created_by uuid,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT warranty_cases_tenant_id_id_uq UNIQUE (tenant_id, id),
  CONSTRAINT warranty_cases_tenant_number_uq UNIQUE (tenant_id, warranty_number),
  CONSTRAINT warranty_cases_asset_fk FOREIGN KEY (tenant_id, asset_id) REFERENCES public.hvac_assets(tenant_id, id),
  CONSTRAINT warranty_cases_company_fk FOREIGN KEY (tenant_id, company_id) REFERENCES public.crm_companies(tenant_id, id),
  CONSTRAINT warranty_cases_job_fk FOREIGN KEY (tenant_id, job_id) REFERENCES public.jobs(tenant_id, id)
);

CREATE INDEX idx_warranty_cases_tenant_status ON public.warranty_cases(tenant_id, status);
CREATE INDEX idx_warranty_cases_tenant_asset ON public.warranty_cases(tenant_id, asset_id);

-- 4. UTVID EKSISTERENDE TABELLER

-- cases: +5 FK-kolonner med composite constraints
-- Først: legg til UQ(tenant_id, id) på cases for child-referanser
ALTER TABLE public.cases ADD CONSTRAINT cases_tenant_id_id_uq UNIQUE (tenant_id, id);

ALTER TABLE public.cases
  ADD COLUMN company_id uuid,
  ADD COLUMN site_id uuid,
  ADD COLUMN asset_id uuid,
  ADD COLUMN job_id uuid,
  ADD COLUMN warranty_case_id uuid;

ALTER TABLE public.cases
  ADD CONSTRAINT cases_company_fk FOREIGN KEY (tenant_id, company_id) REFERENCES public.crm_companies(tenant_id, id),
  ADD CONSTRAINT cases_site_fk FOREIGN KEY (tenant_id, site_id) REFERENCES public.customer_sites(tenant_id, id),
  ADD CONSTRAINT cases_asset_fk FOREIGN KEY (tenant_id, asset_id) REFERENCES public.hvac_assets(tenant_id, id),
  ADD CONSTRAINT cases_job_fk FOREIGN KEY (tenant_id, job_id) REFERENCES public.jobs(tenant_id, id),
  ADD CONSTRAINT cases_warranty_fk FOREIGN KEY (tenant_id, warranty_case_id) REFERENCES public.warranty_cases(tenant_id, id);

-- events: +3 FK-kolonner
ALTER TABLE public.events ADD CONSTRAINT events_tenant_id_id_uq UNIQUE (tenant_id, id);

ALTER TABLE public.events
  ADD COLUMN job_id uuid,
  ADD COLUMN service_visit_id uuid,
  ADD COLUMN site_id uuid;

ALTER TABLE public.events
  ADD CONSTRAINT events_job_fk FOREIGN KEY (tenant_id, job_id) REFERENCES public.jobs(tenant_id, id),
  ADD CONSTRAINT events_visit_fk FOREIGN KEY (tenant_id, service_visit_id) REFERENCES public.service_visits(tenant_id, id),
  ADD CONSTRAINT events_site_fk FOREIGN KEY (tenant_id, site_id) REFERENCES public.customer_sites(tenant_id, id);

-- 5. TRIGGERS: updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.service_agreements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.service_visits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.warranty_cases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. AUTO-GENERERING: quote_number, agreement_number, warranty_number

CREATE OR REPLACE FUNCTION public.generate_quote_number()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE next_num INT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(quote_number FROM '#([0-9]+)$') AS INT)), 0) + 1
    INTO next_num FROM public.quotes WHERE tenant_id = NEW.tenant_id;
  NEW.quote_number := 'TIL-' || LPAD(next_num::TEXT, 5, '0');
  RETURN NEW;
END; $$;

CREATE TRIGGER generate_quote_number_trigger
  BEFORE INSERT ON public.quotes FOR EACH ROW
  WHEN (NEW.quote_number IS NULL OR NEW.quote_number = '')
  EXECUTE FUNCTION public.generate_quote_number();

CREATE OR REPLACE FUNCTION public.generate_agreement_number()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE next_num INT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(agreement_number FROM '#([0-9]+)$') AS INT)), 0) + 1
    INTO next_num FROM public.service_agreements WHERE tenant_id = NEW.tenant_id;
  NEW.agreement_number := 'SA-' || LPAD(next_num::TEXT, 5, '0');
  RETURN NEW;
END; $$;

CREATE TRIGGER generate_agreement_number_trigger
  BEFORE INSERT ON public.service_agreements FOR EACH ROW
  WHEN (NEW.agreement_number IS NULL OR NEW.agreement_number = '')
  EXECUTE FUNCTION public.generate_agreement_number();

CREATE OR REPLACE FUNCTION public.generate_warranty_number()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE next_num INT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(warranty_number FROM '#([0-9]+)$') AS INT)), 0) + 1
    INTO next_num FROM public.warranty_cases WHERE tenant_id = NEW.tenant_id;
  NEW.warranty_number := 'GAR-' || LPAD(next_num::TEXT, 5, '0');
  RETURN NEW;
END; $$;

CREATE TRIGGER generate_warranty_number_trigger
  BEFORE INSERT ON public.warranty_cases FOR EACH ROW
  WHEN (NEW.warranty_number IS NULL OR NEW.warranty_number = '')
  EXECUTE FUNCTION public.generate_warranty_number();

-- 7. RLS

-- quotes
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Master admins can manage all quotes" ON public.quotes FOR ALL TO authenticated USING (has_role(auth.uid(), 'master_admin'::app_role));
CREATE POLICY "Tenant admins can manage their quotes" ON public.quotes FOR ALL TO authenticated USING ((tenant_id = get_user_tenant_id(auth.uid())) AND has_role(auth.uid(), 'tenant_admin'::app_role));
CREATE POLICY "Tenant users can view their quotes" ON public.quotes FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- quote_lines
ALTER TABLE public.quote_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Master admins can manage all quote_lines" ON public.quote_lines FOR ALL TO authenticated USING (has_role(auth.uid(), 'master_admin'::app_role));
CREATE POLICY "Tenant admins can manage their quote_lines" ON public.quote_lines FOR ALL TO authenticated USING ((tenant_id = get_user_tenant_id(auth.uid())) AND has_role(auth.uid(), 'tenant_admin'::app_role));
CREATE POLICY "Tenant users can view their quote_lines" ON public.quote_lines FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- service_agreements
ALTER TABLE public.service_agreements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Master admins can manage all service_agreements" ON public.service_agreements FOR ALL TO authenticated USING (has_role(auth.uid(), 'master_admin'::app_role));
CREATE POLICY "Tenant admins can manage their service_agreements" ON public.service_agreements FOR ALL TO authenticated USING ((tenant_id = get_user_tenant_id(auth.uid())) AND has_role(auth.uid(), 'tenant_admin'::app_role));
CREATE POLICY "Tenant users can view their service_agreements" ON public.service_agreements FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- service_visits
ALTER TABLE public.service_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Master admins can manage all service_visits" ON public.service_visits FOR ALL TO authenticated USING (has_role(auth.uid(), 'master_admin'::app_role));
CREATE POLICY "Tenant admins can manage their service_visits" ON public.service_visits FOR ALL TO authenticated USING ((tenant_id = get_user_tenant_id(auth.uid())) AND has_role(auth.uid(), 'tenant_admin'::app_role));
CREATE POLICY "Tenant users can view their service_visits" ON public.service_visits FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- warranty_cases
ALTER TABLE public.warranty_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Master admins can manage all warranty_cases" ON public.warranty_cases FOR ALL TO authenticated USING (has_role(auth.uid(), 'master_admin'::app_role));
CREATE POLICY "Tenant admins can manage their warranty_cases" ON public.warranty_cases FOR ALL TO authenticated USING ((tenant_id = get_user_tenant_id(auth.uid())) AND has_role(auth.uid(), 'tenant_admin'::app_role));
CREATE POLICY "Tenant users can view their warranty_cases" ON public.warranty_cases FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));
